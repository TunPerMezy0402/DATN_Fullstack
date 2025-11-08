<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\{
    Order,
    OrderItem,
    PaymentTransaction,
    Shipping,
    CartItem,
    Coupon,
    ProductVariant,
    OrderCancelLog
};

class OrderClientController extends Controller
{
    /**
     * 📦 Danh sách đơn hàng
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $orders = Order::where('user_id', $user->id)
            ->with([
                'items:id,order_id,product_id,variant_id,product_name,product_image,quantity,price,size,color',
                'user:id,name,phone,email',
                'shipping',
                'paymentTransaction'
            ])
            ->select('id', 'user_id', 'sku', 'total_amount', 'final_amount', 'status', 'payment_status', 'payment_method', 'note', 'created_at')
            ->latest()
            ->get()
            ->map(function ($order) {
                $order->items->transform(function ($item) {
                    $item->total = $item->quantity * floatval($item->price);
                    return $item;
                });
                return $order;
            });

        return response()->json([
            'message' => 'Danh sách đơn hàng của bạn',
            'data' => $orders
        ]);
    }

    /**
     * 🔍 Chi tiết đơn hàng
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $order = Order::where('user_id', $user->id)
            ->with([
                'items:id,order_id,product_id,variant_id,product_name,product_image,quantity,price,size,color',
                'user:id,name,phone,email',
                'shipping',
                'paymentTransaction'
            ])
            ->select('id', 'user_id', 'sku', 'total_amount', 'final_amount', 'status', 'payment_status', 'payment_method', 'note', 'created_at')
            ->find($id);

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        $order->items->transform(function ($item) {
            $item->total = $item->quantity * floatval($item->price);
            return $item;
        });

        return response()->json([
            'message' => 'Chi tiết đơn hàng',
            'data' => $order
        ]);
    }

    /**
     * 🛒 Tạo đơn hàng mới
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $validated = $request->validate([
            'payment_method' => 'required|in:cod,vnpay',
            'note' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.variant_id' => 'nullable|integer',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.product_image' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string|max:50',
            'items.*.color' => 'nullable|string|max:50',
            'total_amount' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'final_amount' => 'required|numeric|min:0',
            'coupon_id' => 'nullable|integer',
            'coupon_code' => 'nullable|string|max:50',
            'shipping_name' => 'required|string|max:255',
            'shipping_phone' => 'required|string|max:20',
            'city' => 'required|string|max:100',
            'notes' => 'max:500',
            'district' => 'required|string|max:100',
            'commune' => 'required|string|max:100',
            'village' => 'nullable|string|max:255',
            'shipping_notes' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            // ✅ 1. VALIDATE COUPON (TRONG TRANSACTION)
            $coupon = null;
            if ($validated['coupon_id']) {
                $coupon = Coupon::lockForUpdate()->find($validated['coupon_id']);
                
                if (!$coupon) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Mã giảm giá không tồn tại'
                    ], 400);
                }

                if (!$coupon->is_active) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Mã giảm giá đã bị vô hiệu hóa'
                    ], 400);
                }

                if ($coupon->used) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Mã giảm giá đã được sử dụng'
                    ], 400);
                }

                if ($coupon->end_date && now()->gt($coupon->end_date)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Mã giảm giá đã hết hạn'
                    ], 400);
                }

                if ($validated['total_amount'] < $coupon->min_purchase) {
                    return response()->json([
                        'success' => false,
                        'message' => "Đơn hàng tối thiểu {$coupon->min_purchase}₫ để sử dụng mã này"
                    ], 400);
                }

                // ✅ FIX: Kiểm tra usage_limit đúng cách
                if (isset($coupon->usage_limit) && $coupon->usage_limit > 0) {
                    if ($coupon->used_count >= $coupon->usage_limit) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Mã giảm giá đã hết lượt sử dụng'
                        ], 400);
                    }
                }
            }

            // ✅ 2. VALIDATE & RESERVE STOCK (TRONG TRANSACTION)
            $variantsToDeduct = [];
            foreach ($validated['items'] as $item) {
                if ($item['variant_id']) {
                    $variant = ProductVariant::lockForUpdate()->find($item['variant_id']);
                    
                    if (!$variant) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => "Sản phẩm '{$item['product_name']}' không tồn tại"
                        ], 400);
                    }

                    if ($variant->stock_quantity < $item['quantity']) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => "Sản phẩm '{$item['product_name']}' chỉ còn {$variant->stock_quantity} sản phẩm"
                        ], 400);
                    }

                    $variantsToDeduct[] = [
                        'variant' => $variant,
                        'quantity' => $item['quantity'],
                        'name' => $item['product_name']
                    ];
                }
            }

            // ✅ 3. TẠO ORDER
            $order = Order::create([
                'user_id' => $user->id,
                'sku' => strtoupper(substr(uniqid('ODR'), -9)),
                'total_amount' => $validated['total_amount'],
                'discount_amount' => $validated['discount_amount'] ?? 0,
                'final_amount' => $validated['final_amount'],
                'coupon_id' => $validated['coupon_id'] ?? null,
                'coupon_code' => $validated['coupon_code'] ?? null,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'payment_method' => $validated['payment_method'],
                'note' => $validated['note'] ?? null,
            ]);

            // ✅ 4. TẠO ORDER ITEMS
            foreach ($validated['items'] as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'product_image' => $item['product_image'] ?? null,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'size' => $item['size'] ?? null,
                    'color' => $item['color'] ?? null,
                ]);
            }

            // ✅ 5. TRỪ STOCK NGAY (CHO CẢ COD VÀ VNPAY)
            // Stock được reserve ngay, nếu VNPay fail sẽ hoàn lại
            foreach ($variantsToDeduct as $data) {
                $data['variant']->decrement('stock_quantity', $data['quantity']);
                
                Log::info('Stock reserved for order', [
                    'variant_id' => $data['variant']->id,
                    'quantity' => $data['quantity'],
                    'remaining' => $data['variant']->fresh()->stock_quantity,
                    'order_id' => $order->id,
                    'payment_method' => $validated['payment_method']
                ]);
            }

            // ✅ 6. TẠO PAYMENT TRANSACTION
            PaymentTransaction::create([
                'order_id' => $order->id,
                'transaction_code' => 'PENDING_' . $order->id . '_' . time(),
                'amount' => $validated['final_amount'],
                'status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'paid_at' => null,
            ]);

            // ✅ 7. TẠO SHIPPING
            Shipping::create([
                'order_id' => $order->id,
                'sku' => strtoupper(Str::random(9)),
                'shipping_name' => $validated['shipping_name'],
                'shipping_phone' => $validated['shipping_phone'],
                'shipping_status' => 'pending',
                'city' => $validated['city'],
                'notes' => $validated['notes'],
                'district' => $validated['district'],
                'commune' => $validated['commune'],
                'village' => $validated['village'] ?? null,
            ]);

            // ✅ 8. XÓA CART ITEMS (CHO CẢ COD VÀ VNPAY)
            $variantIds = collect($validated['items'])->pluck('variant_id')->filter()->unique();
            if ($variantIds->isNotEmpty()) {
                CartItem::whereIn('variant_id', $variantIds)
                    ->whereHas('cart', fn($q) => $q->where('user_id', $user->id))
                    ->delete();
            }

            DB::commit();

            $order->load(['items', 'user:id,name,phone,email', 'shipping', 'paymentTransaction']);

            Log::info('Order created successfully', [
                'order_id' => $order->id,
                'sku' => $order->sku,
                'payment_method' => $order->payment_method,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
            ]);

            return response()->json([
                'message' => 'Đặt hàng thành công',
                'data' => $order
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order store error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'error' => 'Đặt hàng thất bại',
                'detail' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 💳 Lấy trạng thái thanh toán
     */
    public function paymentStatus(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập'], 401);
            }

