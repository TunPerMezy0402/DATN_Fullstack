<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\ProductReview;

class AdminProductReviewController extends Controller
{
    /**
     * 📋 GET /api/admin/product-reviews - Danh sách đánh giá
     */
    public function index(Request $request)
    {
        try {
            $query = ProductReview::with([
                'user:id,name,email',
                'product:id,name,image',
                'order:id,sku,total_amount,payment_status' // Sửa order_code thành sku
            ]);

            // Filter theo trạng thái
            $status = $request->query('status');
            
            if ($status === 'pending') {
                $query->where('is_approved', 0);
            } elseif ($status === 'approved') {
                $query->where('is_approved', 1);
            }

            // Filter theo rating
            if ($request->filled('rating')) {
                $query->where('rating', $request->rating);
            }

            // Filter theo product_id
            if ($request->filled('product_id')) {
                $query->where('product_id', $request->product_id);
            }

            // Search theo tên người dùng, email hoặc nội dung
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('comment', 'LIKE', "%{$search}%")
                      ->orWhereHas('user', function($q2) use ($search) {
                          $q2->where('name', 'LIKE', "%{$search}%")
                             ->orWhere('email', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Sắp xếp
            $sortBy = $request->query('sort_by', 'comment_time');
            $sortOrder = $request->query('sort_order', 'desc');
            
            // Validate sort_by để tránh SQL injection
            $allowedSortFields = ['id', 'rating', 'comment_time', 'is_approved'];
            if (!in_array($sortBy, $allowedSortFields)) {
                $sortBy = 'comment_time';
            }
            
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->query('per_page', 20);
            $reviews = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $reviews,
                'filters' => [
                    'status' => $status,
                    'rating' => $request->rating,
                    'product_id' => $request->product_id,
                    'search' => $request->search,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Admin get reviews failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể lấy danh sách đánh giá',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * 📄 GET /api/admin/product-reviews/{id} - Chi tiết đánh giá
     */
    public function show($id)
    {
        try {
            $review = ProductReview::with([
                'user:id,name,email,phone',
                'product:id,name,image,price',
                'order:id,sku,total_amount,final_amount,payment_status,payment_method' // Sửa order_code thành sku
            ])->find($id);

            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy đánh giá'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $review
            ], 200);

        } catch (\Exception $e) {
            Log::error('Admin show review failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể xem chi tiết đánh giá'
            ], 500);
        }
    }

    /**
     * ✏️ PUT /api/admin/product-reviews/{id} - Cập nhật đánh giá (duyệt/bỏ duyệt/sửa)
     */
    public function update(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $review = ProductReview::find($id);
            
            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy đánh giá'
                ], 404);
            }

            $validated = $request->validate([
                'rating' => 'sometimes|integer|min:1|max:5',
                'comment' => 'sometimes|string|min:1|max:1000',
                'is_approved' => 'sometimes|boolean',
            ]);

            // Cập nhật các trường được gửi lên
            if (isset($validated['rating'])) {
                $review->rating = $validated['rating'];
            }
            
            if (isset($validated['comment'])) {
                $review->comment = trim($validated['comment']);
            }
            
            if (isset($validated['is_approved'])) {
                $review->is_approved = $validated['is_approved'];
            }

            $review->save();

            DB::commit();

            Log::info('Review updated by admin', [
                'review_id' => $review->id,
                'changes' => $validated
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật đánh giá thành công',
                'data' => $review->load(['user:id,name,email', 'product:id,name,image', 'order:id,sku'])
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Admin update review failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật đánh giá'
            ], 500);
        }
    }

    /**
     * 🗑️ DELETE /api/admin/product-reviews/{id} - Xóa đánh giá vĩnh viễn
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $review = ProductReview::find($id);
            
            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy đánh giá'
                ], 404);
            }

            // Lưu thông tin trước khi xóa để log
            $reviewData = [
                'id' => $review->id,
                'user_id' => $review->user_id,
                'product_id' => $review->product_id,
                'rating' => $review->rating,
                'comment' => $review->comment
            ];

            $review->delete();

            DB::commit();

            Log::warning('Review deleted by admin', [
                'review_id' => $id,
                'review_data' => $reviewData
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Xóa đánh giá thành công'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Delete review failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa đánh giá'
            ], 500);
        }
    }

    /**
     * 📊 GET /api/admin/product-reviews/stats - Thống kê đánh giá
     */
    public function stats(Request $request)
    {
        try {
            $total = ProductReview::count();
            $pending = ProductReview::where('is_approved', 0)->count();
            $approved = ProductReview::where('is_approved', 1)->count();
            
            // Thống kê theo rating
            $byRating = ProductReview::select('rating', DB::raw('count(*) as count'))
                ->groupBy('rating')
                ->orderBy('rating', 'desc')
                ->get();

            // Đánh giá trung bình
            $avgRating = ProductReview::avg('rating');

            return response()->json([
                'success' => true,
                'data' => [
                    'total' => $total,
                    'pending' => $pending,
                    'approved' => $approved,
                    'by_rating' => $byRating,
                    'average_rating' => round($avgRating, 2)
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Get review stats failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể lấy thống kê'
            ], 500);
        }
    }

    /**
     * 🔄 PUT /api/admin/product-reviews/bulk-approve - Duyệt hàng loạt
     */
    public function bulkApprove(Request $request)
    {
        DB::beginTransaction();
        try {
            $validated = $request->validate([
                'ids' => 'required|array',
                'ids.*' => 'integer|exists:product_reviews,id',
                'is_approved' => 'required|boolean'
            ]);

            $updated = ProductReview::whereIn('id', $validated['ids'])
                ->update(['is_approved' => $validated['is_approved']]);

            DB::commit();

            Log::info('Bulk approve reviews by admin', [
                'count' => $updated,
                'is_approved' => $validated['is_approved']
            ]);

            return response()->json([
                'success' => true,
                'message' => "Đã cập nhật {$updated} đánh giá",
                'data' => [
                    'updated_count' => $updated
                ]
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk approve failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật hàng loạt'
            ], 500);
        }
    }

    /**
     * 🗑️ DELETE /api/admin/product-reviews/bulk-delete - Xóa hàng loạt
     */
    public function bulkDelete(Request $request)
    {
        DB::beginTransaction();
        try {
            $validated = $request->validate([
                'ids' => 'required|array',
                'ids.*' => 'integer|exists:product_reviews,id'
            ]);

            $deleted = ProductReview::whereIn('id', $validated['ids'])->delete();

            DB::commit();

            Log::warning('Bulk delete reviews by admin', [
                'count' => $deleted,
                'ids' => $validated['ids']
            ]);

            return response()->json([
                'success' => true,
                'message' => "Đã xóa {$deleted} đánh giá",
                'data' => [
                    'deleted_count' => $deleted
                ]
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk delete failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa hàng loạt'
            ], 500);
        }
    }
}