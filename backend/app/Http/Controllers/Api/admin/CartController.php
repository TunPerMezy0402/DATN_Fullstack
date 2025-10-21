<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\Cart;
use Illuminate\Http\Request;

class CartController extends Controller
{
    /**
     * Danh sách carts
     */
    public function index()
    {
        $carts = Cart::with('user')->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $carts
        ]);
    }

    /**
     * Chi tiết cart
     */
    public function show($id)
    {
        $cart = Cart::with('user')->find($id);

        if (!$cart) {
            return response()->json([
                'status' => false,
                'message' => 'Cart not found'
            ], 404);
        }

        return response()->json([
            'status' => true,
            'data' => $cart
        ]);
    }

    /**
     * Tạo cart
     */
    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
        ]);

        $cart = Cart::create([
            'user_id' => $request->user_id,
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Cart created successfully',
            'data' => $cart
        ], 201);
    }

    /**
     * Cập nhật cart
     */
    public function update(Request $request, $id)
    {
        $cart = Cart::find($id);

        if (!$cart) {
            return response()->json([
                'status' => false,
                'message' => 'Cart not found'
            ], 404);
        }

        $cart->update([
            'updated_at' => now()
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Cart updated successfully',
            'data' => $cart
        ]);
    }

    /**
     * Xóa cart
     */
    public function destroy($id)
    {
        $cart = Cart::find($id);

        if (!$cart) {
            return response()->json([
                'status' => false,
                'message' => 'Cart not found'
            ], 404);
        }

        $cart->delete();

        return response()->json([
            'status' => true,
            'message' => 'Cart deleted successfully'
        ]);
    }
}
