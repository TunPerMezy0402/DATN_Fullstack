<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\{Cart, CartItem, ProductVariant};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CartClientController extends Controller
{
    /**
     * 🛒 Lấy giỏ hàng của user
     */
    public function index()
    {
        $cart = Cart::firstOrCreate(['user_id' => Auth::id()]);

        // Load tất cả quan hệ cần thiết cho frontend
        $cart->load([
            'items.variant.product:id,name,image',
            'items.variant.color:id,type,value',
            'items.variant.size:id,type,value',
        ]);

        return response()->json($cart);
    }

    /**
     * ➕ Thêm sản phẩm vào giỏ hàng
     */
    public function add(Request $request)
    {
        $data = $request->validate([
            'variant_id' => 'required|exists:product_variants,id',
            'quantity'   => 'required|integer|min:1',
        ]);

        $cart = Cart::firstOrCreate(['user_id' => Auth::id()]);

        $item = $cart->items()->where('variant_id', $data['variant_id'])->first();

        if ($item) {
            // Nếu có rồi thì tăng số lượng
            $item->increment('quantity', $data['quantity']);
        } else {
            // Nếu chưa có thì tạo mới
            $item = $cart->items()->create([
                'variant_id' => $data['variant_id'],
                'quantity'   => $data['quantity'],
            ]);
        }

        // Load lại variant đầy đủ thông tin
        $item->load([
            'variant.product:id,name,image',
            'variant.color:id,type,value',
            'variant.size:id,type,value',
        ]);

        return response()->json([
            'message' => 'Đã thêm sản phẩm vào giỏ hàng',
            'item'    => $item,
        ]);
    }

    /**
     * ✏️ Cập nhật số lượng sản phẩm trong giỏ
     */
    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $cart = Cart::where('user_id', Auth::id())->firstOrFail();
        $item = $cart->items()->where('id', $id)->firstOrFail();

        $item->update(['quantity' => $data['quantity']]);

        $item->load([
            'variant.product:id,name,image',
            'variant.color:id,type,value',
            'variant.size:id,type,value',
        ]);

        return response()->json([
            'message' => 'Đã cập nhật số lượng sản phẩm',
            'item'    => $item,
        ]);
    }


    public function remove($id)
    {
        $cart = Cart::where('user_id', Auth::id())->firstOrFail();
        $item = $cart->items()->where('id', $id)->first();

        if (!$item) {
            return response()->json(['message' => 'Sản phẩm không tồn tại trong giỏ hàng'], 404);
        }

        $item->delete();

        return response()->json(['message' => 'Đã xóa sản phẩm khỏi giỏ hàng']);
    }

    /**
     * 🧹 Xóa toàn bộ giỏ hàng
     */
    public function clear()
    {
        $cart = Cart::where('user_id', Auth::id())->firstOrFail();
        $cart->items()->delete();

        return response()->json(['message' => 'Đã xóa toàn bộ giỏ hàng']);
    }
}
