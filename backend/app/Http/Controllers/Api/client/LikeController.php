<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Product;

class LikeController extends Controller
{
    // Người dùng nhấn thích sản phẩm
    public function like(Request $request, $productId)
    {
        $user = $request->user();
        $product = Product::findOrFail($productId);

        if (!$user->likedProducts()->where('product_id', $productId)->exists()) {
            $user->likedProducts()->attach($productId, ['liked_at' => now()]);
        }

        return response()->json(['message' => 'Đã thích sản phẩm.']);
    }

    // Người dùng bỏ thích sản phẩm
    public function unlike(Request $request, $productId)
    {
        $user = $request->user();
        $product = Product::findOrFail($productId);

        $user->likedProducts()->detach($productId);

        return response()->json(['message' => 'Đã bỏ thích sản phẩm.']);
    }

    // Kiểm tra user đã thích sản phẩm chưa
    public function isLiked(Request $request, $productId)
    {
        $user = $request->user();
        $liked = $user->likedProducts()->where('product_id', $productId)->exists();

        return response()->json(['liked' => $liked]);
    }

    // Lấy danh sách sản phẩm đã thích
    public function likedProducts(Request $request)
    {
        $user = $request->user();
        $likedProducts = $user->likedProducts()
            ->with('category')
            ->orderBy('user_likes.liked_at', 'desc')
            ->paginate(10);

        return response()->json($likedProducts);
    }
}
