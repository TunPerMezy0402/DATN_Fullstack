<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\Attribute;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AttributeController extends Controller
{
    /**
     * Danh sách thuộc tính (chưa bị xóa)
     */
    public function index()
    {
        // Mặc định Eloquent sẽ chỉ lấy bản ghi chưa xóa, không cần whereNull
        $attributes = Attribute::paginate(10);

        return response()->json([
            'status' => true,
            'data' => $attributes
        ]);
    }

    /**
     * Lưu thuộc tính mới
     */
    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'value' => [
                'required',
                'string',
                'max:255',
                Rule::unique('attributes')->where(function ($query) use ($request) {
                    return $query->where('type', ucfirst(strtolower($request->type)));
                }),
            ],
        ], [
            'value.unique' => 'Giá trị "' . $request->value . '" đã tồn tại cho loại ' . ucfirst(strtolower($request->type)),
        ]);

        $attribute = Attribute::create([
            'type' => ucfirst(strtolower($request->type)),
            'value' => $request->value,
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Thêm thuộc tính thành công',
            'data' => $attribute
        ], 201);
    }

    /**
     * Xem chi tiết thuộc tính
     */
    public function show($id)
    {
        $attribute = Attribute::findOrFail($id);

        return response()->json([
            'status' => true,
            'data' => $attribute
        ]);
    }

    /**
     * Cập nhật thuộc tính
     */
    public function update(Request $request, $id)
    {
        $attribute = Attribute::findOrFail($id);

        $request->validate([
            'type' => 'required|string',
            'value' => [
                'required',
                'string',
                'max:255',
                Rule::unique('attributes')
                    ->where(fn($query) => $query->where('type', ucfirst(strtolower($request->type))))
                    ->ignore($id),
            ],
        ]);

        $attribute->update([
            'type' => ucfirst(strtolower($request->type)),
            'value' => $request->value,
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật thuộc tính thành công',
            'data' => $attribute
        ]);
    }

    /**
     * Xóa mềm thuộc tính
     */
    public function destroy($id)
    {
        $attribute = Attribute::findOrFail($id);
        $attribute->delete(); // Soft delete tự động set deleted_at = now()

        return response()->json([
            'status' => true,
            'message' => 'Xóa thuộc tính thành công'
        ]);
    }

    /**
     * Danh sách các thuộc tính đã xóa mềm
     */
    public function trash()
    {
        $attributes = Attribute::onlyTrashed()->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $attributes
        ]);
    }

    /**
     * Khôi phục thuộc tính đã xóa mềm
     */
    public function restore($id)
    {
        $attribute = Attribute::onlyTrashed()->findOrFail($id);
        $attribute->restore();

        return response()->json([
            'status' => true,
            'message' => 'Khôi phục thuộc tính thành công',
            'data' => $attribute
        ]);
    }

    /**
     * Xóa vĩnh viễn thuộc tính
     */
    public function forceDelete($id)
    {
        $attribute = Attribute::onlyTrashed()->findOrFail($id);
        $attribute->forceDelete();

        return response()->json([
            'status' => true,
            'message' => 'Đã xóa vĩnh viễn thuộc tính'
        ]);
    }
}
