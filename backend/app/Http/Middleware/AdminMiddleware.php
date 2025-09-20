<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Nếu không đăng nhập và ko phải là admin thì ko dc phep truy cập

        if(!Auth::check() || !Auth::user()->isRoleAdmin()) {
            return redirect()->route('home')->withErrors('Bạn không có quyền truy cập vào trang này');
        }
        return $next($request);
    }
}
