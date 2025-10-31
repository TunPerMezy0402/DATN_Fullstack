<?php

namespace App\Http\Controllers\Api\client;

use App\Http\Controllers\Controller;
use App\Models\{Cart, CartItem, ProductVariant};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CartClientController extends Controller
{
    // Lấy giỏ hàng của user
    public function index()
    {
        $cart = Cart::firstOrCreate(['user_id' => Auth::id()]);
        $cart->load('items.variant');
        return response()->json($cart);
    }

    // Thêm sản phẩm vào giỏ hàng
    public function add(Request $request)
    {
        $data = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity' => 'required|integer|min:1'
        ]);

        $cart = Cart::firstOrCreate(['user_id' => Auth::id()]);

        $item = $cart->items()->where('product_variant_id', $data['product_variant_id'])->first();

        if ($item) {
            $item->increment('quantity', $data['quantity']);
        } else {
            $item = $cart->items()->create($data);
        }

        return response()->json(['message' => 'Đã thêm vào giỏ hàng', 'item' => $item->load('variant')]);
    }

    // Cập nhật số lượng sản phẩm
    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'quantity' => 'required|integer|min:1'
        ]);

        $cart = Cart::where('user_id', Auth::id())->firstOrFail();
        $item = $cart->items()->where('id', $id)->firstOrFail();

        $item->update(['quantity' => $data['quantity']]);

        return response()->json(['message' => 'Đã cập nhật số lượng', 'item' => $item]);
    }

    // Xóa sản phẩm khỏi giỏ
    public function remove($id)
    {
        $cart = Cart::where('user_id', Auth::id())->firstOrFail();
        $cart->items()->where('id', $id)->delete();
        return response()->json(['message' => 'Đã xóa sản phẩm khỏi giỏ hàng']);
    }

    // Xóa toàn bộ giỏ hàng
    public function clear()
    {
        $cart = Cart::where('user_id', Auth::id())->firstOrFail();
        $cart->items()->delete();
        return response()->json(['message' => 'Đã xóa toàn bộ giỏ hàng']);
    }
}
