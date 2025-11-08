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
    public function index(Request $request)
{
    // 🔹 Lấy danh sách đơn hàng (kèm user, items, shipping, coupon)
    $query = Order::with(['user:id,name,phone,email', 'items', 'shipping', 'coupon'])
        ->orderByDesc('created_at');

    // Lọc theo trạng thái đơn hàng nếu có
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }

    // 🔹 Phân trang
    $orders = $query->paginate(10);

    // 🔹 Thống kê tổng hợp
    $stats = [
        'total_orders' => Order::count(),
        'total_revenue' => Order::where('payment_status', 'paid')->sum('final_amount'),
        'pending_orders' => Order::where('status', 'pending')->count(),
        'confirmed_orders' => Order::where('status', 'confirmed')->count(),
        'shipped_orders' => Order::where('status', 'shipped')->count(),
        'delivered_orders' => Order::where('status', 'delivered')->count(),
        'cancelled_orders' => Order::where('status', 'cancelled')->count(),
        'returned_orders' => Order::where('status', 'returned')->count(),
        'unpaid_orders' => Order::where('payment_status', 'unpaid')->count(),
        'refunded_orders' => Order::where('payment_status', 'refunded')->count(),
    ];

    // 🔹 Trả về JSON gồm danh sách và thống kê
    return response()->json([
        'data' => $orders,
        'stats' => $stats,
    ]);
}
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
            'returnRequests',
        ])
        ->findOrFail($id);

    // 🔹 Thông tin giao hàng
    $shipping = $order->shipping;
    $shippingData = null;
    $fullAddress = null;

    if ($shipping) {
        // Ghép địa chỉ đầy đủ: "Số 9, Phường Cửa Đông, Quận Hoàn Kiếm, Thành phố Hà Nội"
        $addressParts = array_filter([
            $shipping->village,   // Số nhà / thôn
            $shipping->commune,   // Phường / xã
            $shipping->district,  // Quận / huyện
            $shipping->city,  
            $shipping->notes,      // Tỉnh / thành phố
        ]);

        $fullAddress = implode(', ', $addressParts);

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
            'full_address' => $fullAddress,
        ];
    }

    // 🔹 Danh sách sản phẩm trong đơn
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
            'total' => (float)$item->price * (int)$item->quantity,
        ];
    });

    // 🔹 Trả về JSON chi tiết đơn hàng
    return response()->json([
        'data' => [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'sku' => $order->sku,
            'total_amount' => $order->total_amount,
            'discount_amount' => $order->discount_amount,
            'final_amount' => $order->final_amount,
            'status' => $order->status,
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
            'return_requests' => $order->returnRequests,
        ]
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
            $order->update(array_filter([
                'status' => $validated['status'] ?? $order->status,
                'payment_status' => $validated['payment_status'] ?? $order->payment_status,
            ]));

            if (!empty($validated['shipping'])) {
                $shippingData = $validated['shipping'];

                $shipping = Shipping::firstOrNew(['order_id' => $order->id]);
                $shipping->fill([
                    'shipping_status' => $shippingData['shipping_status'] ?? $shipping->shipping_status,
                    'shipper_name' => $shippingData['shipper_name'] ?? $shipping->shipper_name,
                    'shipper_phone' => $shippingData['shipper_phone'] ?? $shipping->shipper_phone,

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
}
