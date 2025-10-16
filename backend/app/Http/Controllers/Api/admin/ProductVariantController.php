<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class ProductVariantController extends Controller
{
    /**
     * Lấy danh sách các variant chưa bị xóa
     */
    public function index()
    {
        $variants = ProductVariant::where('is_deleted', 0)->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $variants
        ]);
    }

    /**
     * Lấy chi tiết 1 variant
     */
    public function show($id)
    {
        $variant = ProductVariant::where('is_deleted', 0)->find($id);

        if (!$variant) {
            return response()->json([
                'status' => false,
                'message' => 'Variant not found'
            ], 404);
        }

        return response()->json([
            'status' => true,
            'data' => $variant
        ]);
    }

    /**
     * Thêm mới variant
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_id'     => 'required|integer|exists:products,id',
            'size_id'        => 'nullable|integer',
            'color_id'       => 'nullable|integer',
            'sku'            => 'required|string|max:100|unique:product_variants,sku',
            'price'          => 'required|numeric|min:0',
            'discount_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'is_available'   => 'boolean',
        ]);

        $variant = ProductVariant::create([
            'product_id'     => $request->product_id,
            'size_id'        => $request->size_id,
            'color_id'       => $request->color_id,
            'sku'            => $request->sku,
            'price'          => $request->price,
            'discount_price' => $request->discount_price,
            'stock_quantity' => $request->stock_quantity,
            'is_available'   => $request->is_available ?? 1,
            'is_deleted'     => 0,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Variant created successfully',
            'data'    => $variant
        ], 201);
    }

    /**
     * Cập nhật variant
     */
    public function update(Request $request, $id)
    {
        $variant = ProductVariant::where('is_deleted', 0)->find($id);

        if (!$variant) {
            return response()->json([
                'status' => false,
                'message' => 'Variant not found'
            ], 404);
        }

        $request->validate([
            'sku'            => 'sometimes|string|max:100|unique:product_variants,sku,' . $id,
            'price'          => 'sometimes|numeric|min:0',
            'discount_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'is_available'   => 'boolean',
        ]);

        $variant->update($request->only([
            'size_id', 'color_id', 'sku', 'price', 'discount_price', 'stock_quantity', 'is_available'
        ]));

        return response()->json([
            'status'  => true,
            'message' => 'Variant updated successfully',
            'data'    => $variant
        ]);
    }

    /**
     * Xóa mềm variant
     */
    public function destroy($id)
    {
        $variant = ProductVariant::where('is_deleted', 0)->find($id);

        if (!$variant) {
            return response()->json([
                'status' => false,
                'message' => 'Variant not found'
            ], 404);
        }

        $variant->update(['is_deleted' => 1]);

        return response()->json([
            'status'  => true,
            'message' => 'Variant soft deleted successfully'
        ]);
    }

    /**
     * Danh sách variant đã xóa mềm
     */
    public function trashed()
    {
        $variants = ProductVariant::where('is_deleted', 1)->paginate(10);

        return response()->json([
            'status' => true,
            'data'   => $variants
        ]);
    }

    /**
     * Khôi phục variant đã xóa mềm
     */
    public function restore($id)
    {
        $variant = ProductVariant::where('is_deleted', 1)->find($id);

        if (!$variant) {
            return response()->json([
                'status' => false,
                'message' => 'Variant not found or not deleted'
            ], 404);
        }

        $variant->update(['is_deleted' => 0]);

        return response()->json([
            'status'  => true,
            'message' => 'Variant restored successfully',
            'data'    => $variant
        ]);
    }

    /**
     * Xóa vĩnh viễn variant
     */
    public function forceDelete($id)
    {
        $variant = ProductVariant::where('is_deleted', 1)->find($id);

        if (!$variant) {
            return response()->json([
                'status' => false,
                'message' => 'Variant not found or not deleted'
            ], 404);
        }

        $variant->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Variant permanently deleted'
        ]);
    }
}
