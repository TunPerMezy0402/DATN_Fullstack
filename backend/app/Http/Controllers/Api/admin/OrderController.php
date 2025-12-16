<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\{Order, ReturnRequest, ReturnItem, ShippingLog, ProductVariant};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Log, Storage};
use Illuminate\Support\Str;

class OrderController extends Controller
{

public function index(Request $request)
{
    $query = Order::with(['user:id,name,phone,email', 'items', 'shipping', 'coupon', 'returnRequests'])
        ->orderByDesc('created_at');

    // ✅ Filter theo SKU
    if ($request->filled('sku')) {
        $query->where('sku', 'like', '%' . $request->sku . '%');
    }

    // ✅ Filter theo payment_status từ return requests
    if ($request->filled('payment_status')) {
        $filterStatus = $request->payment_status;

        if ($filterStatus === 'refunded') {
            $query->whereHas('returnRequests', function ($q) {
                $q->where('status', 'completed');
            });
        } elseif ($filterStatus === 'refund_processing') {
            $query->whereHas('returnRequests', function ($q) {
                $q->whereIn('status', ['approved', 'pending']);
            });
        } else {
            $query->where('payment_status', $filterStatus);
        }
    }

    // ✅ Filter theo shipping_status
    if ($request->filled('shipping_status')) {
        $query->whereHas('shipping', function ($q) use ($request) {
            $q->where('shipping_status', $request->shipping_status);
        });
    }

    // ✅ Filter theo payment_method
    if ($request->filled('payment_method')) {
        $query->where('payment_method', $request->payment_method);
    }

    $orders = $query->paginate($request->per_page ?? 10);

    // ✅ Map orders với payment_status động và refund info
    $orders->getCollection()->transform(function ($order) {
        $actualPaymentStatus = $this->getActualPaymentStatus($order);
        $refundInfo = $this->calculateRefundInfo($order);

        $order->actual_payment_status = $actualPaymentStatus;
        $order->refund_info = $refundInfo;

        return $order;
    });

    // ✅ Stats chi tiết dựa trên return requests
    $stats = [
        'total_orders' => Order::count(),
        'total_revenue' => Order::where('payment_status', 'paid')->sum('final_amount'),
        'unpaid_orders' => Order::where('payment_status', 'unpaid')->count(),
        'paid_orders' => Order::where('payment_status', 'paid')
            ->whereDoesntHave('returnRequests')
            ->count(),

        'refunded_orders' => Order::whereHas('returnRequests', function ($q) {
            $q->where('status', 'completed');
        })->count(),

        'refund_processing_orders' => Order::whereHas('returnRequests', function ($q) {
            $q->whereIn('status', ['approved', 'pending']);
        })->whereDoesntHave('returnRequests', function ($q) {
            $q->where('status', 'completed');
        })->count(),

        'failed_orders' => Order::where('payment_status', 'failed')->count(),
    ];

    return response()->json(['data' => $orders, 'stats' => $stats]);
}


private function getActualPaymentStatus($order): string
{
    if ($order->returnRequests->isEmpty()) {
        return $order->payment_status;
    }

    $hasCompletedReturn = $order->returnRequests->contains('status', 'completed');
    $hasProcessingReturn = $order->returnRequests->whereIn('status', ['approved', 'pending'])->isNotEmpty();

    if ($hasCompletedReturn) {
        return 'refunded';
    }

    if ($hasProcessingReturn) {
        return 'refund_processing';
    }

    return $order->payment_status;
}


private function calculateRefundInfo($order): array
{
    $returnRequests = $order->returnRequests;
    $actualPaymentStatus = $this->getActualPaymentStatus($order);

    if ($returnRequests->isEmpty()) {
        return [
            'total_refund_needed' => 0,
            'total_refunded' => 0,
            'has_return_request' => false,
        ];
    }

    // ✅ Khi payment_status = refund_processing
    // Số tiền CẦN hoàn = sum estimated_refund của return requests pending/approved
    if ($actualPaymentStatus === 'refund_processing') {
        $totalRefundNeeded = $returnRequests
            ->whereIn('status', ['pending', 'approved'])
            ->sum('estimated_refund');

        return [
            'total_refund_needed' => floatval($totalRefundNeeded),
            'total_refunded' => 0,
            'has_return_request' => true,
        ];
    }

    // ✅ Khi payment_status = refunded
    // Số tiền ĐÃ hoàn = sum estimated_refund của return requests completed
    if ($actualPaymentStatus === 'refunded') {
        $totalRefunded = $returnRequests
            ->where('status', 'completed')
            ->sum('estimated_refund');

        return [
            'total_refund_needed' => 0,
            'total_refunded' => floatval($totalRefunded),
            'has_return_request' => true,
        ];
    }

    // ✅ Trạng thái khác (pending, rejected, etc.) không tính
    return [
        'total_refund_needed' => 0,
        'total_refunded' => 0,
        'has_return_request' => true,
    ];
}

