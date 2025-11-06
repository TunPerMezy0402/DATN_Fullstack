<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class AttributeController extends Controller
{
    /**
     * Chuẩn hóa tất cả các trường chuỗi: chữ cái đầu viết hoa, chữ còn lại viết thường
     */
    private function formatStrings(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = Str::ucfirst(Str::lower($value));
            }
        }
        return $data;
    }

    /**
     * GET /admin/attributes
     */
    public function index(Request $request)
    {
        $query = Attribute::query();
        if ($type = $request->query('type')) {
            $query->where('type', Str::lower($type));
        }

        $perPage = $request->integer('per_page', 20);
        return response()->json($query->orderBy('value')->paginate($perPage));
    }

    /**
     * GET /admin/attributes/trash
     */
    public function trash(Request $request)
    {
        $query = Attribute::onlyTrashed();
        if ($type = $request->query('type')) {
            $query->where('type', Str::lower($type));
        }

        $perPage = $request->integer('per_page', 20);
        return response()->json($query->orderBy('deleted_at', 'desc')->paginate($perPage));
    }

    /**
     * GET /admin/attributes/{id}
     */
    public function show($id)
    {
        try {
            $attr = Attribute::withTrashed()->findOrFail($id);
            return response()->json($attr);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Không tìm thấy thuộc tính'], 404);
        }
    }

    /**
     * POST /admin/attributes
     */
    public function store(Request $request)
    {
        $input = $request->all();

        // Chuyển type về lowercase để validate
        if (isset($input['type'])) {
            $input['type'] = Str::lower($input['type']);
        }

        $validated = validator($input, [
            'type'  => ['required', 'string', Rule::in(['size', 'color'])],
            'value' => 'required|string|max:100',
        ], [
            'type.required'  => 'Trường type là bắt buộc.',
            'type.in'        => 'Type phải là size hoặc color.',
            'value.required' => 'Trường value là bắt buộc.',
            'value.max'      => 'Giá trị không được dài quá 100 ký tự.',
        ])->validate();

        // Chuẩn hóa value
        $validated = $this->formatStrings($validated);

        $attr = Attribute::create($validated);
        return response()->json($attr, 201);
    }

    /**
     * PUT /admin/attributes/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $attr = Attribute::withTrashed()->findOrFail($id);
            $input = $request->all();

            // Chuyển type về lowercase để validate
            if (isset($input['type'])) {
                $input['type'] = Str::lower($input['type']);
            }

            $validated = validator($input, [
                'type'  => ['sometimes', 'string', Rule::in(['size', 'color'])],
                'value' => 'sometimes|string|max:100',
            ], [
                'type.in'   => 'Type phải là size hoặc color.',
                'value.max' => 'Giá trị không được dài quá 100 ký tự.',
            ])->validate();

            if (!empty($validated)) {
                $validated = $this->formatStrings($validated);
                $attr->update($validated);
            }

            return response()->json($attr);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Không tìm thấy thuộc tính'], 404);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cập nhật thất bại', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /admin/attributes/{id} (xóa mềm)
     */
    public function destroy($id)
    {
        try {
            $attr = Attribute::findOrFail($id);
            $attr->delete();
            return response()->json(['message' => 'deleted']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Xóa thất bại', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /admin/attributes/{id}/restore
     */
    public function restore($id)
    {
        try {
            $attr = Attribute::withTrashed()->findOrFail($id);
            $attr->restore();
            return response()->json(['message' => 'restored']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Khôi phục thất bại', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /admin/attributes/{id}/force-delete
     */
    public function forceDelete($id)
    {
        try {
            $attr = Attribute::withTrashed()->findOrFail($id);
            $attr->forceDelete();
            return response()->json(['message' => 'force-deleted']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Xóa vĩnh viễn thất bại', 'message' => $e->getMessage()], 500);
        }
    }
}
