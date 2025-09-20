<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Đăng nhập
     */
    public function login(Request $request)
    {
        // Validate input
        $credentials = $request->validate([
            'email'    => 'required|string|email',
            'password' => 'required|string|min:6',
        ]);

        // Thử đăng nhập
        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['Thông tin đăng nhập không chính xác.'],
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Xoá token cũ (nếu muốn chỉ 1 token mỗi user, có thể bỏ nếu muốn nhiều)
        $user->tokens()->delete();

        // Tạo token mới
        $token = $user->createToken('api_token')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Đăng nhập thành công',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Đăng xuất
     */
    public function logout(Request $request)
    {
        // Xoá toàn bộ token của user
        $request->user()->tokens()->delete();

        return response()->json([
            'status' => true,
            'message' => 'Đăng xuất thành công',
        ]);
    }

    /**
     * Lấy thông tin user hiện tại
     */
    public function me(Request $request)
    {
        return response()->json([
            'status' => true,
            'user' => $request->user(),
        ]);
    }
}
