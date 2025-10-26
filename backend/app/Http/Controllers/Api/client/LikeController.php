<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Models\Product;

class LikeController extends Controller
{
    // Người dùng nhấn thích
    public function like(Request $request, $productId)
    {
        $user = $request->user();
        $product = Product::findOrFail($productId);

        // Kiểm tra đã thích chưa
        if (!$user->likedProducts()->where('product_id', $productId)->exists()) {
            $user->likedProducts()->attach($productId);
        }

        return response()->json(['message' => 'Đã thích sản phẩm.']);
    }

    // Người dùng bỏ thích
    public function unlike(Request $request, $productId)
    {
        $user = $request->user();
        $product = Product::findOrFail($productId);

        $user->likedProducts()->detach($productId);

        return response()->json(['message' => 'Đã bỏ thích sản phẩm.']);
    }

    // Kiểm tra user có thích sản phẩm chưa
    public function isLiked(Request $request, $productId)
    {
        $user = $request->user();
        $liked = $user->likedProducts()->where('product_id', $productId)->exists();

        return response()->json(['liked' => $liked]);
    }

    public function likedProducts(Request $request)
{
    $user = $request->user();

    // Lấy danh sách sản phẩm user đã thích
    $likedProducts = $user->likedProducts()
        ->with('category') // nếu bạn có quan hệ category
        ->orderBy('user_likes.liked_at', 'desc') // sắp xếp theo thời gian thích
        ->paginate(10); // phân trang

    return response()->json($likedProducts);
}

}
