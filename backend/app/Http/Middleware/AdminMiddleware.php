<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        // Not authenticated
            if (!$user) {
                $context = [
                    'path' => $request->path(),
                    'method' => $request->method(),
                    'expectsJson' => $request->expectsJson(),
                    'auth_check' => auth()->check(),
                    'authorization_header' => $request->header('Authorization') ? 'present' : 'missing',
                    'cookie_keys' => array_keys($request->cookies->all()),
                    'ip' => $request->ip(),
                ];
                Log::warning('AdminMiddleware: unauthenticated request denied', $context);

                if ($request->expectsJson()) {
                    return response()->json(['success' => false, 'message' => 'Chưa xác thực. Vui lòng đăng nhập.'], 401);
                }

                abort(401, 'Chưa xác thực. Vui lòng đăng nhập.');
            }

        // Preferred: model helper isAdmin()
        if (method_exists($user, 'isAdmin') && $user->isAdmin()) {
            return $next($request);
        }

        // Direct role field check (fallback)
        if (isset($user->role) && $user->role === 'admin') {
            return $next($request);
        }

        // Support Spatie package if present
        $hasRole = null;
        if (method_exists($user, 'hasRole')) {
            try {
                $hasRole = $user->hasRole('admin');
            } catch (\Throwable $e) {
                Log::error('AdminMiddleware: error calling hasRole', ['exception' => $e->getMessage()]);
                $hasRole = null;
            }

            if ($hasRole) {
                return $next($request);
            }
        }

        // If we reach here, user is authenticated but not an admin
        $context = [
            'path' => $request->path(),
            'method' => $request->method(),
            'user_id' => $user->id ?? null,
            'user_role_field' => $user->role ?? null,
            'isAdmin_helper' => (method_exists($user, 'isAdmin') ? $user->isAdmin() : null),
            'hasRole_admin' => $hasRole,
            'expectsJson' => $request->expectsJson(),
        ];
        Log::warning('AdminMiddleware: forbidden (not admin)', $context);

        if ($request->expectsJson()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền truy cập.'], 403);
        }

        abort(403, 'Bạn không có quyền truy cập.');
    }
}
