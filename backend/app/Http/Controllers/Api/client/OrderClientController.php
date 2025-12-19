<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\{
    Order,
    OrderItem,
    Shipping,
    ShippingLog,
    ProductReview,
    ProductVariant,
    Coupon,
    Cart,
    CartItem,
    OrderCancelLog,
    ReturnItem,
    ReturnRequest
};

use App\Mail\OrderConfirmation;
class OrderClientController extends Controller
{
    private function calculateShippingFee(float $amount): float
    {
        return $amount >= 500000 ? 0 : 30000;
    }

    /**
     * 🔒 Validate và lock stock cho các variant
     * @return array ['variant' => ProductVariant, 'quantity' => int]
     */
    private function validateAndLockStock(array $items): array
    {
        $variantsToDeduct = [];

        foreach ($items as $item) {
            if (!empty($item['variant_id'])) {
                $variant = ProductVariant::lockForUpdate()->find($item['variant_id']);

                if (!$variant) {
                    throw new \Exception("Sản phẩm '{$item['product_name']}' không tồn tại");
                }

                if (isset($variant->is_available) && $variant->is_available != 1) {
                    throw new \Exception("Sản phẩm '{$item['product_name']}' hiện không khả dụng");
                }

                if ($variant->stock_quantity < $item['quantity']) {
                    throw new \Exception("Sản phẩm '{$item['product_name']}' chỉ còn {$variant->stock_quantity} sản phẩm");
                }

                $variantsToDeduct[] = [
                    'variant' => $variant,
                    'quantity' => $item['quantity']
                ];
            }
        }

        return $variantsToDeduct;
    }



