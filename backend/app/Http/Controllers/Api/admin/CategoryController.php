<?php

namespace App\Http\Controllers\Api\admin;


use App\Http\Controllers\Api\admin\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Danh sách danh mục
     */
    public function index()
    {
        $categories = Category::where('is_deleted', 0)->paginate(10);

        return response()->json([
            'status' => true,
            'data'   => $categories
        ]);
    }

    /**
     * Lưu danh mục mới
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $category = Category::create([
            'name'        => $request->name,
            'description' => $request->description,
            'is_deleted'  => 0,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Thêm danh mục thành công',
            'data'    => $category
        ], 201);
    }

    /**
     * Xem chi tiết danh mục
     */
    public function show($id)
    {
        $category = Category::where('is_deleted', 0)->findOrFail($id);

        return response()->json([
            'status' => true,
            'data'   => $category
        ]);
    }

    /**
     * Cập nhật danh mục
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $category = Category::where('is_deleted', 0)->findOrFail($id);
        $category->update($request->only(['name', 'description']));

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật danh mục thành công',
            'data'    => $category
        ]);
    }

    /**
     * Xóa mềm danh mục
     */
    public function destroy($id)
    {
        $category = Category::where('is_deleted', 0)->findOrFail($id);
        $category->update(['is_deleted' => 1]);

        return response()->json([
            'status'  => true,
            'message' => 'Xóa danh mục thành công'
        ]);
    }

    /**
     * Danh sách các danh mục đã xóa mềm
     */
    public function trash()
    {
        $categories = Category::where('is_deleted', 1)->paginate(10);

        return response()->json([
            'status' => true,
            'data'   => $categories
        ]);
    }

    /**
     * Khôi phục danh mục đã xóa mềm
     */
    public function restore($id)
    {
        $category = Category::where('is_deleted', 1)->findOrFail($id);
        $category->update(['is_deleted' => 0]);

        return response()->json([
            'status'  => true,
            'message' => 'Khôi phục danh mục thành công',
            'data'    => $category
        ]);
    }

    /**
     * Xóa vĩnh viễn danh mục
     */
    public function forceDelete($id)
    {
        $category = Category::where('is_deleted', 1)->findOrFail($id);
        $category->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Đã xóa vĩnh viễn danh mục'
        ]);
    }
}
