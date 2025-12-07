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

use App\Http\Controllers\Api\admin\BannerController;



// Banner routes - Admin (auth + admin)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('banners/trash', [BannerController::class, 'trash']);
    Route::post('banners/{id}/restore', [BannerController::class, 'restore']);
    Route::delete('banners/{id}/force', [BannerController::class, 'forceDelete']);
    Route::apiResource('banners', BannerController::class);
});

use App\Http\Controllers\Api\UploadController;




use App\Http\Controllers\Api\client\HomeClientController;









// ----------------------

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('google', [AuthController::class, 'googleLogin']);

});

// Trang Home (API)
Route::get('/', [HomeClientController::class, 'index']);
Route::get('products', [HomeClientController::class, 'index']);

// Upload routes
Route::post('uploads', [UploadController::class, 'upload'])->middleware('auth:sanctum');
Route::post('uploads/multiple', [UploadController::class, 'uploadMultiple'])->middleware('auth:sanctum');
Route::delete('uploads', [UploadController::class, 'delete'])->middleware('auth:sanctum');








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
Route::adminApiResource('admin/cart', CartController::class);
Route::adminApiResource('admin/address_book', AddressBookController::class);


