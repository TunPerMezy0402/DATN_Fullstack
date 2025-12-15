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
use App\Http\Controllers\Api\client\ClientChatController;


// ==== ADMIN CONTROLLERS ====
use App\Http\Controllers\Api\admin\AdminController;
use App\Http\Controllers\Api\admin\UserController;
use App\Http\Controllers\Api\admin\ProductController;
use App\Http\Controllers\Api\admin\CategoryController;
use App\Http\Controllers\Api\admin\AttributeController;
use App\Http\Controllers\Api\admin\ProductVariantController;
use App\Http\Controllers\Api\admin\AddressBookController;
use App\Http\Controllers\Api\admin\CouponController;
use App\Http\Controllers\Api\admin\OrderController;
use App\Http\Controllers\Api\admin\AdminChatController;
use App\Http\Controllers\Api\admin\AdminProductReviewController;


use App\Http\Controllers\Api\Admin\BannerController;
use App\Http\Controllers\Api\Admin\BannerImageController;
use App\Http\Controllers\Api\Client\HomeBannerController;


Route::prefix('auth')->group(function () {
    // Public routes
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('google', [AuthController::class, 'googleLogin']);

    // Password reset routes
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::get('/password/reset/{token}', function ($token) {
    $email = request()->query('email');
    return redirect(
        config('app.frontend_url')
        . "/reset-password?token={$token}&email=" . urlencode($email)
    );
})->name('password.reset');



Route::prefix('uploads')->middleware('auth:sanctum')->group(function () {
    Route::post('/', [UploadController::class, 'upload']);
    Route::post('/multiple', [UploadController::class, 'uploadMultiple']);
    Route::delete('/', [UploadController::class, 'delete']);
});

Route::get('/', [HomeClientController::class, 'index']);

Route::get('categories', [CategoryClientController::class, 'getCategoriesWithProducts']);

Route::prefix('client/products')->group(function () {
    Route::get('/', [ProductClientController::class, 'getAllProducts']);
    Route::get('/brands', [ProductClientController::class, 'getBrands']);
    Route::get('/sizes', [ProductClientController::class, 'getSizes']);
    Route::get('/colors', [ProductClientController::class, 'getColors']);
    Route::get('/{id}', [ProductClientController::class, 'getProductDetail']);
});


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
Route::adminApiResource('admin/address-book', AddressBookController::class);
Route::adminApiResource('admin/coupons', CouponController::class);
Route::adminApiResource('admin/orders-admin', OrderController::class);



Route::post('/vnpay/ipn', [PaymentController::class, 'vnpay_ipn'])
    ->name('payment.vnpay.ipn');

Route::get('/vnpay/return', [PaymentController::class, 'vnpay_return'])
    ->name('payment.vnpay.return');

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

    Route::get('/transactions', [PaymentController::class, 'get_all_transactions'])
        ->name('admin.transactions.index');

});

Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    
    Route::get('orders/{id}/return-requests', [OrderController::class, 'returnRequests']);
    Route::post('orders/{orderId}/return-requests/{returnRequestId}/approve', [OrderController::class, 'approveReturn']);
    Route::post('orders/{orderId}/return-requests/{returnRequestId}/reject', [OrderController::class, 'rejectReturn']);
    Route::get('orders/{orderId}/return-requests/{returnRequestId}', [OrderController::class, 'showReturnRequest']);
    Route::post('orders/{orderId}/return-requests/{returnRequestId}/items/{itemId}/approve', [OrderController::class, 'approveReturnItem']);
    Route::post('orders/{orderId}/return-requests/{returnRequestId}/items/{itemId}/reject', [OrderController::class, 'rejectReturnItem']);
    Route::put('orders/{orderId}/return-requests/{returnRequestId}/items/{itemId}/response', [OrderController::class, 'updateReturnItemResponse']);
    
    // ✅ THÊM ROUTE NÀY
    Route::post('orders/{orderId}/return-requests/{returnRequestId}/refund-shipping', [OrderController::class, 'refundShipping']);
});


