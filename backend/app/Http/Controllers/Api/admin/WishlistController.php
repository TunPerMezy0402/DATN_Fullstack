<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\Wishlist;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * Danh sách wishlist
     */
    public function index()
    {
        $wishlists = Wishlist::with('user')->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $wishlists
        ]);
    }

    /**
     * Chi tiết wishlist
     */
    public function show($id)
    {
        $wishlist = Wishlist::with('user')->find($id);

        if (!$wishlist) {
            return response()->json([
                'status' => false,
                'message' => 'Wishlist not found'
            ], 404);
        }

        return response()->json([
            'status' => true,
            'data' => $wishlist
        ]);
    }

    /**
     * Tạo mới wishlist
     */
    public function store(Request $request)
    {
        $request->validate([
            'user_id'  => 'required|integer',
            'products' => 'required|json',
        ]);

        $wishlist = Wishlist::create([
            'user_id'  => $request->user_id,
            'products' => $request->products,
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Wishlist created successfully',
            'data' => $wishlist
        ], 201);
    }

    /**
     * Cập nhật wishlist
     */
    public function update(Request $request, $id)
    {
        $wishlist = Wishlist::find($id);

        if (!$wishlist) {
            return response()->json([
                'status' => false,
                'message' => 'Wishlist not found'
            ], 404);
        }

        $request->validate([
            'products' => 'required|json',
        ]);

        $wishlist->update([
            'products' => $request->products,
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Wishlist updated successfully',
            'data' => $wishlist
        ]);
    }

    /**
     * Xóa wishlist
     */
    public function destroy($id)
    {
        $wishlist = Wishlist::find($id);

        if (!$wishlist) {
            return response()->json([
                'status' => false,
                'message' => 'Wishlist not found'
            ], 404);
        }

        $wishlist->delete();

        return response()->json([
            'status' => true,
            'message' => 'Wishlist deleted successfully'
        ]);
    }
}
