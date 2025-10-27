<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Shipping;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Danh sách đơn hàng
     */
    public function index(Request $request)
    {
        $query = Order::with(['items', 'shipping', 'coupon'])
            ->orderByDesc('created_at');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate(10));
    }

    /**
     * Danh sách đã xóa
     */
    public function trash()
    {
        $orders = Order::onlyTrashed()
            ->with(['items', 'shipping'])
            ->orderByDesc('deleted_at')
            ->paginate(10);

        return response()->json($orders);
    }

 /**
 * Xem chi tiết đơn hàng (đầy đủ thông tin)
 */
public function show($id)
{
    $order = Order::withTrashed()
        ->with([
            'items',                 // chi tiết sản phẩm đã mua
            'shipping',              // đơn vị vận chuyển
            'coupon',                // mã giảm giá
            'paymentTransactions',   // thanh toán
            'cancelLogs',            // lịch sử hủy
            'returnRequests'         // yêu cầu trả hàng
        ])
        ->findOrFail($id);

    return response()->json([
        'order' => [
            'id' => $order->id,
            'sku' => $order->sku,
            'user_id' => $order->user_id,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'total_amount' => $order->total_amount,
            'discount_amount' => $order->discount_amount,
            'final_amount' => $order->final_amount,
            'note' => $order->note,
            'created_at' => $order->created_at,
            'updated_at' => $order->updated_at,
        ],
        'coupon' => $order->coupon,
        'items' => $order->items->map(function ($item) {
            return [
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'product_image' => $item->product_image,
                'variant_id' => $item->variant_id,
                'size' => $item->size,
                'color' => $item->color,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'subtotal' => $item->quantity * $item->price,
            ];
        }),
        'shipping' => $order->shipping ? [
            'shipping_name' => $order->shipping->shipping_name,
            'shipping_phone' => $order->shipping->shipping_phone,
            'shipping_address_line' => $order->shipping->shipping_address_line,
            'shipping_city' => $order->shipping->shipping_city,
            'shipping_province' => $order->shipping->shipping_province,
            'shipping_postal_code' => $order->shipping->shipping_postal_code,
            'carrier' => $order->shipping->carrier,
            'tracking_number' => $order->shipping->tracking_number,
            'shipping_status' => $order->shipping->shipping_status,
            'estimated_delivery' => $order->shipping->estimated_delivery,
            'delivered_at' => $order->shipping->delivered_at,
        ] : null,
        'payments' => $order->paymentTransactions,
        'cancel_logs' => $order->cancelLogs,
        'return_requests' => $order->returnRequests,
    ]);
}

    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'status' => 'nullable|in:pending,confirmed,shipped,delivered,completed,cancelled,returned',
            'payment_status' => 'nullable|in:unpaid,paid,refunded,failed',
            'shipping' => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            // Cập nhật trạng thái đơn hàng
            $order->update(array_filter([
                'status' => $validated['status'] ?? $order->status,
                'payment_status' => $validated['payment_status'] ?? $order->payment_status,
            ]));

            // Nếu có thông tin shipping → thêm hoặc cập nhật
            if (!empty($validated['shipping'])) {
                $shippingData = $validated['shipping'];

                $shipping = Shipping::firstOrNew(['order_id' => $order->id]);
                $shipping->fill([
                    'shipping_name' => $shippingData['shipping_name'] ?? $shipping->shipping_name,
                    'shipping_phone' => $shippingData['shipping_phone'] ?? $shipping->shipping_phone,
                    'shipping_address_line' => $shippingData['shipping_address_line'] ?? $shipping->shipping_address_line,
                    'shipping_city' => $shippingData['shipping_city'] ?? $shipping->shipping_city,
                    'shipping_province' => $shippingData['shipping_province'] ?? $shipping->shipping_province,
                    'shipping_postal_code' => $shippingData['shipping_postal_code'] ?? $shipping->shipping_postal_code,
                    'carrier' => $shippingData['carrier'] ?? $shipping->carrier,
                    'tracking_number' => $shippingData['tracking_number'] ?? $shipping->tracking_number,
                    'shipping_status' => $shippingData['shipping_status'] ?? $shipping->shipping_status,
                    'estimated_delivery' => $shippingData['estimated_delivery'] ?? $shipping->estimated_delivery,
                ]);
                $shipping->save();
            }

            DB::commit();

            return response()->json([
                'message' => 'Cập nhật đơn hàng thành công',
                'order' => $order->load('shipping')
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Xóa mềm
     */
    public function destroy($id)
    {
        $order = Order::findOrFail($id);
        $order->delete();

        return response()->json(['message' => 'Đã xóa đơn hàng (soft delete) thành công']);
    }

    /**
     * Khôi phục
     */
    public function restore($id)
    {
        $order = Order::onlyTrashed()->findOrFail($id);
        $order->restore();

        return response()->json(['message' => 'Khôi phục đơn hàng thành công']);
    }

    /**
     * Xóa vĩnh viễn
     */
    public function forceDelete($id)
    {
        $order = Order::onlyTrashed()->findOrFail($id);
        $order->forceDelete();

        return response()->json(['message' => 'Đã xóa vĩnh viễn đơn hàng']);
    }
}