    // ============================================================
    //                     CRUD OPERATIONS
    // ============================================================

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
                'user:id,name,phone,email,bank_account_number,bank_name,bank_account_name',  // ✅ THÊM bank fields
                'shipping',
                'paymentTransaction'
            ])
            ->select('id', 'user_id', 'sku', 'total_amount', 'final_amount', 'discount_amount', 'payment_status', 'payment_method', 'note', 'created_at')
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
            'message' => 'Danh sách đơn hàng',
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

        // ✅ Eager load tất cả trừ reviews
        $order = Order::where('user_id', $user->id)
            ->with([
                'user:id,name,phone,email,bank_account_number,bank_name,bank_account_name',  // ✅ THÊM BANK FIELDS
                'shipping',
                'paymentTransaction',
                'items' => function ($query) {
                    $query->withReturnData();
                }
            ])
            ->select('id', 'user_id', 'sku', 'total_amount', 'final_amount', 'discount_amount', 'coupon_id', 'payment_status', 'payment_method', 'note', 'created_at')
            ->find($id);

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        // ✅ Load tất cả reviews trong 1 query duy nhất
        $orderReviews = ProductReview::where('order_id', $order->id)
            ->get()
            ->groupBy(function ($review) {
                return "{$review->product_id}_{$review->variant_id}";
            });

        // ✅ Transform với data đã load
        $order->items->transform(function ($item) use ($orderReviews) {
            $item->total = $item->quantity * floatval($item->price);

            // Lấy reviews từ collection đã group
            $reviewKey = "{$item->product_id}_{$item->variant_id}";
            $item->reviews = $orderReviews->get($reviewKey, collect());

            // Tính từ data đã load
            $item->returned_quantity = $item->getReturnedQtyFromLoaded();
            $item->available_return_quantity = $item->availableReturnQuantityFromLoaded();

            // Cleanup
            unset($item->returnItems);

            return $item;
        });

        return response()->json([
            'message' => 'Chi tiết đơn hàng',
            'data' => $order
        ]);
    }

    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $validated = $request->validate(['reason' => 'required|string|max:500']);

        DB::beginTransaction();
        try {
            $order = Order::with(['items', 'shipping'])->where('user_id', $user->id)->find($id);

            if (!$order || !$order->shipping) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            $currentStatus = $order->shipping->shipping_status;

            // Chỉ cho phép hủy khi pending hoặc nodone
            if (!in_array($currentStatus, ['pending', 'nodone'])) {
                $messages = [
                    'in_transit' => 'Đơn hàng đã được vận chuyển, không thể hủy',
                    'delivered' => 'Đơn hàng đã được giao, không thể hủy',
                    'received' => 'Đơn hàng đã được giao, không thể hủy',
                    'none' => 'Đơn hàng đã được hủy trước đó',
                ];

                return response()->json([
                    'message' => $messages[$currentStatus] ?? 'Không thể hủy đơn hàng ở trạng thái hiện tại'
                ], 400);
            }

            // Lưu shipping log
            ShippingLog::create([
                'shipping_id' => $order->shipping->id,
                'old_status' => $currentStatus,
                'new_status' => 'none',
                'created_at' => now(),
            ]);

            // Cập nhật shipping status
            $order->shipping->update([
                'shipping_status' => 'none',
                'reason' => $validated['reason'],
            ]);

            // Hoàn stock và giảm quantity_sold
            foreach ($order->items as $item) {
                if ($item->variant_id) {
                    $variant = ProductVariant::find($item->variant_id);
                    if ($variant) {
                        $variant->increment('stock_quantity', $item->quantity);
                        $variant->decrement('quantity_sold', $item->quantity);
                    }
                }
            }

            // Hoàn coupon
            if ($order->coupon_id) {
                $coupon = Coupon::find($order->coupon_id);
                if ($coupon && isset($coupon->usage_limit)) {
                    $coupon->decrement('used_count');
                }
            }

            // Xử lý hoàn tiền VNPAY
            if ($order->payment_status === 'paid' && $order->payment_method === 'vnpay') {
                $order->update(['payment_status' => 'refund_processing']);
            }

            // Ghi log hủy
            OrderCancelLog::createUserCancelLog(
                $order->id,
                $validated['reason'],
                "Hủy bởi: {$user->name}"
            );

            DB::commit();

            return response()->json([
                'message' => 'Hủy đơn hàng thành công!',
                'data' => $order->load('shipping')
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order cancel error: ' . $e->getMessage());
            return response()->json(['message' => 'Hủy đơn hàng thất bại!'], 500);
        }
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        // ============================================================
        // 1. VALIDATE INPUT
        // ============================================================
        $validated = $request->validate([
            'payment_method' => 'required|in:cod,vnpay',
            'note' => 'nullable|string|max:1000',

            // Items
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.product_name' => 'required|string',
            'items.*.product_image' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.sku' => 'nullable|string',

            // Pricing
            'total_amount' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'final_amount' => 'required|numeric|min:0',
            'shipping_fee' => 'nullable|numeric|min:0',
            'coupon_id' => 'nullable|integer|exists:coupons,id',
            'coupon_code' => 'nullable|string',

            // Shipping info
            'shipping_name' => 'required|string|max:255',
            'shipping_phone' => 'required|string|regex:/^\d{10}$/',
            'city' => 'required|string',
            'district' => 'required|string',
            'commune' => 'required|string',
            'village' => 'nullable|string',
            'notes' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            // 2. VALIDATE & LOCK COUPON
            $coupon = null;
            $appliedDiscount = $validated['discount_amount'] ?? 0;

            if (!empty($validated['coupon_id'])) {
                $coupon = Coupon::lockForUpdate()->find($validated['coupon_id']);

                if (!$coupon) {
                    throw new \Exception('Mã giảm giá không tồn tại');
                }

                if (!$coupon->is_active) {
                    throw new \Exception('Mã giảm giá đã bị vô hiệu hóa');
                }

                if ($coupon->end_date && now()->gt($coupon->end_date)) {
                    throw new \Exception('Mã giảm giá đã hết hạn');
                }

                if (isset($coupon->usage_limit) && $coupon->used_count >= $coupon->usage_limit) {
                    throw new \Exception('Mã giảm giá đã hết lượt sử dụng');
                }

                if ($validated['total_amount'] < $coupon->min_purchase) {
                    throw new \Exception("Đơn hàng tối thiểu " . number_format($coupon->min_purchase, 0, ',', '.') . "VNĐ để áp dụng mã này");
                }

                // Verify discount amount is correct
                $calculatedDiscount = 0;
                if ($coupon->discount_type === 'percent') {
                    $calculatedDiscount = min(
                        ($coupon->discount_value / 100) * $validated['total_amount'],
                        $coupon->max_discount
                    );
                } else {
                    $calculatedDiscount = min($coupon->discount_value, $coupon->max_discount);
                }

                if (abs($appliedDiscount - $calculatedDiscount) > 1) {
                    Log::warning('Discount mismatch', [
                        'applied' => $appliedDiscount,
                        'calculated' => $calculatedDiscount,
                        'coupon_id' => $coupon->id,
                    ]);
                }
            }

            $variantsToDeduct = [];

            foreach ($validated['items'] as $item) {
                if (!empty($item['variant_id'])) {
                    $variant = ProductVariant::lockForUpdate()->find($item['variant_id']);

                    if (!$variant) {
                        throw new \Exception("Sản phẩm '{$item['product_name']}' không tồn tại");
                    }

                    // Check availability
                    if (isset($variant->is_available) && $variant->is_available != 1) {
                        throw new \Exception("Sản phẩm '{$item['product_name']}' hiện không khả dụng");
                    }

                    // Check stock
                    if ($variant->stock_quantity < $item['quantity']) {
                        throw new \Exception("Sản phẩm '{$item['product_name']}' chỉ còn {$variant->stock_quantity} sản phẩm trong kho");
                    }

                    $variantsToDeduct[] = [
                        'variant' => $variant,
                        'quantity' => $item['quantity'],
                        'product_name' => $item['product_name'],
                    ];
                }
            }

            // 4. TẠO ORDER
            $order = Order::create([
                'user_id' => $user->id,
                'sku' => strtoupper(substr(uniqid('ODR'), -9)),
                'total_amount' => $validated['total_amount'],
                'discount_amount' => $appliedDiscount,
                'final_amount' => $validated['final_amount'],
                'coupon_id' => $validated['coupon_id'] ?? null,
                'payment_status' => 'unpaid',
                'payment_method' => $validated['payment_method'],
                'note' => $validated['note'] ?? null,
            ]);

            Log::info('📦 Order created', [
                'order_id' => $order->id,
                'sku' => $order->sku,
                'user_id' => $user->id,
                'payment_method' => $validated['payment_method'],
                'final_amount' => $validated['final_amount'],
            ]);

            // ============================================================
            // 5. TẠO ORDER ITEMS
            // ============================================================
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
                    'sku' => $item['sku'] ?? null,
                ]);
            }

            Log::info('📝 Order items created', [
                'order_id' => $order->id,
                'items_count' => count($validated['items']),
            ]);

            // ============================================================
            // 6. XỬ LÝ STOCK
            // ============================================================
            if ($validated['payment_method'] === 'cod') {
                // ✅ COD: TRỪ STOCK NGAY
                foreach ($variantsToDeduct as $data) {
                    $oldStock = $data['variant']->stock_quantity;

                    $data['variant']->decrement('stock_quantity', $data['quantity']);
                    $data['variant']->increment('quantity_sold', $data['quantity']);

                    Log::info('📉 Stock deducted (COD)', [
                        'variant_id' => $data['variant']->id,
                        'product_name' => $data['product_name'],
                        'old_stock' => $oldStock,
                        'new_stock' => $data['variant']->stock_quantity,
                        'quantity_sold' => $data['quantity'],
                        'order_id' => $order->id,
                    ]);
                }
            } else {
                // ✅ VNPAY: GIỮ STOCK (đã lock), CHỜ THANH TOÁN THÀNH CÔNG
                Log::info('⏳ Stock locked (VNPay pending payment)', [
                    'order_id' => $order->id,
                    'variants_count' => count($variantsToDeduct),
                    'note' => 'Stock will be deducted after successful payment in IPN/Return handler',
                ]);
            }

            // ============================================================
            // 7. TĂNG COUPON USAGE COUNT
            // ============================================================
            if ($coupon && isset($coupon->usage_limit)) {
                $oldUsedCount = $coupon->used_count;
                $coupon->increment('used_count');

                Log::info('🎟️ Coupon used_count incremented', [
                    'coupon_id' => $coupon->id,
                    'code' => $coupon->code,
                    'old_used_count' => $oldUsedCount,
                    'new_used_count' => $coupon->used_count,
                    'usage_limit' => $coupon->usage_limit,
                ]);
            }

            // ============================================================
            // 8. TẠO SHIPPING
            // ============================================================
            $shippingFee = $validated['shipping_fee'] ?? $this->calculateShippingFee($validated['total_amount']);

            $shipping = Shipping::create([
                'order_id' => $order->id,
                'sku' => strtoupper(Str::random(9)),
                'shipping_name' => $validated['shipping_name'],
                'shipping_phone' => $validated['shipping_phone'],
                'shipping_status' => 'pending',
                'city' => $validated['city'],
                'district' => $validated['district'],
                'commune' => $validated['commune'],
                'village' => $validated['village'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'shipping_fee' => $shippingFee,
            ]);

            // Create shipping log
            ShippingLog::create([
                'shipping_id' => $shipping->id,
                'old_status' => null,
                'new_status' => 'pending',
                'created_at' => now(),
            ]);

            Log::info('🚚 Shipping created', [
                'shipping_id' => $shipping->id,
                'order_id' => $order->id,
                'shipping_fee' => $shippingFee,
            ]);

            // ============================================================
            // 9. XÓA CART ITEMS ĐÃ MUA
            // ============================================================
            $variantIds = collect($validated['items'])
                ->pluck('variant_id')
                ->filter()
                ->unique();

            if ($variantIds->isNotEmpty()) {
                $cart = Cart::where('user_id', $user->id)->first();

                if ($cart) {
                    $deletedCount = CartItem::where('cart_id', $cart->id)
                        ->whereIn('variant_id', $variantIds)
                        ->delete();

                    Log::info('🛒 Cart items cleared', [
                        'user_id' => $user->id,
                        'deleted_count' => $deletedCount,
                        'variant_ids' => $variantIds->toArray(),
                    ]);
                }
            }

            // ============================================================
            // 10. COMMIT TRANSACTION
            // ============================================================
            DB::commit();

            Log::info('✅ Order transaction committed', [
                'order_id' => $order->id,
                'payment_method' => $validated['payment_method'],
            ]);

            // ============================================================
            // 11. LOAD RELATIONSHIPS
            // ============================================================
            $order->load(['items', 'user', 'shipping', 'paymentTransaction']);

            // ============================================================
            // 12. GỬI EMAIL XÁC NHẬN (NON-BLOCKING)
            // ============================================================
            try {
                Mail::to($user->email)->send(new OrderConfirmation($order));

                Log::info('📧 Order confirmation email sent', [
                    'order_id' => $order->id,
                    'email' => $user->email,
                ]);
            } catch (\Exception $e) {
                // ⚠️ Email fail không rollback transaction
                Log::error('❌ Failed to send order confirmation email', [
                    'order_id' => $order->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
            }

            // ============================================================
            // 13. RESPONSE
            // ============================================================
            return response()->json([
                'success' => true,
                'message' => $validated['payment_method'] === 'cod'
                    ? 'Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng.'
                    : 'Đặt hàng thành công! Vui lòng hoàn tất thanh toán.',
                'data' => $order,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('❌ Order validation error', [
                'user_id' => $user->id,
                'errors' => $e->errors(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('❌ Order creation failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'Đã xảy ra lỗi khi tạo đơn hàng',
            ], 500);
        }
    }

    public function returnRequests(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        try {
            $order = Order::where('user_id', $user->id)->find($id);

            if (!$order) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            $returnRequests = ReturnRequest::where('order_id', $id)
                ->with(['items.orderItem', 'order.items', 'order.shipping'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($returnRequest) {
                    return [
                        'id' => $returnRequest->id,
                        'order_id' => $returnRequest->order_id,
                        'status' => $returnRequest->status,
                        'is_full_return' => $returnRequest->isFullReturn(),
                        'created_at' => $returnRequest->created_at->toISOString(),
                        'items_count' => $returnRequest->getTotalItemsCount(),

                        // ✅ Chuyển sang string để khớp với TypeScript interface
                        'total_return_amount' => (string) $returnRequest->getTotalReturnAmount(),
                        'estimated_refund_min' => (string) floatval($returnRequest->estimated_refund_min),
                        'estimated_refund_max' => (string) floatval($returnRequest->estimated_refund_max),
                        'estimated_refund' => (string) floatval($returnRequest->estimated_refund),
                        'refund_explanation' => $returnRequest->getRefundExplanation(),

                        // ✅ Thông tin refund_30k
                        'refund_30k' => $returnRequest->refund_30k,
                        'refund_30k_label' => $returnRequest->getRefund30kLabel(),

                        'admin_note' => $returnRequest->admin_note,

                        // Chi tiết items
                        'items' => $returnRequest->items->map(function ($item) {
                            $orderItem = $item->orderItem;

                            return [
                                'id' => $item->id,
                                'order_item_id' => $item->order_item_id,
                                'variant_id' => $item->variant_id,
                                'product_name' => $orderItem?->product_name,
                                'product_image' => $orderItem?->product_image,
                                'size' => $orderItem?->size,
                                'color' => $orderItem?->color,
                                'quantity' => $item->quantity,
                                'reason' => $item->reason,
                                'refund_amount' => floatval($item->refund_amount),
                                'status' => $item->status,
                                'admin_response' => $item->admin_response,
                                'images' => $item->images ?? [],
                            ];
                        }),

                        // ✅ Refund scenarios: Hiển thị có/không hoàn 30k
                        'refund_scenarios' => $returnRequest->calculateBothScenarios(),
                    ];
                });

            return response()->json([
                'message' => 'Danh sách yêu cầu hoàn hàng',
                'data' => $returnRequests
            ], 200);

        } catch (\Exception $e) {
            Log::error('Return requests error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Lỗi khi lấy danh sách hoàn hàng',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }




    public function cancelLogs(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        try {
            $order = Order::where('user_id', $user->id)->find($id);

            if (!$order) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            $cancelLogs = OrderCancelLog::where('order_id', $id)
                ->select('id', 'order_id', 'cancelled_by', 'reason', 'note', 'created_at')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'message' => 'Lịch sử hủy/hoàn hàng',
                'data' => $cancelLogs
            ], 200);

        } catch (\Exception $e) {
            Log::error('Cancel logs error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Lỗi khi lấy lịch sử hủy hàng',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
    public function return(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.order_item_id' => 'required|integer|exists:order_items,id',
            'items.*.variant_id' => 'required|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.reason' => 'required|string|max:500',
            'items.*.images' => 'nullable|array|max:5',
            'items.*.images.*' => 'string',

            // ✅ THÊM VALIDATION CHO BANK INFO
            'bank_account_number' => 'required|string|max:50',
            'bank_name' => 'required|string|max:255',
            'bank_account_name' => 'required|string|max:255',
        ]);

        DB::beginTransaction();
        try {

            $user->update([
                'bank_account_number' => $validated['bank_account_number'],
                'bank_name' => $validated['bank_name'],
                'bank_account_name' => $validated['bank_account_name'],
            ]);


            $order = Order::with(['items', 'shipping'])->where('user_id', $user->id)->find($id);

            if (!$order || !$order->shipping) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            // ✅ SỬA: Cho phép hoàn hàng khi delivered HOẶC received
            if (!in_array($order->shipping->shipping_status, ['delivered', 'received'])) {
                return response()->json([
                    'message' => 'Chỉ có thể hoàn hàng sau khi đã giao hàng'
                ], 400);
            }

            // ✅ SỬA: Chỉ kiểm tra thời hạn khi đã received
            if ($order->shipping->shipping_status === 'received') {
                if (method_exists($order->shipping, 'canReturn') && !$order->shipping->canReturn()) {
                    $daysSinceReceived = $order->shipping->received_at
                        ? now()->diffInDays($order->shipping->received_at)
                        : null;

                    if ($daysSinceReceived && $daysSinceReceived > 7) {
                        return response()->json([
                            'message' => "Đã quá thời hạn hoàn hàng (7 ngày). Bạn đã nhận hàng cách đây {$daysSinceReceived} ngày"
                        ], 400);
                    }

                    return response()->json([
                        'message' => 'Không thể hoàn hàng. Kiểm tra trạng thái đơn hàng.'
                    ], 400);
                }
            }

            // ============================================================
            // 2. VALIDATE CÁC ITEM HOÀN
            // ============================================================
            $returnedItems = [];

            foreach ($validated['items'] as $itemData) {
                // Tìm order item
                $orderItem = OrderItem::where('id', $itemData['order_item_id'])
                    ->where('order_id', $order->id)
                    ->where('variant_id', $itemData['variant_id'])
                    ->first();

                if (!$orderItem) {
                    return response()->json([
                        'message' => 'Sản phẩm không tồn tại trong đơn hàng hoặc variant_id không khớp'
                    ], 400);
                }

                // Kiểm tra có đánh giá chưa (nếu review thì không hoàn)
                if (method_exists($orderItem, 'hasReview') && $orderItem->hasReview()) {
                    return response()->json([
                        'message' => "Không thể hoàn '{$orderItem->product_name}' vì đã đánh giá"
                    ], 400);
                }

                // Lấy số lượng có thể hoàn
                $availableQty = method_exists($orderItem, 'availableReturnQuantity')
                    ? $orderItem->availableReturnQuantity()
                    : $orderItem->quantity;

                if ($itemData['quantity'] > $availableQty) {
                    return response()->json([
                        'message' => "'{$orderItem->product_name}' chỉ có thể hoàn tối đa {$availableQty} sản phẩm"
                    ], 400);
                }

                // Tính số tiền hoàn cho item này (dựa trên giá gốc của item)
                $refundAmount = $itemData['quantity'] * floatval($orderItem->price);

                // ============================================================
                // 3. XỬ LÝ UPLOAD ẢNH
                // ============================================================
                $uploadedImages = [];
                if (!empty($itemData['images'])) {
                    foreach ($itemData['images'] as $base64Image) {
                        try {
                            if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
                                $imageData = substr($base64Image, strpos($base64Image, ',') + 1);
                                $imageType = strtolower($type[1]);

                                if (!in_array($imageType, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                                    throw new \Exception('Chỉ chấp nhận định dạng: jpg, png, gif, webp');
                                }

                                $decodedData = base64_decode($imageData);
                                if ($decodedData === false) {
                                    throw new \Exception('Không thể decode ảnh');
                                }

                                $fileName = 'return_' . time() . '_' . uniqid() . '.' . $imageType;
                                $path = 'returns/' . $fileName;
                                Storage::disk('public')->put($path, $decodedData);

                                $uploadedImages[] = 'storage/' . $path;
                            }
                        } catch (\Exception $e) {
                            Log::warning('Upload image error: ' . $e->getMessage());
                            continue;
                        }
                    }
                }

                $returnedItems[] = [
                    'order_item_id' => $orderItem->id,
                    'variant_id' => $itemData['variant_id'],
                    'product_name' => $orderItem->product_name,
                    'size' => $orderItem->size,
                    'color' => $orderItem->color,
                    'quantity' => $itemData['quantity'],
                    'price' => floatval($orderItem->price),
                    'refund_amount' => $refundAmount,
                    'reason' => $itemData['reason'],
                    'images' => $uploadedImages,
                ];
            }

            // ============================================================
            // 4. TẠO RETURN REQUEST (refund_30k mặc định = false)
            // ============================================================
            $returnRequest = ReturnRequest::create([
                'order_id' => $order->id,
                'user_id' => $user->id,
                'refund_30k' => false,
                'status' => 'pending',
            ]);

            // ============================================================
            // 5. TẠO RETURN ITEMS
            // ============================================================
            foreach ($returnedItems as $item) {
                ReturnItem::create([
                    'return_request_id' => $returnRequest->id,
                    'order_item_id' => $item['order_item_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $item['quantity'],
                    'status' => ReturnItem::STATUS_PENDING,
                    'reason' => $item['reason'],
                    'refund_amount' => $item['refund_amount'],
                    'images' => $item['images'],
                ]);
            }

            // ============================================================
            // 6. TÍNH REFUND
            // ============================================================
            $returnRequest->load(['items', 'order.items', 'order.shipping']);
            $returnRequest->recalculateRefund();

            // ============================================================
            // 7. CẬP NHẬT SHIPPING STATUS
            // ✅ SỬA: Lưu old_status đúng (delivered hoặc received)
            // ============================================================
            $oldStatus = $order->shipping->shipping_status;

            ShippingLog::create([
                'shipping_id' => $order->shipping->id,
                'old_status' => $oldStatus,
                'new_status' => 'return_processing',
                'created_at' => now(),
            ]);

            $order->shipping->update(['shipping_status' => 'return_processing']);

            // ============================================================
            // 8. GHI LOG
            // ============================================================
            Log::info('Return request created', [
                'return_request_id' => $returnRequest->id,
                'order_id' => $order->id,
                'user_id' => $user->id,
                'old_shipping_status' => $oldStatus,
                'items_count' => count($returnedItems),
                'total_return_amount' => $returnRequest->getTotalReturnAmount(),
                'is_full_return' => $returnRequest->isFullReturn(),
                'refund_30k' => false,
            ]);

            DB::commit();

            // ============================================================
            // 9. LOAD DỮ LIỆU & TÍNH CẢ 2 KỊCH BẢN
            // ============================================================
            $returnRequest->refresh();
            $scenarios = $returnRequest->calculateBothScenarios();
            $refundDetails = $returnRequest->getRefundDetails();

            // ============================================================
            // 10. RESPONSE
            // ============================================================
            $isFullReturn = $returnRequest->isFullReturn();
            $orderTotal = floatval($order->total_amount);
            $isFreeship = $orderTotal >= 500000;

            $message = $isFullReturn
                ? 'Yêu cầu hoàn toàn bộ đơn hàng thành công! Admin sẽ xem xét và phê duyệt.'
                : 'Yêu cầu hoàn một phần đơn hàng thành công! Admin sẽ xem xét và phê duyệt.';

            return response()->json([
                'message' => $message,
                'data' => [
                    'return_request_id' => $returnRequest->id,
                    'order_id' => $returnRequest->order_id,
                    'status' => $returnRequest->status,
                    'is_full_return' => $isFullReturn,
                    'created_at' => $returnRequest->created_at->toISOString(),
                    'items_count' => count($returnedItems),

                    'total_return_amount' => (string) $returnRequest->getTotalReturnAmount(),
                    'estimated_refund_min' => (string) floatval($returnRequest->estimated_refund_min),
                    'estimated_refund_max' => (string) floatval($returnRequest->estimated_refund_max),
                    'estimated_refund' => (string) floatval($returnRequest->estimated_refund),
                    'refund_explanation' => $returnRequest->getRefundExplanation(),

                    'refund_30k' => $returnRequest->refund_30k,
                    'refund_30k_applicable' => !$isFreeship,
                    'refund_30k_note' => !$isFreeship
                        ? 'Admin có thể tích checkbox hoàn 30k ship cho đơn hàng này'
                        : 'Đơn hàng >= 500k (đã freeship), không áp dụng hoàn 30k',

                    'returned_items' => $returnedItems,
                    'refund_scenarios' => $scenarios,
                    'refund_details' => $refundDetails,
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order return error', [
                'order_id' => $id,
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return response()->json([
                'message' => 'Hoàn hàng thất bại!',
                'error' => config('app.debug') ? $e->getMessage() : 'Đã xảy ra lỗi hệ thống',
            ], 500);
        }
    }

    public function confirmReceived(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        DB::beginTransaction();
        try {
            $order = Order::with('shipping')->where('user_id', $user->id)->find($id);

            if (!$order) {
                DB::rollBack();
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            if (!$order->shipping) {
                DB::rollBack();
                return response()->json(['message' => 'Không tìm thấy thông tin vận chuyển'], 404);
            }

            $currentStatus = $order->shipping->shipping_status ?? null;

            if ($currentStatus !== 'delivered') {
                $messages = [
                    'received' => 'Đơn hàng đã được xác nhận trước đó',
                    'evaluated' => 'Đơn hàng đã được đánh giá',
                ];

                DB::rollBack();
                return response()->json([
                    'message' => $messages[$currentStatus] ?? 'Chỉ có thể xác nhận khi đơn hàng đã được giao'
                ], 400);
            }

            // Tạo shipping log
            ShippingLog::create([
                'shipping_id' => $order->shipping->id,
                'old_status' => 'delivered',
                'new_status' => 'received',
                'created_at' => now(),
            ]);

            // Cập nhật shipping status và received_at
            $order->shipping->update([
                'shipping_status' => 'received',
                'received_at' => now(),
            ]);

            // Nếu COD thì cập nhật payment_status = paid
            if (($order->payment_method ?? null) === 'cod' && ($order->payment_status ?? null) === 'unpaid') {
                $order->update(['payment_status' => 'paid']);
            }

            DB::commit();

            $order->refresh();
            $order->load('shipping');

            return response()->json([
                'message' => 'Xác nhận nhận hàng thành công!',
                'data' => $order
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Confirm received error', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'message' => 'Xác nhận nhận hàng thất bại!',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * 📋 Lấy lịch sử vận chuyển
     */
    public function shippingLogs(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $order = Order::where('user_id', $user->id)
            ->with('shipping.logs')
            ->find($id);

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        if (!$order->shipping) {
            return response()->json(['message' => 'Không tìm thấy thông tin vận chuyển', 'data' => []], 200);
        }

        return response()->json([
            'message' => 'Lịch sử vận chuyển',
            'data' => $order->shipping->logs()->orderBy('created_at', 'desc')->get(),
        ], 200);
    }

    /**
     * 💳 Kiểm tra trạng thái thanh toán
     */
    public function paymentStatus(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập'], 401);
        }

        $order = Order::where('user_id', $user->id)->with('paymentTransaction')->find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy đơn hàng'], 404);
        }

        $transaction = $order->paymentTransaction;

        return response()->json([
            'success' => true,
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
                ] : null,
            ],
        ]);
    }
}