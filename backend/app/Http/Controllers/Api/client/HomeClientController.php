<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Category};
use Illuminate\Support\Facades\DB;

class HomeClientController extends Controller
{
    public function index()
    {
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

        $products = Product::query()
            ->with([
                'category:id,name',
                'variants.size:id,value',
                'variants.color:id,value',
            ])
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(function ($product) {
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
