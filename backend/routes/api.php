<?php

use Illuminate\Support\Facades\Route;

// ==== AUTH CONTROLLERS ====
use App\Http\Controllers\Api\AuthController;

// ==== UPLOAD CONTROLLERS ====
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\PaymentController;

// ==== CLIENT CONTROLLERS ====
use App\Http\Controllers\Api\client\HomeClientController;
use App\Http\Controllers\Api\client\ProductClientController;
use App\Http\Controllers\Api\client\LikeController;
use App\Http\Controllers\Api\client\CartClientController;
use App\Http\Controllers\Api\client\OrderClientController;
use App\Http\Controllers\Api\client\CategoryClientController;
use App\Http\Controllers\Api\client\UserProfileController;
use App\Http\Controllers\Api\client\ProductReviewController;


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
use App\Http\Controllers\Api\admin\AddressBookController;

use App\Http\Controllers\Api\admin\CouponController;
use App\Http\Controllers\Api\admin\OrderController;


use App\Http\Controllers\Api\Admin\BannerController;
use App\Http\Controllers\Api\Admin\BannerImageController;
use App\Http\Controllers\Api\Client\HomeBannerController;



// Banner routes - Admin (có middleware auth)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('banners/trash', [BannerController::class, 'trash']);
    Route::post('banners/{id}/restore', [BannerController::class, 'restore']);
    Route::delete('banners/{id}/force', [BannerController::class, 'forceDelete']);
    Route::apiResource('banners', BannerController::class);

    Route::get('banner-images/trash', [BannerImageController::class, 'trash']);
    Route::post('banner-images/{id}/restore', [BannerImageController::class, 'restore']);
    Route::delete('banner-images/{id}/force', [BannerImageController::class, 'forceDelete']);

    Route::post('banners/{banner}/images', [BannerImageController::class, 'store']);
    Route::match(['put', 'patch'], 'banner-images/{image}', [BannerImageController::class, 'update']);
    Route::delete('banner-images/{image}', [BannerImageController::class, 'destroy']);
});

// Banner routes - Client (không cần auth)
Route::get('banners/active', [HomeBannerController::class, 'active']);
Route::get('banners', [HomeBannerController::class, 'index']);



/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Phiên bản refactor chuẩn RESTful – Laravel 12+
| Tách biệt rõ client / admin / upload / auth
|--------------------------------------------------------------------------
*/


// =====================================================================
// 🔐 AUTH ROUTES
// =====================================================================








// ----------------------


Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('google', [AuthController::class, 'googleLogin']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);

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
// 🌐 CLIENT ROUTES
// =====================================================================

Route::get('/', [HomeClientController::class, 'index']);

Route::get('categories', [CategoryClientController::class, 'getCategoriesWithProducts']);


// Sản phẩm
Route::prefix('client/products')->group(function () {
    Route::get('/', [ProductClientController::class, 'getAllProducts']);
    Route::get('/brands', [ProductClientController::class, 'getBrands']);
    Route::get('/sizes', [ProductClientController::class, 'getSizes']);
    Route::get('/colors', [ProductClientController::class, 'getColors']);
    Route::get('/{id}', [ProductClientController::class, 'getProductDetail']);
});
// Trang chủ


// Các route client chung
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/profile', [UserProfileController::class, 'show']);
    Route::put('/profile', [UserProfileController::class, 'update']);
    Route::post('/profile/address', [UserProfileController::class, 'addAddress']);
    Route::put('/profile/address/{id}', [UserProfileController::class, 'updateAddress']);
    Route::delete('/profile/address/{id}', [UserProfileController::class, 'deleteAddress']);
    Route::post('/profile/change-password', [UserProfileController::class, 'changePassword']);


    // Like sản phẩm
    Route::post('products/{id}/like', [LikeController::class, 'like']);
    Route::delete('products/{id}/unlike', [LikeController::class, 'unlike']);
    Route::get('products/{id}/is-liked', [LikeController::class, 'isLiked']);
    Route::get('user/liked-products', [LikeController::class, 'likedProducts']);


    // Danh mục
    Route::get('categories', [CategoryClientController::class, 'getCategoriesWithProducts']);
    Route::get('categories/{id}', [CategoryClientController::class, 'getCategoryProducts']);

    // Giỏ hàng
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartClientController::class, 'index']);
        Route::post('/add', [CartClientController::class, 'add']);
        Route::put('/update/{id}', [CartClientController::class, 'update']);
        Route::delete('/remove/{id}', [CartClientController::class, 'remove']);
        Route::delete('/clear', [CartClientController::class, 'clear']);
    });

    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderClientController::class, 'index']);
        Route::post('/', [OrderClientController::class, 'store']);
        Route::get('/{id}', [OrderClientController::class, 'show']);
        Route::post('/{id}/cancel', [OrderClientController::class, 'cancel']);
        Route::post('/{id}/return', [OrderClientController::class, 'return']);
        Route::post('/{id}/confirm-received', [OrderClientController::class, 'confirmReceived']);
        Route::get('/{id}/payment-status', [OrderClientController::class, 'paymentStatus']);
        Route::get('/{id}/shipping-logs', [OrderClientController::class, 'shippingLogs']);

        Route::get('/{id}/return-requests', [OrderClientController::class, 'returnRequests']);
        Route::get('/{id}/cancel-logs', [OrderClientController::class, 'cancelLogs']);
    });

    Route::prefix('product-reviews')->group(function () {
        Route::post('/', [ProductReviewController::class, 'store']);
        /* Route::put('/{id}', [ProductReviewController::class, 'update']);   */
        Route::delete('/{id}', [ProductReviewController::class, 'destroy']);
        Route::get('/{productId}/reviews', [ProductReviewController::class, 'index']);
    });


});

