<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use App\Models\User;
use Illuminate\Support\Facades\Hash;


class AuthController extends Controller
{

     public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Tự động đăng nhập sau khi đăng ký
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Đăng ký thành công',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Đăng nhập tài khoản thường (email + password)
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string|min:6',
        ]);

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['Thông tin đăng nhập không chính xác.'],
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Xóa token cũ (nếu muốn giới hạn 1 token mỗi user)
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

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
        $request->user()->currentAccessToken()->delete();

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

    /**
     * Đăng nhập bằng Google OAuth
     */
    public function googleLogin(Request $request)
    {
        try {
            $googleToken = $request->input('token');
            if (!$googleToken) {
                return response()->json([
                    'status' => false,
                    'message' => 'Thiếu Google token.',
                ], 400);
            }

            // Xác thực token Google và lấy thông tin user từ Google API
            $client = new \GuzzleHttp\Client();
            $response = $client->get('https://www.googleapis.com/oauth2/v3/tokeninfo', [
                'query' => ['id_token' => $googleToken]
            ]);
            $googleData = json_decode($response->getBody(), true);

            if (!isset($googleData['email'])) {
                return response()->json([
                    'status' => false,
                    'message' => 'Không thể xác thực tài khoản Google.',
                ], 400);
            }

            // Tạo đối tượng giả lập googleUser
            $googleUser = (object) [
                'getEmail' => fn() => $googleData['email'],
                'getName' => fn() => $googleData['name'] ?? $googleData['email'],
                'getAvatar' => fn() => $googleData['picture'] ?? null,
                'getId' => fn() => $googleData['sub'] ?? null,
            ];

            // Tạo hoặc cập nhật user trong DB
            $user = User::updateOrCreate(
                ['email' => $googleUser->getEmail()],
                [
                    'name' => $googleUser->getName(),
                    'avatar' => $googleUser->getAvatar(),
                    'google_id' => $googleUser->getId(),
                    'email_verified_at' => now(),
                ]
            );

            // Xóa token cũ và tạo token mới
            $user->tokens()->delete();
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'status' => true,
                'message' => 'Đăng nhập Google thành công',
                'token' => $token,
                'user' => $user,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Lỗi khi đăng nhập bằng Google',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
