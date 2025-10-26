<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\admin\HomeController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\admin\AdminController;
use App\Http\Controllers\Api\admin\UserController;
use App\Http\Controllers\Api\admin\ProductController;
use App\Http\Controllers\Api\admin\CategoryController;
use App\Http\Controllers\Api\admin\AttributeController;
use App\Http\Controllers\Api\admin\ProductVariantController;
use App\Http\Controllers\Api\admin\ProductReviewController;
use App\Http\Controllers\Api\admin\SupportTicketController;
use App\Http\Controllers\Api\admin\WishlistController;
use App\Http\Controllers\Api\admin\CartController;
use App\Http\Controllers\Api\admin\AddressBookController;
use App\Http\Controllers\Api\admin\CouponController;



use App\Http\Controllers\Api\UploadController;




use App\Http\Controllers\Api\client\HomeClientController;
use App\Http\Controllers\Api\client\ProductClientController;
use App\Http\Controllers\Api\client\LikeController;
use App\Http\Controllers\Api\client\CartClientController;
use App\Http\Controllers\Api\client\OrderClientController;
use App\Http\Controllers\Api\client\CategoryClientController;








// ----------------------

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('google', [AuthController::class, 'googleLogin']);

});


// Upload routes
Route::post('uploads', [UploadController::class, 'upload'])->middleware('auth:sanctum');
Route::post('uploads/multiple', [UploadController::class, 'uploadMultiple'])->middleware('auth:sanctum');
Route::delete('uploads', [UploadController::class, 'delete'])->middleware('auth:sanctum');



Route::get('/', [HomeClientController::class, 'index']);
Route::get('products', [ProductClientController::class, 'getAllProducts']);
Route::get('products/{id}', [ProductClientController::class, 'getProductDetail']);

Route::post('products/{id}/like', [LikeController::class, 'like']);
Route::delete('products/{id}/unlike', [LikeController::class, 'unlike']);
Route::get('products/{id}/is-liked', [LikeController::class, 'isLiked']);
Route::get('user/liked-products', [LikeController::class, 'likedProducts']);


Route::get('categories', [CategoryClientController::class, 'getCategoriesWithProducts']);
Route::get('categories/{id}', [CategoryClientController::class, 'getCategoryProducts']);





Route::get('/cart', [CartClientController::class, 'index']);
Route::post('/cart/add', [CartClientController::class, 'add']);
Route::put('/cart/update/{id}', [CartClientController::class, 'update']);
Route::delete('/cart/remove/{id}', [CartClientController::class, 'remove']);
Route::delete('/cart/clear', [CartClientController::class, 'clear']);

// ORDER
Route::get('/orders', [OrderClientController::class, 'index']);
Route::get('/orders/{id}', [OrderClientController::class, 'show']);
Route::post('/orders', [OrderClientController::class, 'store']);





// Quân









//Nam














// ----------------------
// Admin Dashboard (API)
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/admin', [AdminController::class, 'index']);
});


Route::macro('adminApiResource', function ($prefix, $controller) {
    Route::prefix($prefix)->middleware(['auth:sanctum', 'admin'])->name(str_replace('/', '.', $prefix) . '.')->group(function () use ($controller) {

        Route::get('/trash', [$controller, 'trash']);              // danh sách đã xóa
        Route::get('/{id}', [$controller, 'show']);               // xem chi tiết
        Route::post('/', [$controller, 'store']);                 // tạo mới
        Route::put('/{id}', [$controller, 'update']);             // cập nhật
        Route::delete('/{id}', [$controller, 'destroy']);         // xóa mềm
        Route::post('/{id}/restore', [$controller, 'restore']);   // phục hồi
        Route::delete('/{id}/force-delete', [$controller, 'forceDelete']); // xóa vĩnh viễn

        // Tùy chọn: danh sách chính
        Route::get('/', [$controller, 'index']);
    });
});

// ----------------------
// Các API Admin Resource
Route::adminApiResource('admin/users', UserController::class);
Route::adminApiResource('admin/products', ProductController::class);
Route::adminApiResource('admin/categories', CategoryController::class);
Route::adminApiResource('admin/attributes', AttributeController::class);
Route::adminApiResource('admin/productvariants', ProductVariantController::class);
Route::adminApiResource('admin/support_tickets', SupportTicketController::class);
Route::adminApiResource('admin/wishlists', WishlistController::class);
Route::adminApiResource('admin/address_book', AddressBookController::class);
Route::adminApiResource('admin/coupons', CouponController::class);