Route::prefix('admin/product-reviews')
    // ->middleware(['auth:sanctum', 'admin']) // comment nếu đã có middleware
    ->name('admin.product-reviews.')
    ->group(function () {
        // Thống kê
        Route::get('/statistics', [ProductReviewController::class, 'statistics'])
            ->name('statistics');
        
        // Bulk actions
        Route::post('/bulk-approve', [ProductReviewController::class, 'bulkApprove'])
            ->name('bulk-approve');
        
        Route::post('/bulk-reject', [ProductReviewController::class, 'bulkReject'])
            ->name('bulk-reject');
        
        Route::post('/bulk-delete', [ProductReviewController::class, 'bulkDelete'])
            ->name('bulk-delete');
        
        Route::post('/bulk-restore', [ProductReviewController::class, 'bulkRestore'])
            ->name('bulk-restore');
        
        Route::post('/bulk-force-delete', [ProductReviewController::class, 'bulkForceDelete'])
            ->name('bulk-force-delete');
    });



Route::middleware(['auth:sanctum', 'admin'])->prefix('admin/chat')->group(function () {
    
    // ========== DASHBOARD & STATS ==========
    Route::get('/dashboard', [AdminChatController::class, 'dashboard']);
    Route::get('/unread-count', [AdminChatController::class, 'unreadCount']);
    
    // ========== SEARCH ==========
    Route::get('/search', [AdminChatController::class, 'search']);
    
    // ========== AGENTS MANAGEMENT ==========
    Route::prefix('agents')->group(function () {
        Route::get('/list', [AdminChatController::class, 'getAgents']);
        Route::get('/{id}/stats', [AdminChatController::class, 'getAgentStats']);
    });
    
    // ========== ROOMS LISTING ==========
    Route::get('/', [AdminChatController::class, 'index']); 
    
    // ========== ROOM OPERATIONS ==========
    Route::prefix('rooms/{id}')->group(function () {
        // Get room details
        Route::get('/', [AdminChatController::class, 'show']);
        
        // Get messages
        Route::get('/messages', [AdminChatController::class, 'getMessages']);
        
        // Send message
        Route::post('/send', [AdminChatController::class, 'sendMessage']);
        
        // Close room
        Route::post('/close', [AdminChatController::class, 'closeRoom']);
        
        // Assign agent
        Route::post('/assign-agent', [AdminChatController::class, 'assignAgent']);
    });
    
    // ========== MESSAGES OPERATIONS ==========
    Route::delete('/messages/{id}', [AdminChatController::class, 'deleteMessage']);
});



Route::middleware('auth:sanctum')->group(function () {

    Route::get('/client/chat', [ClientChatController::class, 'index']);
    Route::post('/client/chat/create', [ClientChatController::class, 'createRoom']);
    Route::get('/client/chat/unread-count', [ClientChatController::class, 'unreadCount']);
    Route::get('/client/chat/search', [ClientChatController::class, 'search']);

    Route::get('/client/chat/{id}', [ClientChatController::class, 'show']);
    Route::get('/client/chat/{id}/messages', [ClientChatController::class, 'getMessages']);
    Route::post('/client/chat/{id}/send', [ClientChatController::class, 'sendMessage']);
    Route::post('/client/chat/{id}/close', [ClientChatController::class, 'closeRoom']);
    Route::post('/client/chat/{id}/rate', [ClientChatController::class, 'rateAgent']);

    Route::get('/messages/{messageId}/image-info', [ClientChatController::class, 'getImageInfo']);
    Route::delete('/messages/{messageId}/image', [ClientChatController::class, 'deleteImage']);

    Route::get('/notifications', [ClientChatController::class, 'getNotifications']);
    Route::post('/notifications/{id}/read', [ClientChatController::class, 'markNotificationAsRead']);
    Route::post('/notifications/read-all', [ClientChatController::class, 'markAllNotificationsAsRead']);

    Route::get('/agents/available', [ClientChatController::class, 'getAvailableAgents']);
    Route::get('/agents/{id}/stats', [ClientChatController::class, 'getAgentStats']);
});


Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    // Product Reviews Management
    Route::get('product-reviews', [AdminProductReviewController::class, 'index']);
    Route::get('product-reviews/stats', [AdminProductReviewController::class, 'stats']);
    Route::get('product-reviews/{id}', [AdminProductReviewController::class, 'show']);
    Route::put('product-reviews/{id}', [AdminProductReviewController::class, 'update']);
    Route::delete('product-reviews/{id}', [AdminProductReviewController::class, 'destroy']);
    
    // Bulk actions
    Route::put('product-reviews/bulk-approve', [AdminProductReviewController::class, 'bulkApprove']);
    Route::delete('product-reviews/bulk-delete', [AdminProductReviewController::class, 'bulkDelete']);
});