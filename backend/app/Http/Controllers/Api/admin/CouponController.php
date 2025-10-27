<?php

namespace App\Http\Controllers\Api\admin;


use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    /**
     * Danh sách tất cả coupon (chưa xóa)
     */
    public function index(Request $request)
    {
        $query = Coupon::query();

        // Bộ lọc (nếu có)
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $query->where('code', 'like', '%' . $request->search . '%');
        }

        $coupons = $query->orderByDesc('id')->paginate(20);

        return response()->json($coupons);
    }

    /**
     * Xem chi tiết coupon
     */
    public function show($id)
    {
        $coupon = Coupon::findOrFail($id);
        return response()->json($coupon);
    }

    /**
     * Tạo mới coupon
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:coupons,code',
            'discount_type' => 'required|in:percent,fixed',
            'discount_value' => 'required|numeric|min:0',
            'min_purchase' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);

        $coupon = Coupon::create($validated);

        return response()->json([
            'message' => 'Tạo mã giảm giá thành công.',
            'data' => $coupon,
        ]);
    }

    /**
     * Cập nhật coupon
     */
    public function update(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:50|unique:coupons,code,' . $id,
            'discount_type' => 'sometimes|in:percent,fixed',
            'discount_value' => 'sometimes|numeric|min:0',
            'min_purchase' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);

        $coupon->update($validated);

        return response()->json([
            'message' => 'Cập nhật thành công.',
            'data' => $coupon,
        ]);
    }

    /**
     * Xóa mềm (soft delete)
     */
    public function destroy($id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->delete();

        return response()->json(['message' => 'Đã xóa mã giảm giá (soft delete).']);
    }

    /**
     * Danh sách các coupon đã xóa (trash)
     */
    public function trash()
    {
        $trash = Coupon::onlyTrashed()->orderByDesc('deleted_at')->paginate(20);
        return response()->json($trash);
    }

    /**
     * Phục hồi coupon đã xóa
     */
    public function restore($id)
    {
        $coupon = Coupon::onlyTrashed()->findOrFail($id);
        $coupon->restore();

        return response()->json(['message' => 'Đã phục hồi mã giảm giá.']);
    }

    /**
     * Xóa vĩnh viễn
     */
    public function forceDelete($id)
    {
        $coupon = Coupon::onlyTrashed()->findOrFail($id);
        $coupon->forceDelete();

        return response()->json(['message' => 'Đã xóa vĩnh viễn mã giảm giá.']);
    }
}