Route::prefix('products')->group(function () {
    Route::get('/{productId}/reviews', [ProductReviewController::class, 'index']);
});

// =====================================================================
// 🧑‍💼 ADMIN ROUTES
// =====================================================================

// Dashboard
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('admin', [AdminController::class, 'index']);
});

// Macro chuẩn CRUD cho Admin Resources
Route::macro('adminApiResource', function ($prefix, $controller) {
    Route::prefix($prefix)
        // ->middleware(['auth:sanctum', 'admin']) // ❌ comment dòng này
        ->name(str_replace('/', '.', $prefix) . '.')
        ->group(function () use ($controller) {
            Route::get('/', [$controller, 'index']);
            Route::get('/trash', [$controller, 'trash']);
            Route::get('/{id}', [$controller, 'show']);
            Route::post('/', [$controller, 'store']);
            Route::match(['put', 'patch'], '/{id}', [$controller, 'update']);
            Route::delete('/{id}', [$controller, 'destroy']);
            Route::post('/{id}/restore', [$controller, 'restore']);
            Route::delete('/{id}/force-delete', [$controller, 'forceDelete']);
        });
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/upload', [OrderController::class, 'upload']);
});


// Admin resources
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




// ==================== PUBLIC ROUTES (NO AUTH) ====================
// ✅ VNPay IPN webhook - VNPay gọi tới đây khi thanh toán xong
Route::post('/vnpay/ipn', [PaymentController::class, 'vnpay_ipn'])
    ->name('payment.vnpay.ipn');

// ✅ VNPay Return URL - User redirect về đây sau khi thanh toán
Route::get('/vnpay/return', [PaymentController::class, 'vnpay_return'])
    ->name('payment.vnpay.return');

// ==================== AUTHENTICATED ROUTES ====================
Route::middleware('auth:sanctum')->group(function () {

    // ✅ Tạo payment URL cho VNPay
    Route::post('/vnpay_payment', [PaymentController::class, 'vnpay_payment'])
        ->name('payment.vnpay');

    // ✅ Kiểm tra trạng thái thanh toán
    Route::get('/payment/status/{orderId}', [PaymentController::class, 'check_payment_status'])
        ->name('payment.status');

    Route::get('/orders/{orderId}/payment-status', [PaymentController::class, 'check_payment_status'])
        ->name('payment.order.status');

    // Lấy danh sách transactions của một order
    Route::get('/orders/{orderId}/transactions', [PaymentController::class, 'get_order_transactions'])
        ->name('payment.order.transactions');

    Route::post('/orders/{orderId}/repay', [PaymentController::class, 'repay'])
        ->name('payment.repay');


});

// ==================== ADMIN ROUTES ====================
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {

    // Lấy tất cả transactions (có filter)
    Route::get('/transactions', [PaymentController::class, 'get_all_transactions'])
        ->name('admin.transactions.index');

});

// Admin Order Routes
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    // Existing routes...
    
    // ✅ Return Request Management
    Route::get('orders/{id}/return-requests', [OrderController::class, 'returnRequests']);
    Route::post('orders/{orderId}/return-requests/{returnRequestId}/approve', [OrderController::class, 'approveReturn']);
    Route::post('orders/{orderId}/return-requests/{returnRequestId}/reject', [OrderController::class, 'rejectReturn']);
});
