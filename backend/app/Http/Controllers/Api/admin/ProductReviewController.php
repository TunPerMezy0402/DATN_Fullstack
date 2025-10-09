<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\ProductReview;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ProductReviewController extends Controller
{
    /**
     * Danh sách review
     */
    public function index()
    {
        $reviews = ProductReview::with(['product', 'replies'])
            ->orderByDesc('comment_time')
            ->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $reviews
        ]);
    }

    /**
     * Chi tiết 1 review
     */
    public function show($id)
    {
        $review = ProductReview::with(['product', 'replies'])->find($id);

        if (!$review) {
            return response()->json([
                'status' => false,
                'message' => 'Review not found'
            ], 404);
        }

        return response()->json([
            'status' => true,
            'data' => $review
        ]);
    }

    /**
     * Thêm review
     */
    public function store(Request $request)
    {
        $request->validate([
            'user_name'  => 'required|string|max:255',
            'product_id' => 'required|integer',
            'comment'    => 'required|string',
            'parent_id'  => 'nullable|integer|exists:product_reviews,id',
        ]);

        $review = ProductReview::create([
            'user_name'   => $request->user_name,
            'product_id'  => $request->product_id,
            'comment'     => $request->comment,
            'parent_id'   => $request->parent_id,
            'comment_time'=> Carbon::now(),
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Review created successfully',
            'data' => $review
        ], 201);
    }

    /**
     * Cập nhật review
     */
    public function update(Request $request, $id)
    {
        $review = ProductReview::find($id);

        if (!$review) {
            return response()->json([
                'status' => false,
                'message' => 'Review not found'
            ], 404);
        }

        $request->validate([
            'comment' => 'required|string',
        ]);

        $review->update([
            'comment' => $request->comment,
            'comment_time' => Carbon::now(),
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Review updated successfully',
            'data' => $review
        ]);
    }

    /**
     * Xóa review
     */
    public function destroy($id)
    {
        $review = ProductReview::find($id);

        if (!$review) {
            return response()->json([
                'status' => false,
                'message' => 'Review not found'
            ], 404);
        }

        $review->delete();

        return response()->json([
            'status' => true,
            'message' => 'Review deleted successfully'
        ]);
    }
}
