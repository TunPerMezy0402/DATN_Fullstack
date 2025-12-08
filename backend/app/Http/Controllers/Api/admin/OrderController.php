<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\{Order, ReturnRequest, ReturnItem, ShippingLog, ProductVariant};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Log, Storage};
use Illuminate\Support\Str;

class OrderController extends Controller
{
    // ============================================================
    //                      ORDER MANAGEMENT
    // ============================================================

    /**
     * 📋 Danh sách đơn hàng
     */
    public function index(Request $request)
    {
        $orders = Order::with(['user:id,name,phone,email', 'items', 'shipping', 'coupon'])
            ->orderByDesc('created_at')
            ->paginate(10);

        $stats = [
            'total_orders' => Order::count(),
            'total_revenue' => Order::where('payment_status', 'paid')->sum('final_amount'),
            'unpaid_orders' => Order::where('payment_status', 'unpaid')->count(),
            'refunded_orders' => Order::where('payment_status', 'refunded')->count(),
        ];

        return response()->json(['data' => $orders, 'stats' => $stats]);
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

    /**
     * ✏️ Cập nhật đơn hàng
     */
    public function update(Request $request, $id)
    {
        $order = Order::with(['shipping', 'transactions'])->findOrFail($id);

        $data = $request->validate([
            'shipping_status' => 'nullable|string|in:pending,in_transit,delivered,failed,returned,none,nodone,evaluated,return_processing,return_fail,received',
            'payment_status' => 'nullable|string|in:unpaid,paid,refunded,refund_processing,failed',
            'reason_admin' => 'nullable|string',
            'transfer_image' => 'nullable|string',
        ]);

        $this->validateBusinessLogic($order, $data);

        DB::beginTransaction();
        try {
            $this->updateShipping($order, $data);
            $this->updatePayment($order, $data);

            DB::commit();

            return response()->json([
                'message' => 'Cập nhật đơn hàng thành công',
                'data' => $this->formatOrderBasic($order->fresh(['shipping', 'transactions']))
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order update error: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi cập nhật đơn hàng'], 500);
        }
    }

    /**
     * 🖼️ Upload ảnh chuyển khoản
     */
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

    /**
     * 📋 Lịch sử vận chuyển
     */
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

    // ============================================================
    //                   RETURN REQUEST MANAGEMENT
    // ============================================================

    /**
     * 📋 Danh sách yêu cầu hoàn hàng
     */
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

    /**
     * 🔄 Cập nhật trạng thái return request
     */
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
            $returnItem = ReturnItem::where('return_request_id', $returnRequestId)->findOrFail($itemId);

            if (!$returnItem->canApprove()) {
                return response()->json(['message' => 'Không thể duyệt sản phẩm ở trạng thái hiện tại'], 400);
            }

            $returnItem->markAsApproved($validated['admin_response'] ?? null);

            $returnRequest = $returnItem->returnRequest;
            $returnRequest->recalculateAmounts();

            // ✅ Tự động chuyển return_request sang 'approved' nếu không còn item pending
            $this->autoUpdateReturnRequestStatus($returnRequest);

            DB::commit();

            return response()->json([
                'message' => 'Đã duyệt sản phẩm hoàn hàng!',
                'data' => $returnRequest->fresh('items')
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
            $returnItem = ReturnItem::where('return_request_id', $returnRequestId)->findOrFail($itemId);

            if (!$returnItem->canReject()) {
                return response()->json(['message' => 'Không thể từ chối sản phẩm ở trạng thái hiện tại'], 400);
            }

            $returnItem->markAsRejected($validated['admin_response']);

            $returnRequest = $returnItem->returnRequest;
            $returnRequest->recalculateAmounts();

            // ✅ Tự động chuyển return_request sang 'approved' nếu không còn item pending
            $this->autoUpdateReturnRequestStatus($returnRequest);

            DB::commit();

            return response()->json([
                'message' => 'Đã từ chối sản phẩm hoàn hàng!',
                'data' => $returnRequest->fresh('items')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reject return item error: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi từ chối sản phẩm'], 500);
        }
    }

    // ============================================================
    //                      HELPER METHODS
    // ============================================================

    /**
     * ✅ Tự động cập nhật trạng thái return_request sang 'approved' 
     * khi tất cả items không còn pending
     */
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
                'processed_at' => now(),
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

                    // ✅ Hoàn lại stock
                    $this->restoreStock($returnRequest);

                    // ✅ Tính lại giá trị đơn hàng sau khi hoàn hàng thành công
                    $this->recalculateOrderAmount($order, $returnRequest);

                    $order->update(['payment_status' => 'refunded']);
                }
            }
        }
    }

    private function recalculateOrderAmount($order, $returnRequest)
    {
        // Lấy tất cả các return requests đã hoàn thành của đơn hàng này
        $completedReturnRequests = ReturnRequest::where('order_id', $order->id)
            ->where('status', 'completed')
            ->get();

        // Tính tổng số tiền thực tế đã hoàn
        $totalRefunded = $completedReturnRequests->sum('actual_refund');

        // Tính lại total_amount dựa trên các sản phẩm còn lại
        $remainingItems = $order->items()->get();
        $newTotalAmount = 0;

        foreach ($remainingItems as $orderItem) {
            // Tính số lượng đã hoàn của item này
            $returnedQuantity = ReturnItem::whereHas('returnRequest', function ($query) use ($order) {
                $query->where('order_id', $order->id)
                    ->where('status', 'completed');
            })
                ->where('order_item_id', $orderItem->id)
                ->where('status', 'completed')
                ->sum('quantity');

            // Số lượng còn lại
            $remainingQuantity = $orderItem->quantity - $returnedQuantity;

            if ($remainingQuantity > 0) {
                $newTotalAmount += (float) $orderItem->price * $remainingQuantity;
            }
        }

        // Tính phí ship mới
        $shippingFee = 30000;
        $freeShippingThreshold = 500000;
        $newShippingFee = $newTotalAmount >= $freeShippingThreshold ? 0 : $shippingFee;

        // Tính discount mới (giữ nguyên tỷ lệ discount nếu có)
        $oldTotalAmount = (float) $order->total_amount;
        $oldDiscountAmount = (float) ($order->discount_amount ?? 0);

        $newDiscountAmount = 0;
        if ($oldTotalAmount > 0 && $oldDiscountAmount > 0) {
            // Tính tỷ lệ discount
            $discountRatio = $oldDiscountAmount / ($oldTotalAmount + ($oldTotalAmount >= $freeShippingThreshold ? 0 : $shippingFee));
            $newDiscountAmount = ($newTotalAmount + $newShippingFee) * $discountRatio;
        }

        // Tính final_amount mới
        $newFinalAmount = $newTotalAmount + $newShippingFee - $newDiscountAmount;

        // Cập nhật order
        $order->update([
            'total_amount' => $newTotalAmount,
            'discount_amount' => $newDiscountAmount,
            'final_amount' => max(0, $newFinalAmount), // Không cho phép âm
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

                $actualRefund = $returnRequest->estimated_refund;
                $returnRequest->markAsCompleted($actualRefund, 'Đã hoàn thành hoàn hàng');

                // ✅ Hoàn lại stock
                $this->restoreStock($returnRequest);

                // ✅ Tính lại giá trị đơn hàng sau khi hoàn hàng thành công
                $this->recalculateOrderAmount($order, $returnRequest);

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

        if (isset($data['shipping_status']) && $data['shipping_status'] === 'returned') {
            // Cập nhật tất cả return requests của order này sang completed
            ReturnRequest::where('order_id', $order->id)
                ->whereIn('status', ['pending', 'approved']) // Chỉ update những status hợp lý
                ->update([
                    'status' => 'completed',
                    'processed_at' => now()
                ]);

            // ⭐ Tự động chuyển payment_status sang refund_processing khi shipping_status = returned
            if ($order->payment_status === 'paid') {
                $order->update(['payment_status' => 'refund_processing']);
            }
        }

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

    private function formatReturnRequest($request, $order)
    {
        return [
            'id' => $request->id,
            'status' => $request->status,
            'requested_at' => $request->requested_at,
            'processed_at' => $request->processed_at,
            'rejected_at' => $request->rejected_at,
            'total_return_amount' => floatval($request->total_return_amount),
            'refunded_discount' => floatval($request->refunded_discount),
            'old_shipping_fee' => floatval($request->old_shipping_fee),
            'new_shipping_fee' => floatval($request->new_shipping_fee),
            'shipping_diff' => floatval($request->shipping_diff),
            'estimated_refund' => floatval($request->estimated_refund),
            'actual_refund' => floatval($request->actual_refund),
            'remaining_amount' => floatval($request->remaining_amount),
            'note' => $request->note,
            'admin_note' => $request->admin_note,
            'items' => $request->items->map(fn($item) => $this->formatReturnItem($item, $order)),
        ];
    }

    private function formatReturnItem($item, $order)
    {
        $orderItem = $order->items->firstWhere('id', $item->order_item_id);
        return [
            'id' => $item->id,
            'order_item_id' => $item->order_item_id,
            'variant_id' => $item->variant_id,
            'quantity' => $item->quantity,
            'status' => $item->status,
            'reason' => $item->reason,
            'refund_amount' => floatval($item->refund_amount),
            'admin_response' => $item->admin_response,
            'product_name' => $orderItem?->product_name,
            'product_image' => $orderItem?->product_image,
            'size' => $orderItem?->size,
            'color' => $orderItem?->color,
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