    /**
     * 🔍 Chi tiết đơn hàng
     */
    public function show($id)
    {
        $order = Order::withTrashed()
            ->with([
                'user',
                'items',
                'shipping',
                'coupon',
                'paymentTransaction',
                'cancelLogs',
                'returnRequests.items'
            ])
            ->findOrFail($id);

        return response()->json(['data' => $this->formatOrderDetails($order)]);
    }

    public function update(Request $request, $id)
    {
        try {
            // ✅ Load đầy đủ relationships
            $order = Order::with(['shipping', 'transactions', 'returnRequests.items'])->findOrFail($id);

            $data = $request->validate([
                'shipping_status' => 'nullable|string|in:pending,in_transit,delivered,failed,returned,none,nodone,evaluated,return_processing,return_fail,received',
                'payment_status' => 'nullable|string|in:unpaid,paid,refunded,refund_processing,failed',
                'reason_admin' => 'nullable|string',
                'transfer_image' => 'nullable|string',
            ]);

            // ✅ Validate business logic
            $this->validateBusinessLogic($order, $data);

            DB::beginTransaction();
            try {
                $this->updateShipping($order, $data);
                $this->updatePayment($order, $data);
                DB::commit();

                // ✅ Fresh load lại order
                $freshOrder = Order::with(['shipping', 'transactions', 'returnRequests.items'])->find($id);

                return response()->json([
                    'message' => 'Cập nhật đơn hàng thành công',
                    'data' => $this->formatOrderBasic($freshOrder)
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Order update transaction error: ' . $e->getMessage(), [
                    'order_id' => $id,
                    'data' => $data,
                    'trace' => $e->getTraceAsString()
                ]);

                return response()->json([
                    'message' => 'Lỗi khi cập nhật đơn hàng: ' . $e->getMessage(),
                    'error' => config('app.debug') ? $e->getTraceAsString() : null
                ], 500);
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors()
            ], 422);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Order update error: ' . $e->getMessage(), [
                'order_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Lỗi hệ thống: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }


    public function upload(Request $request)
    {
        try {
            $request->validate([
                'transfer_image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
            ]);

            if (!$request->hasFile('transfer_image')) {
                return response()->json(['success' => false, 'message' => 'Không tìm thấy file ảnh'], 400);
            }

            $file = $request->file('transfer_image');
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $destination = public_path('storage/img/transfers');

            if (!file_exists($destination)) {
                mkdir($destination, 0755, true);
            }

            $file->move($destination, $filename);
            $relativePath = 'storage/img/transfers/' . $filename;
            $fullUrl = asset($relativePath);

            return response()->json([
                'success' => true,
                'message' => 'Upload ảnh thành công',
                'url' => $fullUrl,
                'path' => $relativePath
            ]);
        } catch (\Exception $e) {
            Log::error('Upload error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Có lỗi xảy ra: ' . $e->getMessage()], 500);
        }
    }


    public function shippingLogs($id)
    {
        try {
            $order = Order::with('shipping')->find($id);

            if (!$order || !$order->shipping) {
                return response()->json(['message' => 'Không tìm thấy thông tin vận chuyển', 'data' => []], 200);
            }

            $logs = DB::table('shipping_logs')
                ->where('shipping_id', $order->shipping->id)
                ->select('id', 'old_status', 'new_status', 'created_at')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json(['message' => 'Lịch sử vận chuyển', 'data' => $logs]);
        } catch (\Exception $e) {
            Log::error('Shipping logs error: ' . $e->getMessage());
            return response()->json(['message' => 'Không thể lấy lịch sử vận chuyển'], 500);
        }
    }


