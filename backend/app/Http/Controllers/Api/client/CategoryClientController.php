<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Category};

class CategoryClientController extends Controller
{
    /**
     * 📚 Lấy tất cả danh mục và mỗi danh mục hiển thị tối đa 10 sản phẩm
     */
    public function getCategoriesWithProducts()
    {
        // 1️⃣ Lấy danh mục
        $categories = Category::select('id', 'name', 'image')
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        // 2️⃣ Lặp qua từng danh mục, lấy 10 sản phẩm mới nhất của danh mục đó
        $categoriesWithProducts = $categories->map(function ($category) {
            $products = Product::query()
                ->select('id', 'name', 'sku', 'description', 'category_id', 'image', 'created_at')
                ->where('category_id', $category->id)
                ->with([
                    'variants' => function ($q) {
                        $q->select('id', 'product_id', 'price', 'discount_price', 'size_id', 'color_id')
                            ->with([
                                'size:id,value',
                                'color:id,value',
                            ]);
                    },
                ])
                ->orderByDesc('created_at')
                ->limit(10)
                ->get();

            // Chuẩn hóa dữ liệu sản phẩm
            $products->transform(function ($product) {
                $variant = $product->variants
                    ->map(function ($v) {
                        $v->final_price = ($v->discount_price && $v->discount_price < $v->price)
                            ? $v->discount_price
                            : $v->price;
                        return $v;
                    })
                    ->sortBy('final_price')
                    ->first();

                $product->min_variant = $variant;
                $product->min_effective_price = $variant ? $variant->final_price : null;

                // Ảnh sản phẩm
                if ($product->image) {
                    $product->image_url = str_starts_with($product->image, 'storage/')
                        ? asset($product->image)
                        : asset('storage/' . $product->image);
                } else {
                    $product->image_url = asset('images/no-image.png');
                }

                return $product;
            });

            // Ảnh danh mục
            $category->image_url = $category->image
                ? (str_starts_with($category->image, 'storage/')
                    ? asset($category->image)
                    : asset('storage/' . $category->image))
                : asset('images/no-category.png');

            // Gán sản phẩm vào danh mục
            $category->products = $products;

            return $category;
        });

        // 6️⃣ Trả về JSON
        return response()->json([
            'data' => $categoriesWithProducts,
        ]);
    }

    /**
     * 🧩 Lấy chi tiết 1 danh mục và sản phẩm của nó (phân trang 9 sản phẩm / trang)
     * Endpoint: GET /api/categories/{id}/products?page=1
     */
    public function getCategoryProducts(Request $request, $id)
    {
        // 1️⃣ Tìm danh mục
        $category = Category::select('id', 'name', 'image')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$category) {
            return response()->json([
                'message' => 'Không tìm thấy danh mục.',
            ], 404);
        }

        // 2️⃣ Lấy danh sách sản phẩm (phân trang 9 sản phẩm/trang)
        $products = Product::query()
            ->select('id', 'name', 'sku', 'description', 'category_id', 'image', 'created_at')
            ->where('category_id', $id)
            ->with([
                'variants' => function ($q) {
                    $q->select('id', 'product_id', 'price', 'discount_price', 'size_id', 'color_id')
                        ->with([
                            'size:id,value',
                            'color:id,value',
                        ]);
                },
            ])
            ->orderByDesc('created_at')
            ->paginate(9);

        // 3️⃣ Chuẩn hóa từng sản phẩm trong trang hiện tại
        $products->getCollection()->transform(function ($product) {
            $variant = $product->variants
                ->map(function ($v) {
                    $v->final_price = ($v->discount_price && $v->discount_price < $v->price)
                        ? $v->discount_price
                        : $v->price;
                    return $v;
                })
                ->sortBy('final_price')
                ->first();

            $product->min_variant = $variant;
            $product->min_effective_price = $variant ? $variant->final_price : null;

            // Ảnh sản phẩm
            if ($product->image) {
                $product->image_url = str_starts_with($product->image, 'storage/')
                    ? asset($product->image)
                    : asset('storage/' . $product->image);
            } else {
                $product->image_url = asset('images/no-image.png');
            }

            return $product;
        });

        // 4️⃣ Ảnh danh mục
        $category->image_url = $category->image
            ? (str_starts_with($category->image, 'storage/')
                ? asset($category->image)
                : asset('storage/' . $category->image))
            : asset('images/no-category.png');

        // 5️⃣ Trả về JSON
        return response()->json([
            'category' => $category,
            'products' => $products,
        ]);
    }
}
