<?php
namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Lấy danh sách sản phẩm
     */
    public function index()
    {
        $products = Product::where('is_deleted', 0)->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $products
        ]);
    }

    /**
     * Lấy chi tiết 1 sản phẩm
     */
    public function show($id)
    {
        $product = Product::where('is_deleted', 0)->find($id);

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
     * Thêm sản phẩm
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'           => 'required|string|max:255',
            'category_id'    => 'required|integer',
            'price'          => 'required|numeric',
            'stock_quantity' => 'required|integer',
        ]);

        $product = Product::create($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Product created successfully',
            'data' => $product
        ], 201);
    }

    /**
     * Cập nhật sản phẩm
     */
    public function update(Request $request, $id)
    {
        $product = Product::find($id);

        if (!$product || $product->is_deleted) {
            return response()->json([
                'status' => false,
                'message' => 'Product not found'
            ], 404);
        }

        $product->update($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Product updated successfully',
            'data' => $product
        ]);
    }

    /**
     * Xóa sản phẩm (soft delete)
     */
    public function destroy($id)
    {
        $product = Product::find($id);

        if (!$product || $product->is_deleted) {
            return response()->json([
                'status' => false,
                'message' => 'Product not found'
            ], 404);
        }

        $product->update(['is_deleted' => 1]);

        return response()->json([
            'status' => true,
            'message' => 'Product deleted successfully'
        ]);
    }
}

