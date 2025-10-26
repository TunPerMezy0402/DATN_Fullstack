<?php

namespace App\Http\Controllers\Api\client;

use App\Http\Controllers\Controller;
use App\Models\{Order, OrderItem, Cart};
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderClientController extends Controller
{
    // Đặt hàng từ giỏ
    public function store()
    {
        $user = Auth::user();
        $cart = Cart::where('user_id', $user->id)->with('items.variant')->first();

        if (!$cart || $cart->items->isEmpty()) {
            return response()->json(['message' => 'Giỏ hàng trống'], 400);
        }

        DB::beginTransaction();

        try {
            $order = Order::create([
                'user_id' => $user->id,
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

            return response()->json(['message' => 'Đặt hàng thành công', 'order' => $order->load('items.variant')]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Đặt hàng thất bại', 'detail' => $e->getMessage()], 500);
        }
    }

    // Danh sách đơn hàng của user
    public function index()
    {
        $orders = Order::where('user_id', Auth::id())
            ->with('items.variant')
            ->latest()
            ->get();

        return response()->json($orders);
    }

    // Chi tiết 1 đơn hàng
    public function show($id)
    {
        $order = Order::where('user_id', Auth::id())
            ->with('items.variant')
            ->findOrFail($id);

        return response()->json($order);
    }
}
