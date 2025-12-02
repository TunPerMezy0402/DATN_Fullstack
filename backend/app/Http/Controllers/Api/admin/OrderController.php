<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Shipping;
use App\Models\ShippingLog;
use App\Models\ReturnRequest;
use App\Models\ReturnItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * 📋 Danh sách đơn hàng
     */
    public function index(Request $request)
    {
        $query = Order::with(['user:id,name,phone,email', 'items', 'shipping', 'coupon'])
            ->orderByDesc('created_at');

        $orders = $query->paginate(10);

        $stats = [
            'total_orders' => Order::count(),
            'total_revenue' => Order::where('payment_status', 'paid')->sum('final_amount'),
            'unpaid_orders' => Order::where('payment_status', 'unpaid')->count(),
            'refunded_orders' => Order::where('payment_status', 'refunded')->count(),
        ];

        return response()->json([
            'data' => $orders,
            'stats' => $stats,
        ]);
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
                'returnRequests.items', // ✅ Load return requests với items
            ])
            ->findOrFail($id);

        $shipping = $order->shipping;
        $shippingData = null;
        $fullAddress = null;

        if ($shipping) {
            $addressParts = array_filter([
                $shipping->village,
                $shipping->commune,
                $shipping->district,
                $shipping->city,
                $shipping->notes,
            ]);

            $fullAddress = implode(', ', $addressParts);
            $transferImageUrl = $this->getImageUrl($shipping->transfer_image);

            $shippingData = [
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
                'transfer_image' => $transferImageUrl,
                'full_address' => $fullAddress,
                'received_at' => $shipping->received_at,
            ];
        }

        $items = $order->items->map(function ($item) {
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
        });

        // ✅ Format return requests
        $returnRequests = $order->returnRequests->map(function ($request) use ($order) {
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
                'items' => $request->items->map(function ($item) use ($order) {
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
                }),
            ];
        });

        return response()->json([
            'data' => [
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
                'user' => $order->user ? [
                    'id' => $order->user->id,
                    'name' => $order->user->name,
                    'phone' => $order->user->phone,
                    'email' => $order->user->email,
                    'bank_account_number' => $order->user->bank_account_number,
                    'bank_name' => $order->user->bank_name,
                    'bank_account_name' => $order->user->bank_account_name,
                ] : null,
                'items' => $items,
                'shipping' => $shippingData,
                'coupon' => $order->coupon ? [
                    'id' => $order->coupon->id,
                    'code' => $order->coupon->code,
                    'discount_type' => $order->coupon->discount_type,
                    'discount_value' => $order->coupon->discount_value,
                ] : null,
                'payments' => $order->paymentTransaction,
                'cancel_logs' => $order->cancelLogs,
                'return_requests' => $returnRequests, // ✅ Đã format đầy đủ
            ]
        ]);
    }

    // ============================================================
    //              🔄 RETURN REQUEST MANAGEMENT
    // ============================================================

    /**
     * 📋 Danh sách yêu cầu hoàn hàng của order
     */
    public function returnRequests($id)
    {
        try {
            $order = Order::with('items')->find($id);

            if (!$order) {
                return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
            }

            $returnRequests = ReturnRequest::where('order_id', $id)
                ->with(['items'])
                ->orderBy('requested_at', 'desc') // ✅ SỬA: requested_at thay vì created_at
                ->get()
                ->map(function ($request) use ($order) {
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
                        'items' => $request->items->map(function ($item) use ($order) {
                            $orderItem = $order->items->firstWhere('id', $item->order_item_id);
                            return [
                                'id' => $item->id,
                                'order_item_id' => $item->order_item_id,
                                'variant_id' => $item->variant_id,
                                'quantity' => $item->quantity,
                                'status' => $item->status,
                                'reason' => $item->reason,
                                'refund_amount' => floatval($item->refund_amount),
                                'admin_response' => $item->admin_response, // ✅ THÊM
                                'product_name' => $orderItem?->product_name,
                                'product_image' => $orderItem?->product_image,
                                'size' => $orderItem?->size,
                                'color' => $orderItem?->color,
                            ];
                        }),
                    ];
                });

            return response()->json([
                'message' => 'Danh sách yêu cầu hoàn hàng',
                'data' => $returnRequests
            ], 200);

        } catch (\Exception $e) {
            Log::error('Return requests error (Admin): ' . $e->getMessage());
            return response()->json([
                'message' => 'Lỗi khi lấy danh sách hoàn hàng',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * ✅ Duyệt yêu cầu hoàn hàng (Admin approve)
     */
    public function approveReturn(Request $request, $orderId, $returnRequestId)
    {
        $validated = $request->validate([
            'admin_note' => 'nullable|string|max:1000',
            'actual_refund' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $order = Order::with(['shipping', 'items'])->findOrFail($orderId);
            $returnRequest = ReturnRequest::with('items')->findOrFail($returnRequestId);

            if ($returnRequest->order_id != $orderId) {
                return response()->json(['message' => 'Return request không thuộc order này'], 400);
            }

            if (!$returnRequest->canComplete()) {
                return response()->json([
                    'message' => 'Không thể duyệt yêu cầu ở trạng thái hiện tại'
                ], 400);
            }

            // Update return request status
            $actualRefund = $validated['actual_refund'] ?? $returnRequest->estimated_refund;
            $returnRequest->markAsCompleted($actualRefund, $validated['admin_note'] ?? null);

            // Update all return items to completed
            foreach ($returnRequest->items as $item) {
                $item->markAsCompleted();
            }

            // Restore stock
            $returnRequest->restoreStock();

            // Update shipping status to returned
            $order->shipping->update([
                'shipping_status' => 'returned',
                'reason_admin' => $validated['admin_note'] ?? $order->shipping->reason_admin,
            ]);

            // Create shipping log
            ShippingLog::create([
                'shipping_id' => $order->shipping->id,
                'old_status' => $order->shipping->shipping_status,
                'new_status' => 'returned',
            ]);

            // Update payment status to refunded
            $order->update(['payment_status' => 'refunded']);

            DB::commit();

            return response()->json([
                'message' => 'Đã duyệt yêu cầu hoàn hàng thành công!',
                'data' => $returnRequest->fresh(['items'])
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Approve return error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Lỗi khi duyệt hoàn hàng',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * ❌ Từ chối yêu cầu hoàn hàng (Admin reject)
     */
    public function rejectReturn(Request $request, $orderId, $returnRequestId)
    {
        $validated = $request->validate([
            'admin_note' => 'required|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $order = Order::with(['shipping'])->findOrFail($orderId);
            $returnRequest = ReturnRequest::with('items')->findOrFail($returnRequestId);

            if ($returnRequest->order_id != $orderId) {
                return response()->json(['message' => 'Return request không thuộc order này'], 400);
            }

            if (!$returnRequest->canReject()) {
                return response()->json([
                    'message' => 'Không thể từ chối yêu cầu ở trạng thái hiện tại'
                ], 400);
            }

            // Update return request status
            $returnRequest->markAsRejected($validated['admin_note']);

            // Update all return items to rejected
            foreach ($returnRequest->items as $item) {
                $item->markAsRejected($validated['admin_note']);
            }

            // Update shipping status to return_fail
            $order->shipping->update([
                'shipping_status' => 'return_fail',
                'reason_admin' => $validated['admin_note'],
            ]);

            // Create shipping log
            ShippingLog::create([
                'shipping_id' => $order->shipping->id,
                'old_status' => 'return_processing',
                'new_status' => 'return_fail',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Đã từ chối yêu cầu hoàn hàng!',
                'data' => $returnRequest->fresh(['items'])
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reject return error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Lỗi khi từ chối hoàn hàng',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    // ============================================================
    //                   EXISTING METHODS
    // ============================================================

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
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy file ảnh'
                ], 400);
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
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
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

        // 🚫 KIỂM TRA: Không cho cập nhật shipping_status khi payment_status = refund_processing
        if ($order->payment_status === 'refund_processing' && isset($data['shipping_status'])) {
            $newShippingStatus = $data['shipping_status'];
            $currentShippingStatus = $order->shipping->shipping_status;
            
            if (!in_array($newShippingStatus, ['return_fail', 'returned']) && $newShippingStatus !== $currentShippingStatus) {
                abort(400, 'Không thể cập nhật trạng thái vận chuyển khi đơn hàng đang xử lý hoàn tiền!');
            }
        }

        $this->validateBusinessLogic($order, $data);

        $shippingData = [];
        $orderData = [];
        $oldShippingStatus = $order->shipping->shipping_status;

        if (isset($data['shipping_status'])) {
            $newShippingStatus = $data['shipping_status'];
            $shippingData['shipping_status'] = $newShippingStatus;

            if ($newShippingStatus === 'delivered' && $order->payment_method === 'cod') {
                $orderData['payment_status'] = 'paid';
            }

            if ($newShippingStatus === 'received') {
                $shippingData['received_at'] = now(); // ✅ Set received_at
            }

            if ($newShippingStatus === 'returned' && $order->payment_status !== 'refund_processing') {
                $orderData['payment_status'] = 'refund_processing';
            }
        }

        if (isset($data['payment_status'])) {
            $orderData['payment_status'] = $data['payment_status'];
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

        DB::beginTransaction();
        try {
            if (!empty($shippingData) && $order->shipping) {
                if (isset($shippingData['shipping_status']) && $shippingData['shipping_status'] !== $oldShippingStatus) {
                    ShippingLog::create([
                        'shipping_id' => $order->shipping->id,
                        'old_status' => $oldShippingStatus,
                        'new_status' => $shippingData['shipping_status'],
                    ]);
                }

                $order->shipping->update($shippingData);
            }

            if (!empty($orderData)) {
                $order->update($orderData);

                $latestTransaction = $order->transactions()->latest()->first();
                if ($latestTransaction && isset($orderData['payment_status'])) {
                    $latestTransaction->update(['status' => $orderData['payment_status']]);
                }
            }

            DB::commit();

            $order->load(['shipping', 'transactions', 'latestTransaction']);
            $transferImageUrl = $this->getImageUrl($order->shipping?->transfer_image);

            return response()->json([
                'message' => 'Cập nhật đơn hàng thành công',
                'data' => [
                    'id' => $order->id,
                    'sku' => $order->sku,
                    'payment_status' => $order->payment_status,
                    'payment_method' => $order->payment_method,
                    'shipping' => [
                        'id' => $order->shipping->id,
                        'shipping_status' => $order->shipping->shipping_status,
                        'reason_admin' => $order->shipping->reason_admin,
                        'transfer_image' => $transferImageUrl,
                        'received_at' => $order->shipping->received_at,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order update error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * 🔒 Validation logic nghiệp vụ
     */
    protected function validateBusinessLogic($order, $data)
    {
        $currentPaymentStatus = $order->payment_status;
        $currentShippingStatus = $order->shipping->shipping_status;
        $paymentMethod = $order->payment_method;

        $newPaymentStatus = $data['payment_status'] ?? $currentPaymentStatus;
        $newShippingStatus = $data['shipping_status'] ?? $currentShippingStatus;

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

        if (
            $paymentMethod === 'vnpay' &&
            $newShippingStatus === 'delivered' &&
            $currentPaymentStatus === 'unpaid'
        ) {
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
            empty($data['reason_admin']) &&
            empty($order->shipping->reason_admin)
        ) {
            abort(400, 'Vui lòng nhập phản hồi admin khi xử lý hoàn hàng!');
        }
    }

    /**
     * 🖼️ Helper function - Format image URL
     */
    protected function getImageUrl($imagePath)
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

    /**
     * 📋 Lấy lịch sử vận chuyển (Admin version)
     */
    public function shippingLogs($id)
    {
        try {
            $order = Order::with('shipping')->find($id);

            if (!$order || !$order->shipping) {
                return response()->json([
                    'message' => 'Không tìm thấy thông tin vận chuyển',
                    'data' => []
                ], 200);
            }

            $logs = DB::table('shipping_logs')
                ->where('shipping_id', $order->shipping->id)
                ->select('id', 'old_status', 'new_status', 'created_at')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'message' => 'Lịch sử vận chuyển',
                'data' => $logs
            ], 200);

        } catch (\Exception $e) {
            Log::error('Shipping logs error (Admin): ' . $e->getMessage());
            return response()->json([
                'message' => 'Không thể lấy lịch sử vận chuyển',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}