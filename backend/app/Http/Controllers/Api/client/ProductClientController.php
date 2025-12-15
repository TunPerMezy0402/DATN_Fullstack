<?php

namespace App\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Category, Attribute};

class ProductClientController extends Controller
{
    /**
     * 🛍️ Lấy tất cả sản phẩm (có phân trang) với filters HOÀN CHỈNH
     * ✅ TẤT CẢ FILTERS Ở BACKEND trước khi phân trang
     */
    public function getAllProducts(Request $request)
    {
        // Load categories (không phân trang)
        $categories = Category::select('id', 'name', 'image')
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        // Query products
        $query = Product::query()
            ->select('id', 'name', 'sku', 'description', 'category_id', 'brand', 'origin', 'image', 'images', 'created_at')
            ->with([
                'category:id,name',
                'variants' => function($q) {
                    $q->whereNull('deleted_at')
                      ->select('id', 'product_id', 'size_id', 'color_id', 'price', 'discount_price', 'stock_quantity', 'is_available');
                },
                'variants.size:id,value',
                'variants.color:id,value',
            ])
            ->whereNull('deleted_at');

        // ✅ Filter by search (name or SKU)
        if ($search = $request->get('search')) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // ✅ Filter by category
        if ($categoryId = $request->get('category_id')) {
            $query->where('category_id', $categoryId);
        }

        // ✅ Filter by brand
        if ($brand = $request->get('brand')) {
            $query->where('brand', $brand);
        }

        // ✅ Filter by sizes
        if ($sizes = $request->get('sizes')) {
            $sizeArray = is_array($sizes) ? $sizes : explode(',', $sizes);
            
            // Lấy IDs của sizes từ bảng attributes
            $sizeIds = Attribute::where('type', 'size')
                ->whereIn('value', $sizeArray)
                ->pluck('id')
                ->toArray();

            if (!empty($sizeIds)) {
                $query->whereHas('variants', function($q) use ($sizeIds) {
                    $q->whereIn('size_id', $sizeIds);
                });
            }
        }

        // ✅ Filter by colors
        if ($colors = $request->get('colors')) {
            $colorArray = is_array($colors) ? $colors : explode(',', $colors);
            
            // Lấy IDs của colors từ bảng attributes
            $colorIds = Attribute::where('type', 'color')
                ->whereIn('value', $colorArray)
                ->pluck('id')
                ->toArray();

            if (!empty($colorIds)) {
                $query->whereHas('variants', function($q) use ($colorIds) {
                    $q->whereIn('color_id', $colorIds);
                });
            }
        }

        // ✅ Filter by availability (selling status)
        if ($request->get('status') === 'selling') {
            $query->whereHas('variants', function($q) {
                $q->where('is_available', true);
            });
        }

        // ✅ Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');

        if ($sortBy === 'created_at' || $sortBy === 'name') {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Get all matching products BEFORE pagination (for price filter)
        $allProducts = $query->get();

        // Transform để tính giá
        $allProducts->transform(function ($product) {
            // Lấy biến thể giá thấp nhất
            $variant = $product->variants
                ->map(function ($v) {
                    $v->original_price = $v->price;
                    $v->final_price = ($v->discount_price && $v->discount_price < $v->price)
                        ? $v->discount_price
                        : $v->price;
                    return $v;
                })
                ->sortBy('final_price')
                ->first();

            $product->min_effective_price = $variant ? $variant->final_price : null;
            $product->min_original_price = $variant ? $variant->original_price : null;

            return $product;
        });

        // ✅ Filter by price range AFTER calculating prices
        $priceMin = $request->get('price_min');
        $priceMax = $request->get('price_max');
        
        if ($priceMin !== null || $priceMax !== null) {
            $allProducts = $allProducts->filter(function($product) use ($priceMin, $priceMax) {
                $price = $product->min_effective_price;
                
                if ($price === null) {
                    return false;
                }
                
                if ($priceMin !== null && $price < $priceMin) {
                    return false;
                }
                
                if ($priceMax !== null && $price > $priceMax) {
                    return false;
                }
                
                return true;
            })->values();
        }

        // ✅ Manual pagination
        $perPage = (int) $request->get('per_page', 12);
        $currentPage = (int) $request->get('page', 1);
        $total = $allProducts->count();
        
        $offset = ($currentPage - 1) * $perPage;
        $paginatedProducts = $allProducts->slice($offset, $perPage)->values();

        // Final transform cho response
        $paginatedProducts->transform(function ($product) {
            // Xử lý hình ảnh chính sản phẩm
            $product->image_url = $product->image
                ? asset(str_starts_with($product->image, 'storage/') ? $product->image : 'storage/' . $product->image)
                : null;

            // Xử lý danh sách hình ảnh sản phẩm
            $product->images_list = [];
            if (!empty($product->images)) {
                $imgs = is_string($product->images) ? json_decode($product->images, true) : $product->images;
                if (is_array($imgs)) {
                    $product->images_list = collect($imgs)->map(fn($i) =>
                        asset(str_starts_with($i, 'storage/') ? $i : 'storage/' . $i)
                    )->toArray();
                }
            }

            // Export sizes và colors cho FE
            $product->sizes = $product->variants->pluck('size.value')->filter()->unique()->values();
            $product->colors = $product->variants->pluck('color.value')->filter()->unique()->values();

            // Thêm min_variant
            $product->min_variant = $product->variants
                ->map(function ($v) {
                    $v->original_price = $v->price;
                    $v->final_price = ($v->discount_price && $v->discount_price < $v->price)
                        ? $v->discount_price
                        : $v->price;
                    return $v;
                })
                ->sortBy('final_price')
                ->first();

            return $product;
        });

        // Build pagination response (giống Laravel paginate)
        $lastPage = (int) ceil($total / $perPage);

        return response()->json([
            'categories' => $categories,
            'products' => [
                'current_page' => $currentPage,
                'data' => $paginatedProducts,
                'first_page_url' => url()->current() . '?page=1',
                'from' => $offset + 1,
                'last_page' => $lastPage,
                'last_page_url' => url()->current() . '?page=' . $lastPage,
                'next_page_url' => $currentPage < $lastPage ? url()->current() . '?page=' . ($currentPage + 1) : null,
                'path' => url()->current(),
                'per_page' => $perPage,
                'prev_page_url' => $currentPage > 1 ? url()->current() . '?page=' . ($currentPage - 1) : null,
                'to' => min($offset + $perPage, $total),
                'total' => $total,
            ],
        ]);
    }

/**
 * 📦 Lấy chi tiết 1 sản phẩm theo ID hoặc SKU
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
                    'price',
                    'discount_price',
                    'quantity_sold',  // ✅ QUAN TRỌNG
                    'stock_quantity',
                    'is_available',
                    'image',          // ✅ Thêm image của variant
                    'images'          // ✅ Thêm images của variant
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

    // ✅ Tính tổng quantity_sold của TẤT CẢ variants
    $totalQuantitySold = $product->variants->sum('quantity_sold');

    // Tính toán giá cuối cùng cho từng variant
    $product->variants->map(function ($v) {
        $v->original_price = $v->price;
        $v->final_price = ($v->discount_price && $v->discount_price < $v->price)
            ? $v->discount_price
            : $v->price;
        
        // ✅ Đảm bảo quantity_sold không null
        $v->quantity_sold = $v->quantity_sold ?? 0;
        
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

    // Danh sách hình ảnh sản phẩm
    $product->images_list = [];
    if (!empty($product->images)) {
        $imgs = is_string($product->images) ? json_decode($product->images, true) : $product->images;
        if (is_array($imgs)) {
            $product->images_list = collect($imgs)->map(fn($i) =>
                asset(str_starts_with($i, 'storage/') ? $i : 'storage/' . $i)
            )->toArray();
        }
    }

    // Thông tin bổ sung
    $product->brand = $product->brand ?? null;
    $product->origin = $product->origin ?? null;
    $product->total_variants = $product->variants->count();
    $product->total_quantity_sold = $totalQuantitySold; // ✅ THÊM TỔNG ĐÃ BÁN

    // Lấy danh sách sizes và colors từ variants
    $product->sizes = $product->variants->pluck('size.value')->filter()->unique()->values();
    $product->colors = $product->variants->pluck('color.value')->filter()->unique()->values();

    // ✅ Transform variants để thêm image URLs
    $product->variants->transform(function ($variant) {
        // Xử lý hình ảnh của variant
        if ($variant->image) {
            $variant->image_url = asset(str_starts_with($variant->image, 'storage/') 
                ? $variant->image 
                : 'storage/' . $variant->image);
        }

        // Xử lý danh sách hình ảnh của variant
        $variant->images_list = [];
        if (!empty($variant->images)) {
            $imgs = is_string($variant->images) ? json_decode($variant->images, true) : $variant->images;
            if (is_array($imgs)) {
                $variant->images_list = collect($imgs)->map(fn($i) =>
                    asset(str_starts_with($i, 'storage/') ? $i : 'storage/' . $i)
                )->toArray();
            }
        }

        return $variant;
    });

    return response()->json([
        'product' => $product,
    ]);
}

    /**
     * 🔍 API lấy danh sách brands động
     */
    public function getBrands(Request $request)
    {
        $brands = Product::whereNull('deleted_at')
            ->whereNotNull('brand')
            ->where('brand', '!=', '')
            ->distinct()
            ->pluck('brand')
            ->sort()
            ->values();

        return response()->json([
            'brands' => $brands,
        ]);
    }

    /**
     * 🎨 API lấy danh sách sizes động
     */
    public function getSizes(Request $request)
    {
        $sizes = Attribute::where('type', 'size')
            ->whereNull('deleted_at')
            ->orderBy('value')
            ->pluck('value')
            ->values();

        return response()->json([
            'sizes' => $sizes,
        ]);
    }

    /**
     * 🎨 API lấy danh sách colors động
     */
    public function getColors(Request $request)
    {
        $colors = Attribute::where('type', 'color')
            ->whereNull('deleted_at')
            ->orderBy('value')
            ->pluck('value')
            ->values();

        return response()->json([
            'colors' => $colors,
        ]);
    }
}