    public function returnRequests($id)
    {
        try {
            $order = Order::with('items')->findOrFail($id);

            $returnRequests = ReturnRequest::where('order_id', $id)
                ->with('items')
                ->orderByDesc('requested_at')
                ->get()
                ->map(fn($req) => $this->formatReturnRequest($req, $order));

            return response()->json(['message' => 'Danh sách yêu cầu hoàn hàng', 'data' => $returnRequests]);
        } catch (\Exception $e) {
            Log::error('Return requests error: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi lấy danh sách hoàn hàng'], 500);
        }
    }


    public function updateReturnStatus(Request $request, $orderId, $returnRequestId)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,approved,rejected,completed'
        ]);

        DB::beginTransaction();
        try {
            $order = Order::with(['shipping', 'items'])->findOrFail($orderId);
            $returnRequest = ReturnRequest::with('items')->findOrFail($returnRequestId);

            if ($returnRequest->order_id != $orderId) {
                return response()->json(['message' => 'Return request không thuộc order này'], 400);
            }

            $this->validateReturnStatusTransition($returnRequest->status, $validated['status']);
            $this->processReturnStatusChange($order, $returnRequest, $validated['status']);

            DB::commit();

            return response()->json([
                'message' => 'Cập nhật trạng thái thành công!',
                'data' => $this->formatReturnRequest($returnRequest->fresh('items'), $order)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Update return status error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }


    public function approveReturnItem(Request $request, $orderId, $returnRequestId, $itemId)
    {
        $validated = $request->validate(['admin_response' => 'nullable|string|max:500']);

        DB::beginTransaction();
        try {
            // ✅ Load order với items để format
            $order = Order::with('items')->findOrFail($orderId);

            $returnItem = ReturnItem::where('return_request_id', $returnRequestId)->findOrFail($itemId);

            if (!$returnItem->canApprove()) {
                return response()->json(['message' => 'Không thể duyệt sản phẩm ở trạng thái hiện tại'], 400);
            }

            $returnItem->markAsApproved(null, $validated['admin_response'] ?? null);

            $returnRequest = $returnItem->returnRequest;
            $returnRequest->recalculateAmounts();

            $this->autoUpdateReturnRequestStatus($returnRequest);

            DB::commit();

            // ✅ Reload với items để format đầy đủ
            $returnRequest->load('items');

            return response()->json([
                'message' => 'Đã duyệt sản phẩm hoàn hàng!',
                'data' => $this->formatReturnRequest($returnRequest, $order)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Approve return item error: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi duyệt sản phẩm'], 500);
        }
    }



    public function rejectReturnItem(Request $request, $orderId, $returnRequestId, $itemId)
    {
        $validated = $request->validate(['admin_response' => 'required|string|max:500']);

        DB::beginTransaction();
        try {
            // ✅ Load order với items để format
            $order = Order::with('items')->findOrFail($orderId);

            $returnItem = ReturnItem::where('return_request_id', $returnRequestId)->findOrFail($itemId);

            if (!$returnItem->canReject()) {
                return response()->json(['message' => 'Không thể từ chối sản phẩm ở trạng thái hiện tại'], 400);
            }

            $returnItem->markAsRejected($validated['admin_response']);

            $returnRequest = $returnItem->returnRequest;
            $returnRequest->recalculateAmounts();

            $this->autoUpdateReturnRequestStatus($returnRequest);

            DB::commit();

            // ✅ Reload với items để format đầy đủ
            $returnRequest->load('items');

            return response()->json([
                'message' => 'Đã từ chối sản phẩm hoàn hàng!',
                'data' => $this->formatReturnRequest($returnRequest, $order)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reject return item error: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi từ chối sản phẩm'], 500);
        }
    }



    private function autoUpdateReturnRequestStatus($returnRequest)
    {
        if ($returnRequest->status !== 'pending') {
            return;
        }

        $hasPendingItems = $returnRequest->items()
            ->where('status', 'pending')
            ->exists();

        if (!$hasPendingItems) {
            $returnRequest->update([
                'status' => 'approved',
                // ❌ XÓA: 'processed_at' => now(),
            ]);

            $order = $returnRequest->order;
            if ($order && $order->shipping) {
                $oldShippingStatus = $order->shipping->shipping_status;
                $order->shipping->update(['shipping_status' => 'return_processing']);

                ShippingLog::create([
                    'shipping_id' => $order->shipping->id,
                    'old_status' => $oldShippingStatus,
                    'new_status' => 'return_processing',
                ]);
            }
        }
    }

    private function autoCompleteApprovedReturnItems($order)
    {
        $returnRequests = ReturnRequest::where('order_id', $order->id)
            ->whereIn('status', ['approved', 'pending'])
            ->with('items')
            ->get();

        foreach ($returnRequests as $returnRequest) {
            $hasChanges = false;

            foreach ($returnRequest->items as $item) {
                if ($item->status === 'approved') {
                    $item->markAsCompleted();
                    $hasChanges = true;
                }
            }

            if ($hasChanges) {
                $returnRequest->recalculateAmounts();

                $allItemsProcessed = $returnRequest->items()
                    ->whereNotIn('status', ['completed', 'rejected'])
                    ->count() === 0;

                if ($allItemsProcessed && $returnRequest->status !== 'completed') {
                    $actualRefund = $returnRequest->estimated_refund;
                    $returnRequest->markAsCompleted($actualRefund, 'Tự động hoàn thành khi nhận hàng');

                    $this->restoreStock($returnRequest);

                    $this->recalculateOrderAmount($order, $returnRequest);

                    $order->update(['payment_status' => 'refunded']);
                }
            }
        }
    }

    private function recalculateOrderAmount($order, $returnRequest)
    {
        $completedReturnRequests = ReturnRequest::where('order_id', $order->id)
            ->where('status', 'completed')
            ->get();

        $totalRefunded = $completedReturnRequests->sum('actual_refund');

        $remainingItems = $order->items()->get();
        $newTotalAmount = 0;

        foreach ($remainingItems as $orderItem) {
            $returnedQuantity = ReturnItem::whereHas('returnRequest', function ($query) use ($order) {
                $query->where('order_id', $order->id)
                    ->where('status', 'completed');
            })
                ->where('order_item_id', $orderItem->id)
                ->where('status', 'completed')
                ->sum('quantity');

            $remainingQuantity = $orderItem->quantity - $returnedQuantity;

            if ($remainingQuantity > 0) {
                $newTotalAmount += (float) $orderItem->price * $remainingQuantity;
            }
        }

        $shippingFee = 30000;
        $freeShippingThreshold = 500000;
        $newShippingFee = $newTotalAmount >= $freeShippingThreshold ? 0 : $shippingFee;

        $oldTotalAmount = (float) $order->total_amount;
        $oldDiscountAmount = (float) ($order->discount_amount ?? 0);

        $newDiscountAmount = 0;
        if ($oldTotalAmount > 0 && $oldDiscountAmount > 0) {
            $discountRatio = $oldDiscountAmount / ($oldTotalAmount + ($oldTotalAmount >= $freeShippingThreshold ? 0 : $shippingFee));
            $newDiscountAmount = ($newTotalAmount + $newShippingFee) * $discountRatio;
        }

        $newFinalAmount = $newTotalAmount + $newShippingFee - $newDiscountAmount;

        $order->update([
            'total_amount' => $newTotalAmount,
            'discount_amount' => $newDiscountAmount,
            'final_amount' => max(0, $newFinalAmount),
        ]);

        Log::info('Recalculated order amount', [
            'order_id' => $order->id,
            'old_total' => $oldTotalAmount,
            'new_total' => $newTotalAmount,
            'old_final' => $order->getOriginal('final_amount'),
            'new_final' => $newFinalAmount,
            'total_refunded' => $totalRefunded,
        ]);
    }

    private function validateReturnStatusTransition($currentStatus, $newStatus)
    {
        $validTransitions = [
            'pending' => ['approved', 'rejected'],
            'approved' => ['completed'],
            'rejected' => [],
            'completed' => [],
        ];

        if (
            !isset($validTransitions[$currentStatus]) ||
            !in_array($newStatus, $validTransitions[$currentStatus])
        ) {
            throw new \Exception("Không thể chuyển trạng thái từ '{$currentStatus}' sang '{$newStatus}'");
        }
    }

    // ✅ Cập nhật method processReturnStatusChange() trong OrderController.php

    private function processReturnStatusChange($order, $returnRequest, $newStatus)
    {
        switch ($newStatus) {
            case 'approved':
                foreach ($returnRequest->items as $item) {
                    if ($item->status === ReturnItem::STATUS_PENDING) {
                        $item->markAsApproved('Đã duyệt bởi admin');
                    }
                }

                $returnRequest->update(['status' => 'approved']);

                $oldShippingStatus = $order->shipping->shipping_status;
                $order->shipping->update(['shipping_status' => 'return_processing']);

                ShippingLog::create([
                    'shipping_id' => $order->shipping->id,
                    'old_status' => $oldShippingStatus,
                    'new_status' => 'return_processing',
                ]);
                break;

            case 'rejected':
                foreach ($returnRequest->items as $item) {
                    if ($item->status === ReturnItem::STATUS_PENDING) {
                        $item->markAsRejected('Đã từ chối bởi admin');
                    }
                }

                $returnRequest->markAsRejected('Yêu cầu hoàn hàng bị từ chối');

                $order->shipping->update([
                    'shipping_status' => 'return_fail',
                    'reason_admin' => 'Yêu cầu hoàn hàng bị từ chối',
                ]);

                ShippingLog::create([
                    'shipping_id' => $order->shipping->id,
                    'old_status' => 'return_processing',
                    'new_status' => 'return_fail',
                ]);
                break;

            case 'completed':
                $hasPendingItems = $returnRequest->items->contains('status', ReturnItem::STATUS_PENDING);
                if ($hasPendingItems) {
                    throw new \Exception('Không thể hoàn thành khi còn sản phẩm chưa được duyệt');
                }

                foreach ($returnRequest->items as $item) {
                    if ($item->status === ReturnItem::STATUS_APPROVED) {
                        $item->markAsCompleted();
                    }
                }

                // ✅ Lấy estimated_refund thay vì tính toán lại
                $actualRefund = $returnRequest->estimated_refund;
                $returnRequest->markAsCompleted($actualRefund, 'Đã hoàn thành hoàn hàng');

                // ✅ Hoàn lại stock
                $this->restoreStock($returnRequest);

                $order->shipping->update([
                    'shipping_status' => 'returned',
                    'reason_admin' => 'Đã hoàn hàng thành công',
                ]);

                ShippingLog::create([
                    'shipping_id' => $order->shipping->id,
                    'old_status' => 'return_processing',
                    'new_status' => 'returned',
                ]);

                $order->update(['payment_status' => 'refunded']);
                break;
        }

        $returnRequest->recalculateAmounts();
    }

    private function restoreStock($returnRequest)
    {
        // Lấy tất cả return items đã completed
        $completedItems = $returnRequest->items()
            ->where('status', 'completed')
            ->get();

        foreach ($completedItems as $returnItem) {
            try {
                // Tìm variant
                $variant = ProductVariant::find($returnItem->variant_id);

                if (!$variant) {
                    Log::warning('Variant not found for stock restoration', [
                        'return_item_id' => $returnItem->id,
                        'variant_id' => $returnItem->variant_id,
                    ]);
                    continue;
                }

                // Cộng lại số lượng vào stock
                $oldStock = $variant->stock;
                $newStock = $oldStock + $returnItem->quantity;

                $variant->update(['stock' => $newStock]);

                Log::info('Stock restored', [
                    'return_item_id' => $returnItem->id,
                    'variant_id' => $variant->id,
                    'product_name' => $returnItem->product_name,
                    'size' => $returnItem->size,
                    'color' => $returnItem->color,
                    'quantity_returned' => $returnItem->quantity,
                    'old_stock' => $oldStock,
                    'new_stock' => $newStock,
                ]);

            } catch (\Exception $e) {
                Log::error('Error restoring stock', [
                    'return_item_id' => $returnItem->id,
                    'variant_id' => $returnItem->variant_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }


    private function updateShipping($order, $data)
    {
        $shippingData = [];
        $oldStatus = $order->shipping->shipping_status;

        if (isset($data['shipping_status'])) {
            $shippingData['shipping_status'] = $data['shipping_status'];

            // ✅ Khi shipping_status = returned
            if ($data['shipping_status'] === 'returned') {
                // Cập nhật tất cả return requests của order này sang completed
                ReturnRequest::where('order_id', $order->id)
                    ->whereIn('status', ['pending', 'approved'])
                    ->update([
                        'status' => 'completed',
                        // ❌ XÓA: 'processed_at' => now()
                    ]);

                // ⭐ Tự động chuyển payment_status sang refund_processing
                if ($order->payment_status === 'paid') {
                    $order->update(['payment_status' => 'refund_processing']);
                }

                if ($order->shipping_status === 'returned' || $order->payment_method === 'cod') {
                    $order->update(['payment_status' => 'paid']);
                }
            }

            // ✅ Khi shipping_status = received
            if ($data['shipping_status'] === 'received') {
                $shippingData['received_at'] = now();
                $this->autoCompleteApprovedReturnItems($order);
            }
        }

        if (isset($data['reason_admin'])) {
            $shippingData['reason_admin'] = $data['reason_admin'];
        }

        if (isset($data['transfer_image'])) {
            if (empty($data['transfer_image'])) {
                if ($order->shipping && $order->shipping->transfer_image) {
                    $oldImagePath = public_path($order->shipping->transfer_image);
                    if (file_exists($oldImagePath) && is_file($oldImagePath)) {
                        @unlink($oldImagePath);
                    }
                }
                $shippingData['transfer_image'] = null;
            } else {
                $imageUrl = $data['transfer_image'];
                if (Str::startsWith($imageUrl, url('/'))) {
                    $imageUrl = str_replace(url('/'), '', $imageUrl);
                    $imageUrl = ltrim($imageUrl, '/');
                }
                $shippingData['transfer_image'] = $imageUrl;
            }
        }

        if (!empty($shippingData)) {
            $order->shipping->update($shippingData);
        }
    }


    private function updatePayment($order, $data)
    {
        if (!isset($data['payment_status'])) {
            return;
        }

        $order->update(['payment_status' => $data['payment_status']]);

        $latestTransaction = $order->transactions()->latest()->first();
        if ($latestTransaction) {
            $latestTransaction->update(['status' => $data['payment_status']]);
        }
    }

    /**
     * Validate business logic
     */
    private function validateBusinessLogic($order, $data)
    {
        $currentPaymentStatus = $order->payment_status;
        $currentShippingStatus = $order->shipping->shipping_status;
        $paymentMethod = $order->payment_method;

        $newPaymentStatus = $data['payment_status'] ?? $currentPaymentStatus;
        $newShippingStatus = $data['shipping_status'] ?? $currentShippingStatus;

        // Validate shipping status transitions
        $validShippingTransitions = [
            'none' => ['pending'],
            'pending' => ['pending', 'in_transit', 'nodone'],
            'in_transit' => ['in_transit', 'delivered', 'failed'],
            'delivered' => ['delivered', 'nodone', 'received', 'evaluated'],
            'received' => ['received', 'evaluated', 'return_processing'],
            'failed' => ['failed', 'return_processing'],
            'nodone' => ['nodone', 'return_processing'],
            'return_processing' => ['return_processing', 'returned', 'return_fail'],
            'returned' => ['returned'],
            'return_fail' => ['return_fail'],
            'evaluated' => ['evaluated'],
        ];

        if (isset($validShippingTransitions[$currentShippingStatus])) {
            if (!in_array($newShippingStatus, $validShippingTransitions[$currentShippingStatus])) {
                abort(400, "Không thể chuyển trạng thái vận chuyển từ '{$currentShippingStatus}' sang '{$newShippingStatus}'!");
            }
        }

        // Validate payment status transitions
        $validPaymentTransitions = [
            'unpaid' => ['unpaid', 'paid', 'failed'],
            'paid' => ['paid', 'refund_processing'],
            'refund_processing' => ['refund_processing', 'refunded', 'failed'],
            'refunded' => ['refunded'],
            'failed' => ['failed'],
        ];

        if (isset($validPaymentTransitions[$currentPaymentStatus])) {
            if (!in_array($newPaymentStatus, $validPaymentTransitions[$currentPaymentStatus])) {
                abort(400, "Không thể chuyển trạng thái thanh toán từ '{$currentPaymentStatus}' sang '{$newPaymentStatus}'!");
            }
        }

        // Additional business rules
        if ($paymentMethod === 'vnpay' && $newShippingStatus === 'delivered' && $currentPaymentStatus === 'unpaid') {
            abort(400, 'Đơn hàng VNPAY phải được thanh toán trước khi giao hàng!');
        }

        if (
            $newPaymentStatus === 'refund_processing' &&
            !in_array($newShippingStatus, ['return_processing', 'returned'])
        ) {
            abort(400, 'Chỉ có thể hoàn tiền khi đơn hàng đang xử lý hoàn hàng hoặc đã hoàn!');
        }

        if (
            in_array($newShippingStatus, ['return_processing', 'returned', 'return_fail']) &&
            empty($data['reason_admin']) && empty($order->shipping->reason_admin)
        ) {
            abort(400, 'Vui lòng nhập phản hồi admin khi xử lý hoàn hàng!');
        }

        // Prevent shipping status update during refund processing
        if ($order->payment_status === 'refund_processing' && isset($data['shipping_status'])) {
            if (
                !in_array($newShippingStatus, ['return_fail', 'returned']) &&
                $newShippingStatus !== $currentShippingStatus
            ) {
                abort(400, 'Không thể cập nhật trạng thái vận chuyển khi đơn hàng đang xử lý hoàn tiền!');
            }
        }
    }

    // ============================================================
    //                    FORMAT METHODS
    // ============================================================

    private function formatOrderDetails($order)
    {
        return [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'sku' => $order->sku,
            'total_amount' => $order->total_amount,
            'discount_amount' => $order->discount_amount,
            'final_amount' => $order->final_amount,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'note' => $order->note,
            'created_at' => $order->created_at,
            'updated_at' => $order->updated_at,
            'deleted_at' => $order->deleted_at,
            'user' => $this->formatUser($order->user),
            'items' => $order->items->map(fn($item) => $this->formatOrderItem($item)),
            'shipping' => $this->formatShipping($order->shipping),
            'coupon' => $order->coupon ? [
                'id' => $order->coupon->id,
                'code' => $order->coupon->code,
                'discount_type' => $order->coupon->discount_type,
                'discount_value' => $order->coupon->discount_value,
            ] : null,
            'payments' => $order->paymentTransaction,
            'cancel_logs' => $order->cancelLogs,
            'return_requests' => $order->returnRequests->map(fn($req) => $this->formatReturnRequest($req, $order)),
        ];
    }

    private function formatOrderBasic($order)
    {
        return [
            'id' => $order->id,
            'sku' => $order->sku,
            'total_amount' => $order->total_amount,
            'discount_amount' => $order->discount_amount,
            'final_amount' => $order->final_amount,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'shipping' => [
                'id' => $order->shipping->id,
                'shipping_status' => $order->shipping->shipping_status,
                'reason_admin' => $order->shipping->reason_admin,
                'transfer_image' => $this->getImageUrl($order->shipping->transfer_image),
                'received_at' => $order->shipping->received_at,
            ],
        ];
    }

    public function refundShipping(Request $request, $orderId, $returnRequestId)
    {
        DB::beginTransaction();
        try {
            // ✅ Load order với items
            $order = Order::with('items')->findOrFail($orderId);
            $returnRequest = ReturnRequest::with('items')->findOrFail($returnRequestId);

            if ($returnRequest->order_id != $orderId) {
                return response()->json(['message' => 'Return request không thuộc order này'], 400);
            }

            $totalAmount = floatval($order->total_amount);
            if ($totalAmount >= 500000) {
                return response()->json(['message' => 'Đơn hàng >= 500k đã freeship, không được hoàn thêm tiền ship'], 400);
            }

            if ($returnRequest->refund_30k === true) {
                return response()->json(['message' => 'Đã hoàn 30k tiền ship cho yêu cầu này rồi'], 400);
            }

            $currentEstimatedRefund = floatval($returnRequest->estimated_refund);
            $newEstimatedRefund = $currentEstimatedRefund + 30000;

            $returnRequest->update([
                'refund_30k' => true,
                'estimated_refund' => $newEstimatedRefund,
                'admin_note' => ($returnRequest->admin_note ?? '') . "\n✅ Đã hoàn thêm 30.000đ tiền ship.",
            ]);

            DB::commit();

            // ✅ Reload items
            $returnRequest->load('items');

            return response()->json([
                'message' => 'Đã cộng thêm 30.000đ tiền ship thành công!',
                'data' => $this->formatReturnRequest($returnRequest, $order)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Refund shipping error: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi hoàn tiền ship: ' . $e->getMessage()], 500);
        }
    }



    private function formatReturnRequest($request, $order)
    {
        return [
            'id' => $request->id,
            'order_id' => $request->order_id,
            'user_id' => $request->user_id,
            'status' => $request->status,
            'estimated_refund_min' => floatval($request->estimated_refund_min ?? 0),
            'estimated_refund_max' => floatval($request->estimated_refund_max ?? 0),
            'estimated_refund' => floatval($request->estimated_refund ?? 0),
            'admin_note' => $request->admin_note,
            'refund_30k' => $request->refund_30k ?? false,
            'created_at' => $request->created_at,
            'updated_at' => $request->updated_at,
            'items' => $request->items->map(fn($item) => $this->formatReturnItem($item, $order)),
        ];
    }


    private function formatReturnItem($item, $order)
    {
        $orderItem = $order->items->firstWhere('id', $item->order_item_id);

        // ✅ Parse images từ JSON nếu cần
        $images = [];
        if ($item->images) {
            if (is_string($item->images)) {
                $images = json_decode($item->images, true) ?? [];
            } elseif (is_array($item->images)) {
                $images = $item->images;
            }
        }

        // ✅ Convert tất cả images thành full URLs
        $images = array_map(function ($imagePath) {
            if (empty($imagePath)) {
                return null;
            }

            // Nếu đã là full URL thì giữ nguyên
            if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
                return $imagePath;
            }

            // Convert relative path thành full URL
            return asset($imagePath);
        }, $images);

        // ✅ Loại bỏ null values và re-index array
        $images = array_values(array_filter($images));

        return [
            'id' => $item->id,
            'order_item_id' => $item->order_item_id,
            'variant_id' => $item->variant_id,
            'quantity' => $item->quantity,
            'status' => $item->status,
            'reason' => $item->reason,
            'refund_amount' => floatval($item->refund_amount ?? 0),
            'admin_response' => $item->admin_response,

            // Thông tin sản phẩm từ order item
            'product_name' => $orderItem?->product_name,
            'product_image' => $orderItem?->product_image,
            'size' => $orderItem?->size,
            'color' => $orderItem?->color,

            // ✅ Images array với full URLs
            'images' => $images,

            // Timestamps
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ];
    }

    private function formatOrderItem($item)
    {
        return [
            'id' => $item->id,
            'order_id' => $item->order_id,
            'product_id' => $item->product_id,
            'variant_id' => $item->variant_id,
            'product_name' => $item->product_name,
            'product_image' => $item->product_image ? asset($item->product_image) : null,
            'size' => $item->size ?? null,
            'color' => $item->color ?? null,
            'quantity' => $item->quantity,
            'price' => $item->price,
            'total' => (float) $item->price * (int) $item->quantity,
        ];
    }

    private function formatShipping($shipping)
    {
        if (!$shipping)
            return null;

        $addressParts = array_filter([
            $shipping->village,
            $shipping->commune,
            $shipping->district,
            $shipping->city,
            $shipping->notes,
        ]);

        return [
            'id' => $shipping->id,
            'sku' => $shipping->sku,
            'shipping_name' => $shipping->shipping_name,
            'shipping_phone' => $shipping->shipping_phone,
            'shipping_status' => $shipping->shipping_status,
            'city' => $shipping->city,
            'district' => $shipping->district,
            'commune' => $shipping->commune,
            'village' => $shipping->village,
            'notes' => $shipping->notes,
            'shipper_name' => $shipping->shipper_name,
            'shipper_phone' => $shipping->shipper_phone,
            'reason' => $shipping->reason,
            'reason_admin' => $shipping->reason_admin,
            'transfer_image' => $this->getImageUrl($shipping->transfer_image),
            'full_address' => implode(', ', $addressParts),
            'received_at' => $shipping->received_at,
        ];
    }

    private function formatUser($user)
    {
        if (!$user)
            return null;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'bank_account_number' => $user->bank_account_number,
            'bank_name' => $user->bank_name,
            'bank_account_name' => $user->bank_account_name,
        ];
    }

    /**
     * Get image URL helper
     */
    private function getImageUrl($imagePath)
    {
        if (!$imagePath) {
            return null;
        }

        if (Str::startsWith($imagePath, ['http://', 'https://'])) {
            return $imagePath;
        }

        if (Str::startsWith($imagePath, 'storage/')) {
            return asset($imagePath);
        }

        return asset(Storage::url($imagePath));
    }




}
