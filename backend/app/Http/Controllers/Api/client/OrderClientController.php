<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\{Order, OrderItem, Cart, User};
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class OrderClientController extends Controller
{
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

    public function show(Request $request, $id)
    {
        $userId = $request->input('user_id');

        if (!$userId || !User::find($userId)) {
            return response()->json(['message' => 'Người dùng không hợp lệ'], 401);
        }

        $order = Order::where('user_id', $userId)
            ->with('items.variant.product')
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
     * 🛒 Đặt hàng mới từ giỏ hàng
     */
    public function store(Request $request)
    {
        $userId = $request->input('user_id');

        if (!$userId || !User::find($userId)) {
            return response()->json(['message' => 'Người dùng không hợp lệ'], 401);
        }

        $cart = Cart::where('user_id', $userId)
            ->with('items.variant')
            ->first();

        if (!$cart || $cart->items->isEmpty()) {
            return response()->json(['message' => 'Giỏ hàng của bạn đang trống'], 400);
        }

        DB::beginTransaction();

        try {
            $order = Order::create([
                'user_id' => $userId,
                'status' => 'pending',
                'total_price' => 0,
            ]);

            $total = 0;

            foreach ($cart->items as $item) {
                $price = $item->variant->price ?? 0;
                $total += $price * $item->quantity;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => $item->quantity,
                    'price' => $price,
                ]);
            }

            $order->update(['total_price' => $total]);
            $cart->items()->delete();

            DB::commit();

            return response()->json([
                'message' => 'Đặt hàng thành công',
                'data' => $order->load('items.variant.product')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Đặt hàng thất bại',
                'detail' => $e->getMessage()
            ], 500);
        }
    }
}
