<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\{
    Order,
    OrderItem,
    Cart,
    User,
    PaymentTransaction,
    Coupon,
    Product
};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderClientController extends Controller
{
    /**
     * 📦 Danh sách đơn hàng của người dùng
     */
    public function index(Request $request)
    {
        $userId = $request->input('user_id');

        if (!$userId || !User::find($userId)) {
            return response()->json(['message' => 'Người dùng không hợp lệ'], 401);
        }

        $orders = Order::where('user_id', $userId)
            ->with(['items.variant.product:id,name,thumbnail'])
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Danh sách đơn hàng của bạn',
            'data' => $orders
        ]);
    }

    /**
     * 🔍 Chi tiết một đơn hàng
     */
    public function show(Request $request, $id)
    {
        $userId = $request->input('user_id');

        if (!$userId || !User::find($userId)) {
            return response()->json(['message' => 'Người dùng không hợp lệ'], 401);
        }

        $order = Order::where('user_id', $userId)
            ->with(['items.variant.product', 'paymentTransaction'])
            ->find($id);

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        return response()->json([
            'message' => 'Chi tiết đơn hàng',
            'data' => $order
        ]);
    }

    /**
     * 🛒 Tạo đơn hàng (mua ngay hoặc từ giỏ hàng)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'payment_method' => 'required|in:cod,vnpay',
            'coupon_code' => 'nullable|string',
            'note' => 'nullable|string',
            'product_id' => 'nullable|integer|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
        ]);

        $userId = $validated['user_id'];
        $productId = $validated['product_id'] ?? null;
        $quantity = $validated['quantity'] ?? 1;

        DB::beginTransaction();

        try {
            $items = collect();
            $totalAmount = 0;

            /**
             * 🛍️ Trường hợp 1: Mua ngay (có product_id)
             */
            if ($productId) {
                $product = Product::find($productId);

                if (!$product) {
                    return response()->json(['message' => 'Sản phẩm không tồn tại'], 404);
                }

                $price = $product->price ?? 0;
                $totalAmount = $price * $quantity;

                $items->push((object) [
                    'product_id' => $product->id,
                    'variant_id' => null,
                    'product_name' => $product->name,
                    'product_image' => $product->thumbnail ?? null,
                    'quantity' => $quantity,
                    'price' => $price,
                    'size' => null,
                    'color' => null,
                ]);
            }

            /**
             * 🛒 Trường hợp 2: Mua từ giỏ hàng
             */
            else {
                $cart = Cart::where('user_id', $userId)
                    ->with('items.variant.product')
                    ->first();

                if (!$cart || $cart->items->isEmpty()) {
                    return response()->json(['message' => 'Giỏ hàng trống'], 400);
                }

                foreach ($cart->items as $item) {
                    if (!$item->variant || !$item->variant->product) {
                        continue;
                    }

                    $price = $item->variant->price ?? 0;
                    $totalAmount += $price * $item->quantity;

                    $items->push((object) [
                        'product_id' => $item->variant->product->id ?? null,
                        'variant_id' => $item->variant->id ?? null,
                        'product_name' => $item->variant->product->name ?? '',
                        'product_image' => $item->variant->product->thumbnail ?? null,
                        'quantity' => $item->quantity ?? 1,
                        'price' => $price ?? 0,
                        'size' => $item->variant->size ?? null,
                        'color' => $item->variant->color ?? null,
                    ]);
                }
            }

            if ($items->isEmpty()) {
                return response()->json(['message' => 'Không có sản phẩm hợp lệ để đặt hàng'], 400);
            }

            /**
             * 💸 Áp dụng mã giảm giá (nếu có)
             */
            $discountAmount = 0;
            $coupon = null;

            if (!empty($validated['coupon_code'])) {
                $coupon = Coupon::where('code', $validated['coupon_code'])
                    ->where('is_active', 1)
                    ->where(function ($q) {
                        $now = now();
                        $q->whereNull('start_date')->orWhere('start_date', '<=', $now);
                        $q->whereNull('end_date')->orWhere('end_date', '>=', $now);
                    })
                    ->first();

                if ($coupon) {
                    if ($coupon->discount_type === 'percent') {
                        $discountAmount = min(
                            ($totalAmount * $coupon->discount_value) / 100,
                            $coupon->max_discount ?? $totalAmount
                        );
                    } else {
                        $discountAmount = min($coupon->discount_value, $totalAmount);
                    }
                }
            }

            $finalAmount = $totalAmount - $discountAmount;

            /**
             * 📦 Tạo đơn hàng
             */
            $order = Order::create([
                'user_id' => $userId,
                'sku' => strtoupper(substr(uniqid('ODR'), -9)),
                'total_amount' => $totalAmount,
                'discount_amount' => $discountAmount,
                'final_amount' => $finalAmount,
                'coupon_id' => $coupon->id ?? null,
                'coupon_code' => $coupon->code ?? null,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'note' => $validated['note'] ?? null,
            ]);

            /**
             * 🧾 Ghi chi tiết sản phẩm
             */
            foreach ($items as $item) {
                // ✅ Bỏ qua nếu thiếu product_id
                if (empty($item->product_id)) continue;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                    'product_name' => $item->product_name,
                    'product_image' => $item->product_image,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'size' => $item->size,
                    'color' => $item->color,
                ]);
            }

            /**
             * 💳 Tạo giao dịch thanh toán
             */
            PaymentTransaction::create([
                'order_id' => $order->id,
                'payment_method' => $validated['payment_method'],
                'transaction_code' => $validated['payment_method'] === 'cod' ? null : '',
                'amount' => $finalAmount,
                'status' => 'pending',
                'paid_at' => null,
            ]);

            /**
             * 🧹 Xóa giỏ hàng nếu là mua từ giỏ
             */
            if (empty($productId) && isset($cart)) {
                $cart->items()->delete();
            }

            DB::commit();

            return response()->json([
                'message' => 'Đặt hàng thành công',
                'data' => $order->load(['items', 'paymentTransaction'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'error' => 'Đặt hàng thất bại',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}
