<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Category};
use Illuminate\Support\Facades\DB;

class ProductClientController extends Controller
{
public function index()
{
    // Lấy danh mục đơn giản
    $categories = Category::select('id', 'name', 'image')
        ->whereNull('deleted_at')
        ->orderBy('name')
        ->get()
        ->map(function ($category) {
            $category->image_url = $category->image
                ? asset('storage/' . $category->image)
                : null;
            return $category;
        });

    // Lấy sản phẩm với variant đơn giản
    $products = Product::with(['category:id,name', 'variants'])
        ->whereNull('deleted_at')
        ->orderByDesc('created_at')
        ->get()
        ->map(function ($product) {
            // Chỉ giữ những trường cần thiết
            return [
                'id'       => $product->id,
                'name'     => $product->name,
                'category' => $product->category,
                'variants' => $product->variants,
            ];
        });

    return response()->json([
        'categories' => $categories,
        'products'   => $products,
    ]);
}


}
