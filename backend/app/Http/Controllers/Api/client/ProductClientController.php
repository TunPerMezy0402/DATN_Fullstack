<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Category, Attribute};
use Illuminate\Support\Facades\DB;

class ProductClientController extends Controller
{
    /**
     * 🛍️ Lấy danh sách sản phẩm (có phân trang)
     * + Bao gồm biến thể (size, color) và danh mục
     */
    public function getAllProducts(Request $request)
    {
        // 1️⃣ Lấy danh mục
        $categories = Category::select('id', 'name', 'image')
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        // 2️⃣ Lấy danh sách các thuộc tính (size, color)
        $sizes = Attribute::sizes()->select('id', 'value')->orderBy('value')->get();
        $colors = Attribute::colors()->select('id', 'value')->orderBy('value')->get();

        // 3️⃣ Phân trang sản phẩm
        $perPage = $request->get('per_page', 9);

        // 4️⃣ Lấy danh sách sản phẩm cùng các quan hệ
        $products = Product::query()
            ->select('id', 'name', 'sku', 'description', 'category_id', 'image', 'created_at')
            ->with([
                'category:id,name',
                'variants' => function ($q) {
                    $q->select('id', 'product_id', 'price', 'discount_price', 'size_id', 'color_id')
                        ->with([
                            'size:id,value',
                            'color:id,value',
                        ]);
                },
            ])
            ->orderByDesc('created_at')
            ->paginate($perPage);

        // 5️⃣ Chuẩn hóa dữ liệu mỗi sản phẩm
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

            // Xử lý ảnh
            if ($product->image) {
                $product->image_url = strpos($product->image, 'storage/') === 0
                    ? asset($product->image)
                    : asset('storage/' . $product->image);
            } else {
                $product->image_url = null;
            }

            return $product;
        });

        // 6️⃣ Trả về JSON
        return response()->json([
            'categories' => $categories,
            'attributes' => [
                'sizes' => $sizes,
                'colors' => $colors,
            ],
            'products' => $products,
        ]);
    }

    /**
     * 📦 Lấy chi tiết sản phẩm theo ID hoặc slug
     */
   // app/Http/Controllers/Api/Client/ProductClientController.php

public function getProductDetail($id)
{
    $product = Product::query()
        ->with([
            'category:id,name',
            'variants' => function ($q) {
                $q->select([
                    'id','product_id',
                    'image','images',
                    'sku',
                    'price','discount_price',
                    'stock_quantity','is_available',   // 👈 THÊM 2 CỘT NÀY
                    'size_id','color_id'
                ])->with([
                    'size:id,value',
                    'color:id,value',
                ]);
            },
        ])
        ->where('id', $id)
        ->first();

    if (!$product) {
        return response()->json(['message' => 'Sản phẩm không tồn tại.'], 404);
    }

    // Chuẩn hoá ảnh cover
    $product->image_url = $product->image
        ? (str_starts_with($product->image, 'storage/')
            ? asset($product->image)
            : asset('storage/' . $product->image))
        : null;

    return response()->json(['product' => $product]);
}

}
