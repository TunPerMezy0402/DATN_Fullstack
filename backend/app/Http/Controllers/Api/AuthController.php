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

        // Generate unique name (since name has unique constraint)
        $baseName = $validated['name'];
        $name = $baseName;
        $counter = 1;
        
        // Ensure name is unique
        while (User::where('name', $name)->exists()) {
            $name = $baseName . ' (' . $counter . ')';
            $counter++;
        }

        $user = User::create([
            'name' => $name,
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.',
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
     * Đăng nhập bằng Google OAuth (Google Identity Services)
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

            // Xác thực token Google bằng Google Identity Services
            $client = new \GuzzleHttp\Client();
            $response = $client->get('https://oauth2.googleapis.com/tokeninfo', [
                'query' => ['id_token' => $googleToken]
            ]);
            
            if ($response->getStatusCode() !== 200) {
                return response()->json([
                    'status' => false,
                    'message' => 'Token Google không hợp lệ.',
                ], 400);
            }
            
            $googleData = json_decode($response->getBody(), true);

            // Kiểm tra client_id để đảm bảo token từ đúng ứng dụng
            $expectedClientId = config('services.google.client_id');
            if ($googleData['aud'] !== $expectedClientId) {
                return response()->json([
                    'status' => false,
                    'message' => 'Token không khớp với ứng dụng.',
                ], 400);
            }

            if (!isset($googleData['email']) || !isset($googleData['email_verified']) || !$googleData['email_verified']) {
                return response()->json([
                    'status' => false,
                    'message' => 'Email Google chưa được xác thực.',
                ], 400);
            }

            // Generate unique name if needed
            $baseName = $googleData['name'] ?? $googleData['email'];
            $name = $baseName;
            $counter = 1;
            
            // Check if name exists for other users
            while (User::where('name', $name)->where('email', '!=', $googleData['email'])->exists()) {
                $name = $baseName . ' (' . $counter . ')';
                $counter++;
            }

            // Tạo hoặc cập nhật user trong DB
            $user = User::updateOrCreate(
                ['email' => $googleData['email']],
                [
                    'name' => $name,
                    'google_id' => $googleData['sub'],
                    'avatar' => $googleData['picture'] ?? null,
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
        } catch (\GuzzleHttp\Exception\ClientException $e) {
            $response = $e->getResponse();
            $errorData = json_decode($response->getBody(), true);
            
            return response()->json([
                'status' => false,
                'message' => 'Token Google không hợp lệ: ' . ($errorData['error_description'] ?? 'Unknown error'),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Lỗi khi đăng nhập bằng Google: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Đăng ký bằng Google OAuth (Google Identity Services)
     */
    public function googleRegister(Request $request)
    {
        try {
            $googleToken = $request->input('token');
            if (!$googleToken) {
                return response()->json(['status' => false, 'message' => 'Thiếu Google token.'], 400);
            }

            // Xác thực token Google bằng Google Identity Services
            $client = new \GuzzleHttp\Client();
            $response = $client->get('https://oauth2.googleapis.com/tokeninfo', [
                'query' => ['id_token' => $googleToken]
            ]);
            
            if ($response->getStatusCode() !== 200) {
                return response()->json(['status' => false, 'message' => 'Token Google không hợp lệ.'], 400);
            }
            
            $googleData = json_decode($response->getBody(), true);

            // Kiểm tra client_id để đảm bảo token từ đúng ứng dụng
            $expectedClientId = config('services.google.client_id');
            if ($googleData['aud'] !== $expectedClientId) {
                return response()->json([
                    'status' => false,
                    'message' => 'Token không khớp với ứng dụng.',
                ], 400);
            }

            if (!isset($googleData['email']) || !isset($googleData['email_verified']) || !$googleData['email_verified']) {
                return response()->json(['status' => false, 'message' => 'Email Google chưa được xác thực.'], 400);
            }

            // Nếu đã có user => báo lỗi
            if (User::where('email', $googleData['email'])->exists()) {
                return response()->json([
                    'status' => false,
                    'message' => 'Tài khoản Google này đã tồn tại. Vui lòng đăng nhập.',
                ], 409);
            }

            // Generate unique name if needed
            $baseName = $googleData['name'] ?? $googleData['email'];
            $name = $baseName;
            $counter = 1;
            
            while (User::where('name', $name)->exists()) {
                $name = $baseName . ' (' . $counter . ')';
                $counter++;
            }

            // Tạo user mới
            $user = User::create([
                'name' => $name,
                'email' => $googleData['email'],
                'google_id' => $googleData['sub'],
                'avatar' => $googleData['picture'] ?? null,
                'email_verified_at' => now(),
                'password' => Hash::make(uniqid()), // tạo mật khẩu ngẫu nhiên
            ]);

            // Tạo token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'status' => true,
                'message' => 'Đăng ký bằng Google thành công',
                'user' => $user,
                'token' => $token,
            ], 201);
        } catch (\GuzzleHttp\Exception\ClientException $e) {
            $response = $e->getResponse();
            $errorData = json_decode($response->getBody(), true);
            
            return response()->json([
                'status' => false,
                'message' => 'Token Google không hợp lệ: ' . ($errorData['error_description'] ?? 'Unknown error'),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Lỗi khi đăng ký bằng Google: ' . $e->getMessage(),
            ], 500);
        }
    }
}
