<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetSecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Set Cross-Origin-Opener-Policy to allow Google OAuth popups
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        
        // Set Cross-Origin-Embedder-Policy to allow embedding
        $response->headers->set('Cross-Origin-Embedder-Policy', 'unsafe-none');
        
        // Set Cross-Origin-Resource-Policy
        $response->headers->set('Cross-Origin-Resource-Policy', 'cross-origin');
        
        // Allow credentials for cross-origin requests
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        
        // Set X-Frame-Options to allow embedding in iframes if needed
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        return $response;
    }
}
