<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        // Chỉ lấy danh mục chưa xóa mềm (Laravel tự làm)
        $categories = Category::paginate(10);

        return response()->json([
            'status' => true,
            'data' => $categories
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,NULL,id,deleted_at,NULL',
        ]);

        $category = Category::create($request->only('name', 'description'));

        return response()->json([
            'status' => true,
            'message' => 'Thêm danh mục thành công',
            'data' => $category
        ], 201);
    }

    public function show($id)
    {
        $category = Category::findOrFail($id);

        return response()->json([
            'status' => true,
            'data' => $category
        ]);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $id . ',id,deleted_at,NULL',
        ]);

        $category->update($request->only('name', 'description'));

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật danh mục thành công',
            'data' => $category
        ]);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        $category->delete(); // Soft delete (tự set deleted_at)

        return response()->json([
            'status' => true,
            'message' => 'Xóa mềm danh mục thành công'
        ]);
    }

    public function trash()
    {
        // 👉 chỉ lấy bản ghi đã bị xóa mềm
        $categories = Category::onlyTrashed()->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $categories
        ]);
    }

    public function restore($id)
    {
        $category = Category::onlyTrashed()->findOrFail($id);
        $category->restore(); // khôi phục

        return response()->json([
            'status' => true,
            'message' => 'Khôi phục danh mục thành công',
            'data' => $category
        ]);
    }

    public function forceDelete($id)
    {
        $category = Category::onlyTrashed()->findOrFail($id);
        $category->forceDelete(); // Xóa vĩnh viễn

        return response()->json([
            'status' => true,
            'message' => 'Đã xóa vĩnh viễn danh mục'
        ]);
    }
}
