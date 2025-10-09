<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class ProductVariantController extends Controller
{
    /**
     * Lấy danh sách variant
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
     * Thêm variant
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_id'     => 'required|integer',
            'size_id'        => 'nullable|integer',
            'color_id'       => 'nullable|integer',
            'sku'            => 'required|string|max:100|unique:product_variants,sku',
            'price'          => 'required|numeric',
            'stock_quantity' => 'required|integer',
            'is_available'   => 'boolean',
        ]);

        $variant = ProductVariant::create($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Variant created successfully',
            'data' => $variant
        ], 201);
    }

    /**
     * Cập nhật variant
     */
    public function update(Request $request, $id)
    {
        $variant = ProductVariant::find($id);

        if (!$variant || $variant->is_deleted) {
            return response()->json([
                'status' => false,
                'message' => 'Variant not found'
            ], 404);
        }

        $request->validate([
            'sku' => 'string|max:100|unique:product_variants,sku,' . $id,
        ]);

        $variant->update($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Variant updated successfully',
            'data' => $variant
        ]);
    }

    /**
     * Xóa mềm variant
     */
    public function destroy($id)
    {
        $variant = ProductVariant::find($id);

        if (!$variant || $variant->is_deleted) {
            return response()->json([
                'status' => false,
                'message' => 'Variant not found'
            ], 404);
        }

        $variant->update(['is_deleted' => 1]);

        return response()->json([
            'status' => true,
            'message' => 'Variant deleted successfully'
        ]);
    }
}
