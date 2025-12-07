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

class OrderClientController extends Controller
{
    // ============================================================
    //                     HELPER METHODS
    // ============================================================

    /**
     * 💰 Tính phí ship dựa trên tổng tiền đơn hàng
     * Logic: >= 500k → freeship, < 500k → 30k
     */
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

    /**
     * 📊 Tính toán chi tiết hoàn tiền
     */
    private function calculateRefundDetails(Order $order, array $returnedItems): array
{
    $originalAmount = floatval($order->total_amount);
    $originalDiscount = floatval($order->discount_amount ?? 0);
    $oldShippingFee = floatval($order->shipping->shipping_fee ?? 0);

    // Tổng tiền hàng hoàn
    $totalReturnAmount = array_sum(array_column($returnedItems, 'total'));

    $returnRatio = $originalAmount > 0 ? ($totalReturnAmount / $originalAmount) : 0;

    // Giảm giá được hoàn lại (theo tỷ lệ)
    $refundedDiscount = round($originalDiscount * $returnRatio, 2);

    // Số tiền còn lại (dùng cho báo cáo, không dùng để tính ship)
    $remainingAmount = $originalAmount - $totalReturnAmount;

    // ❌ KHÔNG TÍNH LẠI SHIP — THEO CÁCH 1
    $newShippingFee = $oldShippingFee;
    $shippingDiff = 0;
    $shippingExplanation = "Theo chính sách: không hoàn hoặc thay đổi phí ship khi khách trả hàng";

    // ✅ CÔNG THỨC TÍNH TIỀN HOÀN (KHÔNG ĐỤNG VÀO SHIP)
    $estimatedRefund = $totalReturnAmount - $refundedDiscount;

    $estimatedRefund = max(0, round($estimatedRefund, 2));

    return [
        'total_return_amount' => $totalReturnAmount,
        'refunded_discount' => $refundedDiscount,
        'remaining_amount' => $remainingAmount,
        'old_shipping_fee' => $oldShippingFee,
        'new_shipping_fee' => $newShippingFee, // không đổi
        'shipping_diff' => $shippingDiff,       // luôn = 0
        'shipping_explanation' => $shippingExplanation,
        'estimated_refund' => $estimatedRefund,
    ];
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
                'user:id,name,phone,email',
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
                'user:id,name,phone,email',
                'shipping',
                'paymentTransaction',
                'items' => function ($query) {
                    $query->withReturnData(); // Load returnItems
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
            'items.*.product_name' => 'required|string',
            'items.*.product_image' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'total_amount' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'final_amount' => 'required|numeric|min:0',
            'coupon_id' => 'nullable|integer',
            'shipping_name' => 'required|string',
            'shipping_phone' => 'required|string',
            'city' => 'required|string',
            'district' => 'required|string',
            'commune' => 'required|string',
            'village' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // 1. Validate coupon
            $coupon = null;
            if (!empty($validated['coupon_id'])) {
                $coupon = Coupon::lockForUpdate()->find($validated['coupon_id']);

                if (!$coupon || !$coupon->is_active) {
                    return response()->json(['success' => false, 'message' => 'Mã giảm giá không hợp lệ'], 400);
                }

                if ($coupon->end_date && now()->gt($coupon->end_date)) {
                    return response()->json(['success' => false, 'message' => 'Mã giảm giá đã hết hạn'], 400);
                }

                if (isset($coupon->usage_limit) && $coupon->used_count >= $coupon->usage_limit) {
                    return response()->json(['success' => false, 'message' => 'Mã giảm giá đã hết lượt sử dụng'], 400);
                }

                if ($validated['total_amount'] < $coupon->min_purchase) {
                    return response()->json(['success' => false, 'message' => "Đơn hàng tối thiểu " . number_format($coupon->min_purchase, 0) . "₫"], 400);
                }
            }

            // 2. Validate & lock stock
            $variantsToDeduct = $this->validateAndLockStock($validated['items']);

            // 3. Tạo order
            $order = Order::create([
                'user_id' => $user->id,
                'sku' => strtoupper(substr(uniqid('ODR'), -9)),
                'total_amount' => $validated['total_amount'],
                'discount_amount' => $validated['discount_amount'] ?? 0,
                'final_amount' => $validated['final_amount'],
                'coupon_id' => $validated['coupon_id'] ?? null,
                'payment_status' => 'unpaid',
                'payment_method' => $validated['payment_method'],
                'note' => $validated['note'] ?? null,
            ]);

            // 4. Tạo order items
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

            // 5. Trừ stock
            foreach ($variantsToDeduct as $data) {
                $oldStock = $data['variant']->stock_quantity;
                $data['variant']->decrement('stock_quantity', $data['quantity']);
                $data['variant']->increment('quantity_sold', $data['quantity']);

                Log::info("Stock deducted", [
                    'variant_id' => $data['variant']->id,
                    'old_stock' => $oldStock,
                    'new_stock' => $data['variant']->stock_quantity,
                    'quantity_sold' => $data['quantity'],
                    'order_id' => $order->id,
                ]);
            }

            // 6. Tăng coupon used_count
            if ($coupon && isset($coupon->usage_limit)) {
                $coupon->increment('used_count');
            }

            // 7. Tính phí ship
            $shippingFee = $this->calculateShippingFee($validated['total_amount']);

            // 8. Tạo shipping
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

            // Lưu shipping log
            ShippingLog::create([
                'shipping_id' => $shipping->id,
                'old_status' => null,
                'new_status' => 'pending',
                'created_at' => now(),
            ]);

            // 9. Xóa cart items đã mua
            $variantIds = collect($validated['items'])->pluck('variant_id')->filter()->unique();
            if ($variantIds->isNotEmpty()) {
                $cart = Cart::where('user_id', $user->id)->first();
                if ($cart) {
                    CartItem::where('cart_id', $cart->id)->whereIn('variant_id', $variantIds)->delete();
                }
            }

            DB::commit();

            $order->load(['items', 'user', 'shipping', 'paymentTransaction']);

            return response()->json([
                'success' => true,
                'message' => 'Đặt hàng thành công',
                'data' => $order
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order store error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
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
            $order = Order::with('items')->where('user_id', $user->id)->find($id);

            if (!$order) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            $returnRequests = ReturnRequest::where('order_id', $id)
                ->with([
                    'items' => function ($query) {
                        $query->select('id', 'return_request_id', 'order_item_id', 'variant_id', 'quantity', 'reason', 'refund_amount', 'status', 'admin_response'); // ✅ THÊM admin_response
                    }
                ])
                ->select(
                    'id',
                    'order_id',
                    'status',
                    'total_return_amount',
                    'refunded_discount',
                    'old_shipping_fee',
                    'new_shipping_fee',
                    'shipping_diff',
                    'estimated_refund',
                    'remaining_amount',
                    'requested_at'
                )
                ->orderBy('requested_at', 'desc')  // ✅ ĐỔI TỪ created_at THÀNH requested_at
                ->get()
                ->map(function ($returnRequest) use ($order) {
                    return [
                        'id' => $returnRequest->id,
                        'status' => $returnRequest->status,
                        'requested_at' => $returnRequest->requested_at,
                        'total_return_amount' => floatval($returnRequest->total_return_amount),
                        'refunded_discount' => floatval($returnRequest->refunded_discount),
                        'estimated_refund' => floatval($returnRequest->estimated_refund),
                        'remaining_amount' => floatval($returnRequest->remaining_amount),
                        'old_shipping_fee' => floatval($returnRequest->old_shipping_fee),
                        'new_shipping_fee' => floatval($returnRequest->new_shipping_fee),
                        'shipping_diff' => floatval($returnRequest->shipping_diff),
                        'items' => $returnRequest->items->map(function ($item) use ($order) {
                            $orderItem = $order->items->firstWhere('id', $item->order_item_id);

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
                                'admin_response' => $item->admin_response, // ✅ THÊM DÒNG NÀY
                            ];
                        }),
                    ];
                });

            return response()->json([
                'message' => 'Danh sách hoàn hàng',
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

    /**
     * 📝 Lấy lịch sử hủy/hoàn hàng
     */
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

    /**
     * 🔄 Hoàn hàng (Client tạo yêu cầu)
     */
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
        ]);

        DB::beginTransaction();
        try {
            $order = Order::with(['items', 'shipping'])->where('user_id', $user->id)->find($id);

            if (!$order || !$order->shipping) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            if ($order->shipping->shipping_status !== 'received') {
                return response()->json(['message' => 'Chỉ có thể hoàn hàng sau khi đã nhận hàng'], 400);
            }

            if (!$order->shipping->canReturn()) {
                $daysSinceReceived = $order->shipping->received_at
                    ? now()->diffInDays($order->shipping->received_at)
                    : null;

                if ($order->shipping->shipping_status !== 'received') {
                    return response()->json([
                        'message' => 'Chỉ có thể hoàn hàng sau khi đã nhận hàng'
                    ], 400);
                }

                if ($daysSinceReceived && $daysSinceReceived > 7) {
                    return response()->json([
                        'message' => "Đã quá thời hạn hoàn hàng (7 ngày). Bạn đã nhận hàng cách đây {$daysSinceReceived} ngày"
                    ], 400);
                }

                return response()->json([
                    'message' => 'Không thể hoàn hàng. Kiểm tra trạng thái đơn hàng.'
                ], 400);
            }
            // ✅ Kiểm tra thời hạn hoàn hàng (7 ngày)
            $daysSinceReceived = now()->diffInDays($order->shipping->received_at);
            if ($daysSinceReceived > 7) {
                return response()->json([
                    'message' => "Đã quá thời hạn hoàn hàng (7 ngày). Bạn đã nhận hàng cách đây {$daysSinceReceived} ngày"
                ], 400);
            }

            $returnedItems = [];

            // ============================================================
            // VALIDATE CÁC ITEM HOÀN
            // ============================================================

            foreach ($validated['items'] as $itemData) {
                $orderItem = OrderItem::where('id', $itemData['order_item_id'])
                    ->where('order_id', $order->id)
                    ->where('variant_id', $itemData['variant_id'])
                    ->first();

                if (!$orderItem) {
                    return response()->json([
                        'message' => 'Sản phẩm không tồn tại trong đơn hàng hoặc variant_id không khớp'
                    ], 400);
                }

                // Kiểm tra đã review chưa
                if (method_exists($orderItem, 'hasReview') && $orderItem->hasReview()) {
                    return response()->json([
                        'message' => "Không thể hoàn '{$orderItem->product_name}' vì đã đánh giá"
                    ], 400);
                }

                // Kiểm tra số lượng có thể hoàn
                $availableQty = method_exists($orderItem, 'availableReturnQuantity')
                    ? $orderItem->availableReturnQuantity()
                    : $orderItem->quantity;

                if ($itemData['quantity'] > $availableQty) {
                    return response()->json([
                        'message' => "'{$orderItem->product_name}' chỉ có thể hoàn tối đa {$availableQty} sản phẩm"
                    ], 400);
                }

                $returnAmount = $itemData['quantity'] * floatval($orderItem->price);

                $returnedItems[] = [
                    'order_item_id' => $orderItem->id,
                    'variant_id' => $itemData['variant_id'],
                    'product_name' => $orderItem->product_name,
                    'size' => $orderItem->size,
                    'color' => $orderItem->color,
                    'quantity' => $itemData['quantity'],
                    'price' => floatval($orderItem->price),
                    'total' => $returnAmount,
                    'reason' => $itemData['reason'],
                ];
            }

            // ============================================================
            // TÍNH TOÁN SỐ TIỀN HOÀN
            // ============================================================

            $refundDetails = $this->calculateRefundDetails($order, $returnedItems);

            // ============================================================
            // TẠO RETURN REQUEST
            // ============================================================

            $returnRequest = ReturnRequest::create([
                'order_id' => $order->id,
                'user_id' => $user->id,
                'status' => ReturnRequest::STATUS_PENDING,
                'total_return_amount' => $refundDetails['total_return_amount'],
                'refunded_discount' => $refundDetails['refunded_discount'],
                'old_shipping_fee' => $refundDetails['old_shipping_fee'],
                'new_shipping_fee' => $refundDetails['new_shipping_fee'],
                'shipping_diff' => $refundDetails['shipping_diff'],
                'estimated_refund' => $refundDetails['estimated_refund'],
                'remaining_amount' => $refundDetails['remaining_amount'],
                'requested_at' => now(),
                'note' => "Yêu cầu hoàn " . count($validated['items']) . " sản phẩm",
            ]);

            // ============================================================
            // TẠO RETURN ITEMS
            // ============================================================

            foreach ($returnedItems as $item) {
                ReturnItem::create([
                    'return_request_id' => $returnRequest->id,
                    'order_item_id' => $item['order_item_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $item['quantity'],
                    'status' => ReturnItem::STATUS_PENDING,
                    'reason' => $item['reason'],
                    'refund_amount' => $item['total'],
                ]);
            }

            // ============================================================
            // CẬP NHẬT SHIPPING STATUS
            // ============================================================

            ShippingLog::create([
                'shipping_id' => $order->shipping->id,
                'old_status' => 'received',
                'new_status' => 'return_processing',
                'created_at' => now(),
            ]);

            $order->shipping->update(['shipping_status' => 'return_processing']);

            // ============================================================
            // GHI LOG
            // ============================================================

            OrderCancelLog::createReturnLog($order->id, array_merge(
                ['returned_items' => $returnedItems],
                $refundDetails
            ));

            DB::commit();

            // ============================================================
            // RESPONSE
            // ============================================================

            return response()->json([
                'message' => 'Yêu cầu hoàn hàng thành công!',
                'data' => [
                    'return_request_id' => $returnRequest->id,
                    'returned_items' => $returnedItems,
                    'refund_details' => [
                        'original_order' => [
                            'total_amount' => floatval($order->total_amount),
                            'discount_amount' => floatval($order->discount_amount ?? 0),
                            'shipping_fee' => $refundDetails['old_shipping_fee'],
                        ],
                        'return_calculation' => [
                            'total_return_amount' => $refundDetails['total_return_amount'],
                            'refunded_discount' => $refundDetails['refunded_discount'],
                            'remaining_amount' => $refundDetails['remaining_amount'],
                        ],
                        'shipping_changes' => [
                            'old_shipping_fee' => $refundDetails['old_shipping_fee'],
                            'new_shipping_fee' => $refundDetails['new_shipping_fee'],
                            'shipping_diff' => $refundDetails['shipping_diff'],
                            'explanation' => $refundDetails['shipping_explanation'],
                        ],
                        'final_refund' => [
                            'estimated_refund' => $refundDetails['estimated_refund'],
                            'formula' => 'Tiền hoàn = Tiền hàng hoàn - Giảm giá được hoàn - Phí ship phát sinh',
                            'calculation' => sprintf(
                                "%s - %s - (%s) = %s",
                                number_format($refundDetails['total_return_amount'], 0),
                                number_format($refundDetails['refunded_discount'], 0),
                                number_format($refundDetails['shipping_diff'], 0),
                                number_format($refundDetails['estimated_refund'], 0)
                            ),
                        ],
                    ]
                ]
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order return error', [
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

    // ============================================================
//                     SHIPPING & PAYMENT
// ============================================================

    /**
     * ✅ Xác nhận đã nhận hàng
     */
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