<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Category};
use Illuminate\Support\Facades\DB;

class HomeClientController extends Controller
{
   public function getAllProducts(Request $request)
{
    $perPage = $request->get('per_page', 9);

    $products = Product::query()
        ->select('id', 'name', 'description', 'category_id', 'image', 'created_at') // ❌ bỏ 'slug'
        ->with([
            'category:id,name',
            'variants.size:id,value',
            'variants.color:id,value',
        ])
        ->orderByDesc('created_at')
        ->paginate($perPage);

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

        if ($product->image) {
            if (strpos($product->image, 'storage/') === 0) {
                $product->image_url = asset($product->image);
            } else {
                $product->image_url = asset('storage/' . $product->image);
            }
        } else {
            $product->image_url = null;
        }

        return $product;
    });

    return response()->json([
        'products' => $products,
    ]);
}

public function getProductDetail($id)
{
    $product = Product::query()
        ->with([
            'category:id,name',
            'variants.size:id,value',
            'variants.color:id,value',
        ])
        ->where('id', $id)
        ->first(); // ❌ bỏ orWhere('slug', $id)

    if (!$product) {
        return response()->json([
            'message' => 'Sản phẩm không tồn tại.',
        ], 404);
    }

    $product->variants->map(function ($v) {
        $v->final_price = ($v->discount_price && $v->discount_price < $v->price)
            ? $v->discount_price
            : $v->price;
        return $v;
    });

    if ($product->image) {
        if (strpos($product->image, 'storage/') === 0) {
            $product->image_url = asset($product->image);
        } else {
            $product->image_url = asset('storage/' . $product->image);
        }
    } else {
        $product->image_url = null;
    }

    return response()->json([
        'product' => $product,
    ]);
}

}
