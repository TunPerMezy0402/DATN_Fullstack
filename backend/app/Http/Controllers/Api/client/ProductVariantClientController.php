<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class ProductVariantClientController extends Controller
{
    /**
     * GET /client/variants
     * - Public list, mặc định chỉ trả các biến thể đang bán (is_available = 1)
     * - Hỗ trợ lọc theo product_id, size_id, color_id, khoảng giá
     * - Có phân trang
     */
    public function index(Request $req)
    {
        $q = ProductVariant::query()
            ->with([
                'product:id,name,category_id,image,brand,origin,variation_status',
                'size:id,value',
                'color:id,value',
            ])
            ->where('is_available', $req->boolean('available', true)) // default: chỉ đang bán
            ->orderByDesc('updated_at');

        if ($pid = $req->query('product_id')) {
            $q->where('product_id', $pid);
        }
        if ($sizeId = $req->query('size_id')) {
            $q->where('size_id', $sizeId);
        }
        if ($colorId = $req->query('color_id')) {
            $q->where('color_id', $colorId);
        }
        // khoảng giá (min_price, max_price) là số
        if ($min = $req->query('min_price')) {
            $q->where('price', '>=', (float)$min);
        }
        if ($max = $req->query('max_price')) {
            $q->where('price', '<=', (float)$max);
        }
        // search theo SKU
        if ($s = $req->query('search')) {
            $q->where('sku', 'like', "%{$s}%");
        }

        $perPage = $req->integer('per_page', 20);
        $page = $q->paginate($perPage);

        // Chuẩn hoá URL ảnh & album images
        $page->getCollection()->transform(function ($v) {
            return $this->transformVariant($v);
        });

        return response()->json($page);
    }

    /**
     * GET /client/variants/{id}
     * - Public detail một biến thể
     */
    public function show($id)
    {
        $v = ProductVariant::query()
            ->with([
                'product:id,name,category_id,image,brand,origin,variation_status,price,discount_price,stock_quantity',
                'size:id,value',
                'color:id,value',
            ])
            ->findOrFail($id);

        return response()->json(['data' => $this->transformVariant($v)]);
    }

    /**
     * GET /client/products/{product_id}/variants
     * - Danh sách biến thể theo product, thường dùng cho trang chi tiết SP
     */
    public function byProduct($productId, Request $req)
    {
        $q = ProductVariant::query()
            ->where('product_id', $productId)
            ->with(['size:id,value','color:id,value'])
            ->when($req->has('available'), fn($qq) => $qq->where('is_available', $req->boolean('available', true)))
            ->orderBy('id');

        $variants = $q->get()->map(fn($v) => $this->transformVariant($v));
        return response()->json(['data' => $variants]);
    }

    /** ------- Helpers ------- */

    protected function transformVariant($v)
    {
        // ảnh cover tuyệt đối
        $v->image_url = $v->image
            ? (str_starts_with($v->image, 'storage/')
                ? asset($v->image)
                : asset('storage/' . ltrim($v->image, '/')))
            : null;

        // chuẩn hoá images => array absolute URLs
        $images = [];
        try {
            if (is_string($v->images) && $v->images !== '') {
                $arr = json_decode($v->images, true);
                if (!is_array($arr)) {
                    $arr = array_filter(array_map('trim', explode(',', $v->images)));
                }
                $images = $arr;
            } elseif (is_array($v->images)) {
                $images = $v->images;
            }
        } catch (\Throwable $e) {
            $images = [];
        }

        $v->images = collect($images)
            ->filter()
            ->map(function ($u) {
                $u = (string)$u;
                if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) return $u;
                return str_starts_with($u, 'storage/')
                    ? asset($u)
                    : asset('storage/' . ltrim($u, '/'));
            })
            ->values()
            ->all();

        // gọn size/color
        $v->size_value  = $v->size->value  ?? null;
        $v->color_value = $v->color->value ?? null;

        return $v;
    }
}
