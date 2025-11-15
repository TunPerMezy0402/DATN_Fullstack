<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\{ProductReview, Order, Product};

class ProductReviewController extends Controller
{
    /**
     * ⭐ Tạo đánh giá sản phẩm
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'order_id' => 'nullable|integer|exists:orders,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
        ]);

        DB::beginTransaction();

        try {
            // Kiểm tra sản phẩm có tồn tại không
            $product = Product::find($validated['product_id']);
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sản phẩm không tồn tại'
                ], 404);
            }

            // Nếu có order_id, kiểm tra đơn hàng có thuộc user và đã giao không
            if (isset($validated['order_id'])) {
                $order = Order::with('shipping')
                    ->where('id', $validated['order_id'])
                    ->where('user_id', $user->id)
                    ->first();

                if (!$order) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Đơn hàng không tồn tại hoặc không thuộc về bạn'
                    ], 403);
                }

                // Kiểm tra đơn hàng đã giao thành công chưa
                if ($order->shipping->shipping_status !== 'delivered') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Chỉ có thể đánh giá sau khi đơn hàng được giao thành công'
                    ], 400);
                }

                // Kiểm tra đã đánh giá chưa
                $existingReview = ProductReview::where('user_id', $user->id)
                    ->where('product_id', $validated['product_id'])
                    ->where('order_id', $validated['order_id'])
                    ->first();

                if ($existingReview) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi'
                    ], 400);
                }
            }

            // Tạo đánh giá
            $review = ProductReview::create([
                'user_id' => $user->id,
                'product_id' => $validated['product_id'],
                'order_id' => $validated['order_id'] ?? null,
                'rating' => $validated['rating'],
                'comment' => $validated['comment'],
                'comment_time' => now(),
            ]);

            DB::commit();

            Log::info('Product review created', [
                'review_id' => $review->id,
                'user_id' => $user->id,
                'product_id' => $validated['product_id'],
                'order_id' => $validated['order_id'] ?? null,
                'rating' => $validated['rating'],
            ]);

            $review->load('user:id,name,email');

            return response()->json([
                'success' => true,
                'message' => 'Đánh giá đã được gửi thành công!',
                'data' => $review
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Product review error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Không thể gửi đánh giá!',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 📋 Lấy danh sách đánh giá của sản phẩm
     */
    public function index(Request $request, $productId)
    {
        try {
            $product = Product::find($productId);
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sản phẩm không tồn tại'
                ], 404);
            }

            $reviews = ProductReview::where('product_id', $productId)
                ->whereNull('parent_id') // Chỉ lấy review gốc, không lấy reply
                ->with([
                    'user:id,name,email',
                    'children.user:id,name,email' // Lấy cả reply
                ])
                ->orderBy('comment_time', 'desc')
                ->paginate(10);

            return response()->json([
                'success' => true,
                'message' => 'Danh sách đánh giá',
                'data' => $reviews
            ]);

        } catch (\Exception $e) {
            Log::error('Get reviews error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách đánh giá',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✏️ Cập nhật đánh giá
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        $validated = $request->validate([
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'sometimes|string|max:1000',
        ]);

        try {
            $review = ProductReview::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa'
                ], 404);
            }

            $review->update($validated);

            Log::info('Product review updated', [
                'review_id' => $review->id,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật đánh giá thành công!',
                'data' => $review->load('user:id,name,email')
            ]);

        } catch (\Exception $e) {
            Log::error('Update review error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật đánh giá',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🗑️ Xóa đánh giá
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Vui lòng đăng nhập'], 401);
        }

        try {
            $review = ProductReview::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy đánh giá hoặc bạn không có quyền xóa'
                ], 404);
            }

            $review->delete();

            Log::info('Product review deleted', [
                'review_id' => $id,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Xóa đánh giá thành công!'
            ]);

        } catch (\Exception $e) {
            Log::error('Delete review error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa đánh giá',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}