            $order = Order::where('user_id', $user->id)
                ->with('paymentTransaction')
                ->find($id);

            if (!$order) {
                return response()->json(['success' => false, 'message' => 'Không tìm thấy đơn hàng'], 404);
            }

            $transaction = $order->paymentTransaction;

            return response()->json([
                'success' => true,
                'message' => 'Trạng thái thanh toán',
                'data' => [
                    'order_id' => $order->id,
                    'sku' => $order->sku,
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'payment_method' => $order->payment_method,
                    'final_amount' => $order->final_amount,
                    'paid_at' => optional($transaction)->paid_at,
                    'transaction' => $transaction ? [
                        'id' => $transaction->id,
                        'transaction_code' => $transaction->transaction_code,
                        'status' => $transaction->status,
                        'amount' => $transaction->amount,
                        'bank_code' => $transaction->bank_code ?? null,
                        'paid_at' => $transaction->paid_at,
                    ] : null,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Payment status error: ' . $e->getMessage() . ' | line: ' . $e->getLine());
            return response()->json([
                'success' => false,
                'message' => 'Không thể lấy trạng thái thanh toán',
                'error' => $e->getMessage()
            ], 500);
        }
    }


public function cancel(Request $request, $id)
{
    $user = $request->user();
    if (!$user) {
        return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
    }

    $validated = $request->validate([
        'reason' => 'nullable|string|max:255',
        'note'   => 'nullable|string|max:500',
    ]);

    DB::beginTransaction();

    try {
        // 🔍 Lấy đơn hàng của user
        $order = Order::with(['items', 'shipping'])->where('user_id', $user->id)->find($id);

        if (!$order) {
            return response()->json(['error' => 'Không tìm thấy đơn hàng'], 404);
        }

        // ❌ Không cho hủy nếu đã giao
        if (in_array($order->status, ['shipped', 'delivered', 'completed'])) {
            return response()->json(['error' => 'Không thể hủy đơn hàng đã giao hoặc hoàn tất!'], 400);
        }

        // ✅ Cập nhật trạng thái đơn hàng
        $order->update(['status' => 'cancelled']);

        // ✅ Cập nhật shipping nếu có
        if ($order->shipping) {
            $order->shipping->update([
                'shipping_status' => 'pending',
            ]);
        }

        // ✅ Ghi log hủy đơn
        OrderCancelLog::create([
            'order_id'     => $order->id,
            'cancelled_by' => 'user',
            'reason'       => $validated['reason'] ?? null,
            'note'         => $validated['note'] ?? null,
        ]);

        // ✅ (Tùy chọn) Hoàn stock nếu muốn
        foreach ($order->items as $item) {
            if ($item->variant_id) {
                ProductVariant::where('id', $item->variant_id)
                    ->increment('stock_quantity', $item->quantity);
            }
        }

        DB::commit();

        return response()->json([
            'message' => 'Đơn hàng đã được hủy thành công!',
            'data' => $order->load('shipping'),
        ], 200);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json([
            'error' => 'Hủy đơn hàng thất bại!',
            'message' => $e->getMessage(),
        ], 500);
    }
}


}