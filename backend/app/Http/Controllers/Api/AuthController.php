<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\Events\PasswordReset;
use App\Models\User;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $baseName = $validated['name'];
        $name = $baseName;
        $counter = 1;
        
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
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Đăng nhập thành công',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => true,
            'message' => 'Đăng xuất thành công',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'status' => true,
            'user' => $request->user(),
        ]);
    }

    /**
     * Gửi email đặt lại mật khẩu
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Email không tồn tại trong hệ thống.',
            ], 404);
        }

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'status' => true,
                'message' => 'Đã gửi email khôi phục mật khẩu! Vui lòng kiểm tra hộp thư.',
            ]);
        }

        return response()->json([
            'status' => false,
            'message' => 'Không thể gửi email. Vui lòng thử lại sau.',
        ], 500);
    }

    /**
     * Đặt lại mật khẩu mới
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'password' => 'required|min:6|confirmed',
        ]);

        // Tìm email từ token trong bảng password_reset_tokens
        $tokenRecord = DB::table('password_reset_tokens')
            ->whereNotNull('token')
            ->get()
            ->first(function ($record) use ($request) {
                return Hash::check($request->token, $record->token);
            });

        if (!$tokenRecord) {
            return response()->json([
                'status' => false,
                'message' => 'Token không hợp lệ hoặc đã hết hạn.',
            ], 400);
        }

        $status = Password::reset(
            [
                'email' => $tokenRecord->email,
                'password' => $request->password,
                'password_confirmation' => $request->password_confirmation,
                'token' => $request->token,
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));

                $user->save();
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'status' => true,
                'message' => 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.',
            ]);
        }

        return response()->json([
            'status' => false,
            'message' => 'Token không hợp lệ hoặc đã hết hạn.',
        ], 400);
    }

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

            $baseName = $googleData['name'] ?? $googleData['email'];
            $name = $baseName;
            $counter = 1;
            
            while (User::where('name', $name)->where('email', '!=', $googleData['email'])->exists()) {
                $name = $baseName . ' (' . $counter . ')';
                $counter++;
            }

            $user = User::updateOrCreate(
                ['email' => $googleData['email']],
                [
                    'name' => $name,
                    'google_id' => $googleData['sub'],
                    'avatar' => $googleData['picture'] ?? null,
                    'email_verified_at' => now(),
                ]
            );

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

    public function googleRegister(Request $request)
    {
        try {
            $googleToken = $request->input('token');
            if (!$googleToken) {
                return response()->json(['status' => false, 'message' => 'Thiếu Google token.'], 400);
            }

            $client = new \GuzzleHttp\Client();
            $response = $client->get('https://oauth2.googleapis.com/tokeninfo', [
                'query' => ['id_token' => $googleToken]
            ]);
            
            if ($response->getStatusCode() !== 200) {
                return response()->json(['status' => false, 'message' => 'Token Google không hợp lệ.'], 400);
            }
            
            $googleData = json_decode($response->getBody(), true);

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

            if (User::where('email', $googleData['email'])->exists()) {
                return response()->json([
                    'status' => false,
                    'message' => 'Tài khoản Google này đã tồn tại. Vui lòng đăng nhập.',
                ], 409);
            }

            $baseName = $googleData['name'] ?? $googleData['email'];
            $name = $baseName;
            $counter = 1;
            
            while (User::where('name', $name)->exists()) {
                $name = $baseName . ' (' . $counter . ')';
                $counter++;
            }

            $user = User::create([
                'name' => $name,
                'email' => $googleData['email'],
                'google_id' => $googleData['sub'],
                'avatar' => $googleData['picture'] ?? null,
                'email_verified_at' => now(),
                'password' => Hash::make(uniqid()),
            ]);

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