<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Category};
use Illuminate\Support\Facades\DB;

class ProductClientController extends Controller
{
    public function index(Request $request)
    {
        // --- Nhận tham số lọc ---
        $minPrice   = $request->input('min_price');
        $maxPrice   = $request->input('max_price');
        $size       = $request->input('size');
        $color      = $request->input('color');
        $categoryId = $request->input('category_id');
        $search     = $request->input('search');

        // 🟢 Lấy danh mục có ảnh
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

        // 🟢 Query sản phẩm
        $query = Product::query()
            ->with([
                'category:id,name',
                'variants.size:id,value',
                'variants.color:id,value',
            ])
            ->whereNull('deleted_at');

        // 🔍 Tìm theo tên sản phẩm
        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        // 🔍 Lọc theo danh mục
        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        // 🔍 Lọc theo giá, size, color thông qua bảng variant
        if ($minPrice || $maxPrice || $size || $color) {
            $query->whereHas('variants', function ($q) use ($minPrice, $maxPrice, $size, $color) {
                if ($minPrice) {
                    $q->where(function ($q2) use ($minPrice) {
                        $q2->where('price', '>=', $minPrice)
                           ->orWhere('discount_price', '>=', $minPrice);
                    });
                }
                if ($maxPrice) {
                    $q->where(function ($q2) use ($maxPrice) {
                        $q2->where('price', '<=', $maxPrice)
                           ->orWhere('discount_price', '<=', $maxPrice);
                    });
                }
                if ($size) {
                    $q->whereHas('size', fn($qs) => $qs->where('value', $size));
                }
                if ($color) {
                    $q->whereHas('color', fn($qc) => $qc->where('value', $color));
                }
            });
        }

        $products = $query->orderByDesc('created_at')->get();

        $products = $products->map(function ($product) {
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

            return $product;
        });

        return response()->json([
            'categories' => $categories,
            'products'   => $products,
        ]);
    }
}
