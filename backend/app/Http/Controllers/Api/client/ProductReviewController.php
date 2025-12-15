<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\{ProductReview, Order, Product, ShippingLog};

class ProductReviewController extends Controller
{
    /**
     * ⭐ Tạo đánh giá cho TỪNG VARIANT
     */
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập'], 401);
            }

            // Validate request data
            $validated = $request->validate([
                'product_id' => 'required|integer|exists:products,id',
                'variant_id' => 'required|integer|exists:product_variants,id',
                'order_id' => 'required|integer|exists:orders,id',
                'rating' => 'required|integer|min:1|max:5',
                'comment' => 'required|string|min:1|max:1000',
            ]);

            // Log the incoming request data for debugging
            Log::info('Review submission attempt:', [
                'user_id' => $user->id,
                'request_data' => $validated
            ]);

            // Kiểm tra đơn hàng
            $order = Order::with(['shipping', 'items'])
                ->where('id', $validated['order_id'])
                ->where('user_id', $user->id)
                ->first();

            if (!$order) {
                return response()->json(['success' => false, 'message' => 'Đơn hàng không tồn tại'], 403);
            }

            if (!in_array($order->shipping->shipping_status, ['received', 'return_processing'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể đánh giá sau khi đã nhận hàng'
                ], 400);
            }


            // Kiểm tra variant có trong đơn không
            $orderItem = $order->items
                ->where('product_id', $validated['product_id'])
                ->where('variant_id', $validated['variant_id'])
                ->first();

            if (!$orderItem) {
                return response()->json(['success' => false, 'message' => 'Sản phẩm không có trong đơn hàng'], 400);
            }

            // Kiểm tra đã review chưa
            $existingReview = ProductReview::where('user_id', $user->id)
                ->where('product_id', $validated['product_id'])
                ->where('variant_id', $validated['variant_id'])
                ->where('order_id', $validated['order_id'])
                ->exists();

            if ($existingReview) {
                return response()->json(['success' => false, 'message' => 'Bạn đã đánh giá sản phẩm này rồi'], 400);
            }

            // Tạo review
            $review = ProductReview::create([
                'user_id' => $user->id,
                'product_id' => $validated['product_id'],
                'variant_id' => $validated['variant_id'],
                'order_id' => $validated['order_id'],
                'rating' => $validated['rating'],
                'comment' => trim($validated['comment']),
                'comment_time' => now(),
                'is_approved' => false, // Mặc định chờ duyệt
            ]);

            // Kiểm tra đã review hết tất cả variants chưa
            $totalVariants = $order->items->count();
            $reviewedVariants = ProductReview::where('order_id', $order->id)
                ->where('user_id', $user->id)
                ->count();

            // Nếu đã review hết -> chuyển sang evaluated
            if ($reviewedVariants >= $totalVariants) {
                ShippingLog::create([
                    'shipping_id' => $order->shipping->id,
                    'old_status' => 'received',
                    'new_status' => 'evaluated',
                ]);

                $order->shipping->update(['shipping_status' => 'evaluated']);
            }

            DB::commit();

            // Log successful review creation
            Log::info('Review created successfully', [
                'review_id' => $review->id,
                'user_id' => $user->id,
                'product_id' => $validated['product_id']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đánh giá thành công!',
                'data' => $review->load(['user:id,name,email', 'product:id,name,image'])
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            Log::warning('Validation failed during review creation', [
                'errors' => $e->errors(),
                'user_id' => $user->id ?? null
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Review creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id ?? null,
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ], 500);

        }
    }

    /**
     * 📋 Lấy danh sách đánh giá của sản phẩm (PUBLIC - chỉ hiện đánh giá đã duyệt)
     */
    public function index(Request $request, $productId)
    {
        $product = Product::find($productId);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Sản phẩm không tồn tại'], 404);
        }

        $reviews = ProductReview::where('product_id', $productId)
            ->where('is_approved', true) // Chỉ lấy đánh giá đã được duyệt
            ->with(['user:id,name,email'])
            ->orderBy('comment_time', 'desc')
            ->paginate(10);

        return response()->json(['success' => true, 'data' => $reviews], 200);
    }

    /**
     * 📋 Lấy đánh giá của đơn hàng
     */
    public function getOrderReviews(Request $request, $orderId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập'], 401);
        }

        $order = Order::where('id', $orderId)->where('user_id', $user->id)->first();
        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Đơn hàng không tồn tại'], 403);
        }

        $reviews = ProductReview::where('order_id', $orderId)
            ->where('user_id', $user->id)
            ->with(['user:id,name,email', 'product:id,name,cover_image'])
            ->orderBy('comment_time', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $reviews], 200);
    }

    /**
     * 🗑️ Xóa đánh giá
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập'], 401);
        }

        DB::beginTransaction();
        try {
            $review = ProductReview::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$review) {
                return response()->json(['success' => false, 'message' => 'Không tìm thấy đánh giá'], 404);
            }

            $orderId = $review->order_id;
            $review->delete();

            // Kiểm tra nếu order đang evaluated và còn variants chưa review -> chuyển về received
            $order = Order::with(['shipping', 'items'])->find($orderId);
            if ($order && $order->shipping->shipping_status === 'evaluated') {
                $totalVariants = $order->items->count();
                $reviewedVariants = ProductReview::where('order_id', $orderId)
                    ->where('user_id', $user->id)
                    ->count();

                if ($reviewedVariants < $totalVariants) {
                    ShippingLog::create([
                        'shipping_id' => $order->shipping->id,
                        'old_status' => 'evaluated',
                        'new_status' => 'received',
                    ]);

                    $order->shipping->update(['shipping_status' => 'received']);
                }
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Xóa đánh giá thành công'], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Delete review failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Không thể xóa đánh giá'], 500);
        }
    }

    /**
     * ✅ Kiểm tra đã review những variant nào
     */
    public function checkOrderReviewed(Request $request, $orderId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Vui lòng đăng nhập'], 401);
        }

        $order = Order::with('items')->where('id', $orderId)->where('user_id', $user->id)->first();
        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Đơn hàng không tồn tại'], 403);
        }

        $reviewedVariantIds = ProductReview::where('order_id', $orderId)
            ->where('user_id', $user->id)
            ->pluck('variant_id')
            ->toArray();

        $totalVariants = $order->items->count();
        $reviewedCount = count($reviewedVariantIds);

        return response()->json([
            'success' => true,
            'data' => [
                'reviewed_variant_ids' => $reviewedVariantIds,
                'total_variants' => $totalVariants,
                'reviewed_count' => $reviewedCount,
                'has_reviewed_all' => $reviewedCount >= $totalVariants,
            ]
        ], 200);
    }
}