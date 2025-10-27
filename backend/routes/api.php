<?php

use Illuminate\Support\Facades\Route;

// ==== AUTH CONTROLLERS ====
use App\Http\Controllers\Api\AuthController;

// ==== UPLOAD CONTROLLERS ====
use App\Http\Controllers\Api\UploadController;

// ==== CLIENT CONTROLLERS ====
use App\Http\Controllers\Api\client\HomeClientController;
use App\Http\Controllers\Api\client\ProductClientController;
use App\Http\Controllers\Api\client\LikeController;
use App\Http\Controllers\Api\client\CartClientController;
use App\Http\Controllers\Api\client\OrderClientController;
use App\Http\Controllers\Api\client\CategoryClientController;
use App\Http\Controllers\Api\client\ProductVariantClientController;
// ==== ADMIN CONTROLLERS ====
use App\Http\Controllers\Api\admin\AdminController;
use App\Http\Controllers\Api\admin\UserController;
use App\Http\Controllers\Api\admin\ProductController;
use App\Http\Controllers\Api\admin\CategoryController;
use App\Http\Controllers\Api\admin\AttributeController;
use App\Http\Controllers\Api\admin\ProductVariantController;
/* use App\Http\Controllers\Api\admin\ProductReviewController; */
use App\Http\Controllers\Api\admin\SupportTicketController;
use App\Http\Controllers\Api\admin\WishlistController;
use App\Http\Controllers\Api\admin\CartController;
use App\Http\Controllers\Api\admin\AddressBookController;
use App\Http\Controllers\Api\admin\CouponController;
use App\Http\Controllers\Api\admin\OrderController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Phiên bản refactor chuẩn RESTful – Laravel 10+
| Tách biệt rõ client / admin / upload / auth
|--------------------------------------------------------------------------
*/

// =====================================================================
// 🔐 AUTH ROUTES
// =====================================================================
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('google', [AuthController::class, 'googleLogin']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});


// =====================================================================
// 📤 UPLOAD ROUTES
// =====================================================================
Route::prefix('uploads')->middleware('auth:sanctum')->group(function () {
    Route::post('/', [UploadController::class, 'upload']);
    Route::post('/multiple', [UploadController::class, 'uploadMultiple']);
    Route::delete('/', [UploadController::class, 'delete']);
});

// =====================================================================

    Route::get('/', [HomeClientController::class, 'index']);

    Route::get('products', [ProductClientController::class, 'getAllProducts']);
    Route::get('products/{id}', [ProductClientController::class, 'getProductDetail']);

// 🛍️ CLIENT ROUTES
// =====================================================================
Route::prefix('client')->group(function () {

    Route::post('products/{id}/like', [LikeController::class, 'like']);
    Route::delete('products/{id}/unlike', [LikeController::class, 'unlike']);
    Route::get('products/{id}/is-liked', [LikeController::class, 'isLiked']);
    Route::get('user/liked-products', [LikeController::class, 'likedProducts']);

    // 🗂️ Danh mục
    Route::get('categories', [CategoryClientController::class, 'getCategoriesWithProducts']);
    Route::get('categories/{id}', [CategoryClientController::class, 'getCategoryProducts']);

// Variants (client)
Route::get('variants', [ProductVariantClientController::class, 'index']);
Route::get('variants/{id}', [ProductVariantClientController::class, 'show']);
Route::get('products/{productId}/variants', [ProductVariantClientController::class, 'byProduct']);



    // 🛒 Giỏ hàng
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartClientController::class, 'index']);
        Route::post('/add', [CartClientController::class, 'add']);
        Route::put('/update/{id}', [CartClientController::class, 'update']);
        Route::delete('/remove/{id}', [CartClientController::class, 'remove']);
        Route::delete('/clear', [CartClientController::class, 'clear']);
    });

    // 📦 Đơn hàng (chỉ user đăng nhập)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('orders', [OrderClientController::class, 'index']);
        Route::get('orders/{id}', [OrderClientController::class, 'show']);
        Route::post('orders', [OrderClientController::class, 'store']);
    });
});


// =====================================================================
// 🧑‍💼 ADMIN ROUTES
// =====================================================================

// Dashboard
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('admin', [AdminController::class, 'index']);
});


// Macro: chuẩn CRUD Admin Resource
Route::macro('adminApiResource', function ($prefix, $controller) {
    Route::prefix($prefix)
        ->middleware(['auth:sanctum', 'admin'])
        ->name(str_replace('/', '.', $prefix) . '.')
        ->group(function () use ($controller) {
            Route::get('/', [$controller, 'index']);                  // Danh sách
            Route::get('/trash', [$controller, 'trash']);              // Danh sách đã xóa
            Route::get('/{id}', [$controller, 'show']);               // Chi tiết
            Route::post('/', [$controller, 'store']);                 // Tạo mới
            Route::match(['put', 'patch'], '/{id}', [$controller, 'update']); // Cập nhật
            Route::delete('/{id}', [$controller, 'destroy']);         // Xóa mềm
            Route::post('/{id}/restore', [$controller, 'restore']);   // Phục hồi
            Route::delete('/{id}/force-delete', [$controller, 'forceDelete']); // Xóa vĩnh viễn
        });
});


// =====================================================================
// 🧾 ADMIN RESOURCES
// =====================================================================
Route::adminApiResource('admin/users', UserController::class);
Route::adminApiResource('admin/products', ProductController::class);
Route::adminApiResource('admin/categories', CategoryController::class);
Route::adminApiResource('admin/attributes', AttributeController::class);
Route::adminApiResource('admin/product-variants', ProductVariantController::class);
/* Route::adminApiResource('admin/product-reviews', ProductReviewController::class); */
Route::adminApiResource('admin/support-tickets', SupportTicketController::class);
Route::adminApiResource('admin/wishlists', WishlistController::class);
Route::adminApiResource('admin/address-book', AddressBookController::class);
Route::adminApiResource('admin/coupons', CouponController::class);
Route::adminApiResource('admin/orders-admin', OrderController::class);
