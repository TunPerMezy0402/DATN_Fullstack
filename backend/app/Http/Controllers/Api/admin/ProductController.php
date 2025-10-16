<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    /**
     * Lấy danh sách sản phẩm (kèm theo biến thể)
     */
    public function index()
    {
        $products = Product::with(['variants' => function ($query) {
            $query->whereNull('deleted_at');
        }])
            ->whereNull('deleted_at')
            ->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $products
        ]);
    }

    /**
     * Lấy chi tiết 1 sản phẩm (kèm theo biến thể)
     */
    public function show($id)
    {
        $product = Product::with(['variants' => function ($query) {
            $query->whereNull('deleted_at');
        }])
            ->whereNull('deleted_at')
            ->find($id);

        if (!$product) {
            return response()->json([
                'status' => false,
                'message' => 'Product not found'
            ], 404);
        }

        return response()->json([
            'status' => true,
            'data' => $product
        ]);
    }

    /**
     * Tạo sản phẩm mới (có thể kèm biến thể)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'             => 'required|string|max:255',
            'category_id'      => 'required|integer',
            'description'      => 'nullable|string',
            'origin'           => 'nullable|string',
            'brand'            => 'nullable|string',
            'price'            => 'required|numeric',
            'stock_quantity'   => 'required|integer',
            'variation_status' => 'nullable|integer',
            'variants'         => 'nullable|array'
        ]);

        DB::beginTransaction();

        try {
            $product = Product::create([
                'name'             => $request->name,
                'category_id'      => $request->category_id,
                'description'      => $request->description,
                'origin'           => $request->origin,
                'brand'            => $request->brand,
                'price'            => $request->price,
                'stock_quantity'   => $request->stock_quantity,
                'variation_status' => $request->variation_status ?? 0,
            ]);

            // Nếu có biến thể thì thêm
            if ($request->has('variants') && is_array($request->variants)) {
                foreach ($request->variants as $variant) {
                    $product->variants()->create([
                        'size_id'        => $variant['size_id'] ?? null,
                        'color_id'       => $variant['color_id'] ?? null,
                        'price'          => $variant['price'] ?? $product->price,
                        'discount_price' => $variant['discount_price'] ?? null,
                        'stock_quantity' => $variant['stock_quantity'] ?? 0,
                        'is_available'   => $variant['is_available'] ?? 1,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Product created successfully',
                'data'    => $product->load('variants')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status'  => false,
                'message' => 'Failed to create product',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật sản phẩm
     */
    public function update(Request $request, $id)
    {
        $product = Product::whereNull('deleted_at')->find($id);

        if (!$product) {
            return response()->json([
                'status' => false,
                'message' => 'Product not found'
            ], 404);
        }

        $product->update($request->only([
            'name', 'category_id', 'description', 'origin', 'brand',
            'price', 'stock_quantity', 'variation_status'
        ]));

        return response()->json([
            'status'  => true,
            'message' => 'Product updated successfully',
            'data'    => $product
        ]);
    }

    /**
     * Xóa mềm sản phẩm
     */
    public function destroy($id)
    {
        $product = Product::whereNull('deleted_at')->find($id);

        if (!$product) {
            return response()->json([
                'status' => false,
                'message' => 'Product not found'
            ], 404);
        }

        $product->update(['deleted_at' => now()]);

        return response()->json([
            'status'  => true,
            'message' => 'Product soft deleted successfully'
        ]);
    }

    /**
     * Danh sách sản phẩm đã xóa mềm
     */
    public function trashed()
    {
        $products = Product::whereNotNull('deleted_at')->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $products
        ]);
    }

    /**
     * Phục hồi sản phẩm đã xóa mềm
     */
    public function restore($id)
    {
        $product = Product::whereNotNull('deleted_at')->find($id);

        if (!$product) {
            return response()->json([
                'status'  => false,
                'message' => 'Product not found or not deleted'
            ], 404);
        }

        $product->update(['deleted_at' => null]);

        return response()->json([
            'status'  => true,
            'message' => 'Product restored successfully',
            'data'    => $product
        ]);
    }

    /**
     * Xóa vĩnh viễn sản phẩm
     */
    public function forceDelete($id)
    {
        $product = Product::whereNotNull('deleted_at')->find($id);

        if (!$product) {
            return response()->json([
                'status'  => false,
                'message' => 'Product not found or not deleted'
            ], 404);
        }

        // Xóa vĩnh viễn các biến thể và sản phẩm
        $product->variants()->delete();
        $product->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Product permanently deleted'
        ]);
    }
}
