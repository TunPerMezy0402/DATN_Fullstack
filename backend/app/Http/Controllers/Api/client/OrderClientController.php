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
    Cart,
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
            ->select('id', 'user_id', 'sku', 'total_amount', 'final_amount', 'payment_status', 'payment_method', 'note', 'created_at')
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
            ->select('id', 'user_id', 'sku', 'total_amount', 'final_amount', 'payment_status', 'payment_method', 'note', 'created_at')
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
            'notes' => 'nullable|max:500',
            'district' => 'required|string|max:100',
            'commune' => 'required|string|max:100',
            'village' => 'nullable|string|max:255',
            'shipping_notes' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            // ==========================================
            // ✅ BƯỚC 1: VALIDATE COUPON
            // ==========================================
            $coupon = null;
            if ($validated['coupon_id']) {
                $coupon = Coupon::lockForUpdate()->find($validated['coupon_id']);
                
                if (!$coupon) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Mã giảm giá không tồn tại'
                    ], 400);
                }

                if (!$coupon->is_active) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Mã giảm giá đã bị vô hiệu hóa'
                    ], 400);
                }

                if ($coupon->used) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Mã giảm giá đã được sử dụng'
                    ], 400);
                }

                if ($coupon->end_date && now()->gt($coupon->end_date)) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Mã giảm giá đã hết hạn'
                    ], 400);
                }

                if ($validated['total_amount'] < $coupon->min_purchase) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Đơn hàng tối thiểu {$coupon->min_purchase}₫ để sử dụng mã này"
                    ], 400);
                }

                // Kiểm tra usage_limit
                if (isset($coupon->usage_limit) && $coupon->usage_limit > 0) {
                    if ($coupon->used_count >= $coupon->usage_limit) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => 'Mã giảm giá đã hết lượt sử dụng'
                        ], 400);
                    }
                }
            }

            // ==========================================
            // ✅ BƯỚC 2: VALIDATE & LOCK STOCK
            // ==========================================
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

            // ==========================================
            // ✅ BƯỚC 3: TẠO ORDER
            // ==========================================
            $order = Order::create([
                'user_id' => $user->id,
                'sku' => strtoupper(substr(uniqid('ODR'), -9)),
                'total_amount' => $validated['total_amount'],
                'discount_amount' => $validated['discount_amount'] ?? 0,
                'final_amount' => $validated['final_amount'],
                'coupon_id' => $validated['coupon_id'] ?? null,
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_status' => 'unpaid',
                'payment_method' => $validated['payment_method'],
                'note' => $validated['note'] ?? null,
            ]);

            // ==========================================
            // ✅ BƯỚC 4: TẠO ORDER ITEMS
            // ==========================================
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

            // ==========================================
            // ✅ BƯỚC 5: TRỪ STOCK
            // ==========================================
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

            // ==========================================
            // ✅ BƯỚC 6: TĂNG COUPON USED_COUNT (NẾU CÓ)
            // ==========================================
            if ($coupon && isset($coupon->usage_limit) && $coupon->usage_limit > 0) {
                $coupon->increment('used_count');
                
                Log::info('Coupon used count incremented', [
                    'coupon_id' => $coupon->id,
                    'coupon_code' => $coupon->code,
                    'used_count' => $coupon->fresh()->used_count,
                    'usage_limit' => $coupon->usage_limit,
                    'order_id' => $order->id,
                ]);
            }

            // ==========================================
            // ✅ BƯỚC 7: TẠO PAYMENT TRANSACTION
            // ==========================================
            PaymentTransaction::create([
                'order_id' => $order->id,
                'transaction_code' => 'PENDING_' . $order->id . '_' . time(),
                'amount' => $validated['final_amount'],
                'payment_method' => $validated['payment_method'],
                'paid_at' => null,
            ]);

            // ==========================================
            // ✅ BƯỚC 8: TẠO SHIPPING
            // ==========================================
            Shipping::create([
                'order_id' => $order->id,
                'sku' => strtoupper(Str::random(9)),
                'shipping_name' => $validated['shipping_name'],
                'shipping_phone' => $validated['shipping_phone'],
                'shipping_status' => 'pending',
                'city' => $validated['city'],
                'notes' => $validated['notes'] ?? null,
                'district' => $validated['district'],
                'commune' => $validated['commune'],
                'village' => $validated['village'] ?? null,
            ]);

            // ==========================================
            // ✅ BƯỚC 9: XÓA CART ITEMS ĐÃ MUA
            // ==========================================
            $variantIds = collect($validated['items'])
                ->pluck('variant_id')
                ->filter()
                ->unique()
                ->values();

            if ($variantIds->isNotEmpty()) {
                $cart = Cart::where('user_id', $user->id)->first();
                
                if ($cart) {
                    $deletedCount = CartItem::where('cart_id', $cart->id)
                        ->whereIn('variant_id', $variantIds)
                        ->delete();
                    
                    Log::info('Cart items removed after successful order', [
                        'order_id' => $order->id,
                        'order_sku' => $order->sku,
                        'cart_id' => $cart->id,
                        'variant_ids_removed' => $variantIds->toArray(),
                        'items_deleted' => $deletedCount,
                        'user_id' => $user->id,
                    ]);
                    
                    $remainingItems = CartItem::where('cart_id', $cart->id)->count();
                    
                    if ($remainingItems > 0) {
                        Log::info('Cart still has items after order', [
                            'cart_id' => $cart->id,
                            'remaining_items' => $remainingItems,
                        ]);
                    }
                }
            }

            // ==========================================
            // ✅ COMMIT TRANSACTION
            // ==========================================
            DB::commit();

            // Load đầy đủ thông tin order
            $order->load([
                'items',
                'user:id,name,phone,email',
                'shipping',
                'paymentTransaction'
            ]);

            Log::info('Order created successfully', [
                'order_id' => $order->id,
                'sku' => $order->sku,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'total_items' => $order->items->count(),
                'final_amount' => $order->final_amount,
            ]);

            return response()->json([
                'success' => true,
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
                'success' => false,
                'error' => 'Đặt hàng thất bại',
                'detail' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 💳 Kiểm tra trạng thái thanh toán
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
                    'payment_status' => $order->payment_status,
                    'payment_method' => $order->payment_method,
                    'final_amount' => $order->final_amount,
                    'paid_at' => optional($transaction)->paid_at,
                    'transaction' => $transaction ? [
                        'id' => $transaction->id,
                        'transaction_code' => $transaction->transaction_code,
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

    /**
     * ❌ Hủy đơn hàng
     */
/**
     * ❌ Hủy đơn hàng
     */
    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            $order = Order::with(['items', 'shipping'])->where('user_id', $user->id)->find($id);

            if (!$order) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            if (!$order->shipping) {
                return response()->json([
                    'message' => 'Không tìm thấy thông tin vận chuyển'
                ], 400);
            }

            $currentStatus = $order->shipping->shipping_status;
            
            // Chỉ cho phép hủy khi đang pending hoặc nodone
            if (!in_array($currentStatus, ['pending', 'nodone'])) {
                if ($currentStatus === 'in_transit') {
                    return response()->json([
                        'message' => '📦 Đơn hàng của bạn đã được vận chuyển! Không thể hủy đơn hàng.'
                    ], 400);
                } elseif ($currentStatus === 'delivered') {
                    return response()->json([
                        'message' => '✅ Đơn hàng của bạn đã được giao! Không thể hủy đơn hàng.'
                    ], 400);
                } elseif ($currentStatus === 'none') {
                    return response()->json([
                        'message' => 'Đơn hàng này đã được hủy trước đó.'
                    ], 400);
                } else {
                    return response()->json([
                        'message' => 'Không thể hủy đơn hàng ở trạng thái hiện tại.'
                    ], 400);
                }
            }

            // ✅ Cập nhật shipping_status và lưu lý do vào trường reason
            $order->shipping->update([
                'shipping_status' => 'none',
                'reason' => $validated['reason'], // Lưu lý do hủy
            ]);

            // Hoàn stock
            foreach ($order->items as $item) {
                if ($item->variant_id) {
                    ProductVariant::where('id', $item->variant_id)
                        ->increment('stock_quantity', $item->quantity);
                    
                    Log::info('Stock restored after order cancellation', [
                        'order_id' => $order->id,
                        'variant_id' => $item->variant_id,
                        'quantity_restored' => $item->quantity,
                    ]);
                }
            }

            // Nếu đã thanh toán VNPAY thì đánh dấu refund
            if ($order->payment_status === 'paid' && $order->payment_method === 'vnpay') {
                $order->update([
                    'payment_status' => 'refund_processing',
                ]);
                
                Log::info('Order marked for refund', [
                    'order_id' => $order->id,
                    'sku' => $order->sku,
                    'amount' => $order->final_amount,
                ]);
            }

            // Ghi log hủy đơn
            OrderCancelLog::create([
                'order_id'     => $order->id,
                'cancelled_by' => 'user',
                'reason'       => $validated['reason'],
                'note'         => "Đơn hàng bị hủy bởi khách hàng: {$user->name}",
            ]);

            DB::commit();

            Log::info('Order cancelled successfully', [
                'order_id' => $order->id,
                'sku' => $order->sku,
                'cancelled_by' => 'user',
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Đơn hàng đã được hủy thành công!',
                'data' => $order->load('shipping'),
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order cancel error: ' . $e->getMessage(), [
                'order_id' => $id,
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Hủy đơn hàng thất bại!',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 🔄 Hoàn hàng
     */
    public function return(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            $order = Order::with(['items', 'shipping'])->where('user_id', $user->id)->find($id);

            if (!$order) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            if (!$order->shipping) {
                return response()->json([
                    'message' => 'Không tìm thấy thông tin vận chuyển'
                ], 400);
            }

            $currentStatus = $order->shipping->shipping_status;
            
            // Chỉ cho phép hoàn hàng khi đã delivered
            if ($currentStatus !== 'delivered') {
                if ($currentStatus === 'returned') {
                    return response()->json([
                        'message' => 'Đơn hàng này đã được hoàn trả trước đó.'
                    ], 400);
                } else {
                    return response()->json([
                        'message' => 'Chỉ có thể hoàn hàng khi đơn hàng đã được giao thành công.'
                    ], 400);
                }
            }

            // ✅ Cập nhật shipping_status thành 'returned' và lưu lý do
            $order->shipping->update([
                'shipping_status' => 'returned',
                'reason' => $validated['reason'], // Lưu lý do hoàn hàng
            ]);

            // Hoàn stock
            foreach ($order->items as $item) {
                if ($item->variant_id) {
                    ProductVariant::where('id', $item->variant_id)
                        ->increment('stock_quantity', $item->quantity);
                    
                    Log::info('Stock restored after order return', [
                        'order_id' => $order->id,
                        'variant_id' => $item->variant_id,
                        'quantity_restored' => $item->quantity,
                    ]);
                }
            }

            // Đánh dấu hoàn tiền nếu đã thanh toán
            if ($order->payment_status === 'paid') {
                $order->update([
                    'payment_status' => 'refund_processing',
                ]);
                
                Log::info('Order marked for refund after return', [
                    'order_id' => $order->id,
                    'sku' => $order->sku,
                    'amount' => $order->final_amount,
                ]);
            }

            DB::commit();

            Log::info('Order returned successfully', [
                'order_id' => $order->id,
                'sku' => $order->sku,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Yêu cầu hoàn hàng đã được gửi thành công!',
                'data' => $order->load('shipping'),
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order return error: ' . $e->getMessage(), [
                'order_id' => $id,
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Hoàn hàng thất bại!',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}