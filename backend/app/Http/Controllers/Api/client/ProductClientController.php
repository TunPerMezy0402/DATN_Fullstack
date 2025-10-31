<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Category};

class ProductClientController extends Controller
{
    /**
     * 🛍️ Lấy tất cả sản phẩm (có phân trang) với biến thể giá thấp nhất
     */
    public function getAllProducts(Request $request)
    {
        $categories = Category::select('id', 'name', 'image')
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        $perPage = $request->get('per_page', 9);

        $products = Product::query()
            ->select('id', 'name', 'sku', 'description', 'category_id', 'image', 'created_at')
            ->with([
                'category:id,name',
                'variants.size:id,value',
                'variants.color:id,value',
            ])
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $products->getCollection()->transform(function ($product) {
            // Lấy biến thể giá thấp nhất
            $variant = $product->variants
                ->map(function ($v) {
                    // Giá gốc và giá cuối cùng
                    $v->original_price = $v->price;
                    $v->final_price = ($v->discount_price && $v->discount_price < $v->price)
                        ? $v->discount_price
                        : $v->price;
                    return $v;
                })
                ->sortBy('final_price')
                ->first();

            $product->min_variant = $variant;
            $product->min_effective_price = $variant ? $variant->final_price : null;
            $product->min_original_price = $variant ? $variant->original_price : null;

            // Xử lý hình ảnh sản phẩm
            $product->image_url = $product->image
                ? asset(str_starts_with($product->image, 'storage/') ? $product->image : 'storage/' . $product->image)
                : null;

            return $product;
        });

        return response()->json([
            'categories' => $categories,
            'products' => $products,
        ]);
    }

    /**
     * 📦 Lấy chi tiết 1 sản phẩm theo ID hoặc SKU, biến thể giá thấp nhất
     */
    public function getProductDetail($id)
    {
        $product = Product::query()
            ->with([
                'category:id,name',
                'variants' => function ($q) {
                    $q->select(
                        'id',
                        'product_id',
                        'size_id',
                        'color_id',
                        'sku',
                        'image',
                        'images',
                        'price',
                        'discount_price',
                        'quantity_sold',
                        'stock_quantity',
                        'is_available'
                    )
                    ->whereNull('deleted_at')
                    ->with(['size:id,value', 'color:id,value']);
                },
            ])
            ->where(function ($q) use ($id) {
                $q->where('id', $id)
                  ->orWhere('sku', $id);
            })
            ->whereNull('deleted_at')
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Sản phẩm không tồn tại.'], 404);
        }

        // Tính toán giá cuối cùng và chuẩn hóa hình ảnh cho từng variant
        $product->variants->map(function ($v) {
            $v->original_price = $v->price;
            $v->final_price = ($v->discount_price && $v->discount_price < $v->price)
                ? $v->discount_price
                : $v->price;

            // Hình ảnh chính variant
            $v->image_url = $v->image
                ? asset(str_starts_with($v->image, 'storage/') ? $v->image : 'storage/' . $v->image)
                : null;

            // Danh sách ảnh thêm
            $v->images_list = [];
            if (!empty($v->images)) {
                $imgs = is_string($v->images) ? json_decode($v->images, true) : $v->images;
                if (is_array($imgs)) {
                    $v->images_list = collect($imgs)->map(fn($i) =>
                        asset(str_starts_with($i, 'storage/') ? $i : 'storage/' . $i)
                    );
                }
            }
            return $v;
        });

        // Lấy biến thể có giá thấp nhất
        $minVariant = $product->variants->sortBy('final_price')->first();
        $product->min_variant = $minVariant;
        $product->min_effective_price = $minVariant ? $minVariant->final_price : null;
        $product->min_original_price = $minVariant ? $minVariant->original_price : null;

        // Hình ảnh chính sản phẩm
        $product->image_url = $product->image
            ? asset(str_starts_with($product->image, 'storage/') ? $product->image : 'storage/' . $product->image)
            : null;

        // Thông tin bổ sung
        $product->brand = $product->brand ?? null;
        $product->origin = $product->origin ?? null;
        $product->total_variants = $product->variants->count();

        return response()->json([
            'product' => $product,
        ]);
    }
}
