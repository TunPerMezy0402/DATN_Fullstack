<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Danh sách danh mục (chưa bị xóa)
     */
    public function index()
    {
        $categories = Category::whereNull('deleted_at')->paginate(10);

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

        // Kiểm tra trùng tên (chưa bị xóa)
        $exists = Category::where('name', $request->name)
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return response()->json([
                'status'  => false,
                'message' => 'Tên danh mục đã tồn tại',
            ], 422);
        }

        $category = Category::create([
            'name'        => $request->name,
            'description' => $request->description,
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
        $category = Category::whereNull('deleted_at')->findOrFail($id);

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

        $category = Category::whereNull('deleted_at')->findOrFail($id);

        // Kiểm tra trùng tên ở bản ghi khác (chưa bị xóa)
        $exists = Category::where('id', '!=', $id)
            ->where('name', $request->name)
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return response()->json([
                'status'  => false,
                'message' => 'Tên danh mục đã tồn tại',
            ], 422);
        }

        $category->update([
            'name'        => $request->name,
            'description' => $request->description,
        ]);

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
        $category = Category::whereNull('deleted_at')->findOrFail($id);
        $category->update(['deleted_at' => now()]);

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
        $categories = Category::whereNotNull('deleted_at')->paginate(10);

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
        $category = Category::whereNotNull('deleted_at')->findOrFail($id);
        $category->update(['deleted_at' => null]);

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
        $category = Category::whereNotNull('deleted_at')->findOrFail($id);
        $category->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Đã xóa vĩnh viễn danh mục'
        ]);
    }
}
