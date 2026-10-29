<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Plant as Plant;
use App\Http\Controllers\Api\Admin as Admin;

/* ======================================================================
   API 路由：bootstrap/app.php 中 apiPrefix = 'shuma'
   前台 API 统一挂在 /shuma/api/xxx（避开 web.php 的 /shuma/xxx Blade 页面）
   后台 API 已经是 /shuma/api/admin/xxx
   ====================================================================== */

Route::prefix('api')->group(function () {

/* ==================== 前台 API —— 公共（无需登录） ==================== */

Route::get('home', [Plant\HomeController::class, 'index']);
Route::get('banners', [Plant\HomeController::class, 'banners']);
Route::get('categories', [Plant\CategoryController::class, 'tree']);
Route::get('brands', [Plant\BrandController::class, 'index']);
Route::get('products', [Plant\ProductController::class, 'index']);
Route::get('products/{id}', [Plant\ProductController::class, 'show']);
Route::get('products/{id}/reviews', [Plant\ProductController::class, 'reviews']);

// 优惠券模板（首页券区公开可见；领取仍需登录）
Route::get('coupons/templates', [Plant\CouponController::class, 'templates']);

// 前台认证
Route::post('auth/register', [Plant\AuthController::class, 'register']);
Route::post('auth/login', [Plant\AuthController::class, 'login']);

/* ==================== 前台 API —— 会员（token, ability=member） ==================== */

Route::middleware(['auth:sanctum', 'abilities:member'])->group(function () {
    Route::post('auth/logout', [Plant\AuthController::class, 'logout']);
    Route::get('auth/me', [Plant\AuthController::class, 'me']);

    Route::put('profile', [Plant\ProfileController::class, 'update']);
    Route::put('profile/password', [Plant\ProfileController::class, 'password']);

    // 收藏
    Route::get('favorites', [Plant\FavoriteController::class, 'index']);
    Route::get('favorites/ids', [Plant\FavoriteController::class, 'ids']);
    Route::post('favorites/toggle', [Plant\FavoriteController::class, 'toggle']);

    // 评价
    Route::post('reviews', [Plant\ReviewController::class, 'store']);

    // 优惠券
    Route::post('coupons/claim', [Plant\CouponController::class, 'claim']);
    Route::get('coupons', [Plant\CouponController::class, 'index']);
    Route::get('coupons/available', [Plant\CouponController::class, 'available']);

    // 收货地址
    Route::get('addresses', [Plant\AddressController::class, 'index']);
    Route::post('addresses', [Plant\AddressController::class, 'store']);
    Route::put('addresses/{id}', [Plant\AddressController::class, 'update']);
    Route::delete('addresses/{id}', [Plant\AddressController::class, 'destroy']);
    Route::put('addresses/{id}/default', [Plant\AddressController::class, 'setDefault']);

    // 订单 —— {orderNo} 必须匹配实际订单号格式（SO+数字）
    Route::get('orders', [Plant\OrderController::class, 'index']);
    Route::get('orders/{orderNo}', [Plant\OrderController::class, 'show'])->where('orderNo', 'SO\d+');
    Route::put('orders/{orderNo}', [Plant\OrderController::class, 'update'])->where('orderNo', 'SO\d+');
    Route::post('orders', [Plant\OrderController::class, 'store']);
    Route::post('orders/{orderNo}/pay', [Plant\OrderController::class, 'pay'])->where('orderNo', 'SO\d+');
    Route::post('orders/{orderNo}/cancel', [Plant\OrderController::class, 'cancel'])->where('orderNo', 'SO\d+');
    Route::post('orders/{orderNo}/confirm', [Plant\OrderController::class, 'confirm'])->where('orderNo', 'SO\d+');
    Route::delete('orders/{orderNo}', [Plant\OrderController::class, 'destroy'])->where('orderNo', 'SO\d+');

    // 退换货
    Route::get('returns', [Plant\ReturnOrderController::class, 'index']);
    Route::post('returns', [Plant\ReturnOrderController::class, 'store']);

    // 购物车（前缀 cart-api，避免与 web.php 的 /cart Blade 页面路由冲突）
    Route::prefix('cart-api')->group(function () {
        Route::get('', [Plant\CartController::class, 'index']);
        Route::get('count', [Plant\CartController::class, 'count']);
        Route::post('', [Plant\CartController::class, 'add']);
        Route::put('{id}', [Plant\CartController::class, 'update'])->whereNumber('id');
        Route::delete('{id}', [Plant\CartController::class, 'remove'])->whereNumber('id');
        Route::delete('', [Plant\CartController::class, 'clear']);
    });

    // 订单反馈 / 留言 / 投诉 / 建议
    Route::get('feedbacks', [Plant\FeedbackController::class, 'index']);
    Route::get('feedbacks/{id}', [Plant\FeedbackController::class, 'show'])->whereNumber('id');
    Route::post('feedbacks', [Plant\FeedbackController::class, 'store']);
});

}); /* end Route::prefix('api') 前台 API */

/* ==================== 后台 API —— 全部挂在 /shuma/api/admin/xxx（避开 web.php 页面路由 /shuma/admin/ 的冲突） ==================== */

Route::prefix('api/admin')->group(function () {

    // 管理员登录（无需 token）
    Route::post('auth/login', [Admin\AuthController::class, 'login']);

    Route::middleware(['auth:admin_sanctum', 'abilities:admin'])->group(function () {
        Route::post('auth/logout', [Admin\AuthController::class, 'logout']);
        Route::get('auth/me', [Admin\AuthController::class, 'me']);
        Route::put('auth/profile', [Admin\AuthController::class, 'updateProfile']);
        Route::put('auth/password', [Admin\AuthController::class, 'updatePassword']);

        Route::get('dashboard', [Admin\DashboardController::class, 'index']);

        // 商品管理
        Route::get('products', [Admin\ProductController::class, 'index']);
        Route::post('products', [Admin\ProductController::class, 'store']);
        Route::get('products/{id}', [Admin\ProductController::class, 'show'])->whereNumber('id');
        Route::put('products/{id}', [Admin\ProductController::class, 'update'])->whereNumber('id');
        Route::delete('products/{id}', [Admin\ProductController::class, 'destroy'])->whereNumber('id');
        Route::put('products/{id}/on-sale', [Admin\ProductController::class, 'setOnSale'])->whereNumber('id');
        Route::put('products/{id}/price', [Admin\ProductController::class, 'setPrice'])->whereNumber('id');

        // 分类管理
        Route::get('categories', [Admin\CategoryController::class, 'index']);
        Route::post('categories', [Admin\CategoryController::class, 'store']);
        Route::put('categories/{id}', [Admin\CategoryController::class, 'update'])->whereNumber('id');
        Route::delete('categories/{id}', [Admin\CategoryController::class, 'destroy'])->whereNumber('id');

        // 品牌管理
        Route::get('brands', [Admin\BrandController::class, 'index']);
        Route::post('brands', [Admin\BrandController::class, 'store']);
        Route::put('brands/{id}', [Admin\BrandController::class, 'update'])->whereNumber('id');
        Route::delete('brands/{id}', [Admin\BrandController::class, 'destroy'])->whereNumber('id');

        // 订单管理 —— {orderNo} 约束为包含数字（排除 stats 等纯单词）
        Route::get('orders', [Admin\OrderController::class, 'index']);
        Route::get('orders/{orderNo}', [Admin\OrderController::class, 'show'])->where('orderNo', '.*\d.*');
        Route::put('orders/{orderNo}/status', [Admin\OrderController::class, 'setStatus'])->where('orderNo', '.*\d.*');

        // 会员管理
        Route::get('members', [Admin\MemberController::class, 'index']);
        Route::post('members', [Admin\MemberController::class, 'store']);
        Route::get('members/{id}', [Admin\MemberController::class, 'show'])->whereNumber('id');
        Route::put('members/{id}', [Admin\MemberController::class, 'update'])->whereNumber('id');
        Route::put('members/{id}/reset-password', [Admin\MemberController::class, 'resetPassword'])->whereNumber('id');
        Route::delete('members/{id}', [Admin\MemberController::class, 'destroy'])->whereNumber('id');

        // 轮播图管理
        Route::get('banners', [Admin\BannerController::class, 'index']);
        Route::post('banners', [Admin\BannerController::class, 'store']);
        Route::put('banners/{id}', [Admin\BannerController::class, 'update'])->whereNumber('id');
        Route::delete('banners/{id}', [Admin\BannerController::class, 'destroy'])->whereNumber('id');

        // 库存管理
        Route::get('inventory', [Admin\InventoryController::class, 'index']);
        Route::get('inventory/stats', [Admin\InventoryController::class, 'stats']);
        Route::get('inventory/logs', [Admin\InventoryController::class, 'logs']);
        Route::put('inventory/{productId}/stock', [Admin\InventoryController::class, 'setStock'])->whereNumber('productId');
        Route::put('inventory/{productId}/threshold', [Admin\InventoryController::class, 'setThreshold'])->whereNumber('productId');
        Route::post('inventory/adjust', [Admin\InventoryController::class, 'adjust']);
        Route::post('inventory/batch', [Admin\InventoryController::class, 'batch']);
        Route::post('inventory/logs/{id}/undo', [Admin\InventoryController::class, 'undo'])->whereNumber('id');

        // 退货处理
        Route::get('returns', [Admin\ReturnOrderController::class, 'index']);
        Route::get('returns/{id}', [Admin\ReturnOrderController::class, 'show'])->whereNumber('id');
        Route::put('returns/{id}/handle', [Admin\ReturnOrderController::class, 'handle'])->whereNumber('id');

        // 统计报表
        Route::get('stats/overview', [Admin\StatsController::class, 'overview']);
        Route::get('stats/orders', [Admin\StatsController::class, 'orders']);
        Route::get('stats/sales', [Admin\StatsController::class, 'sales']);
        Route::get('stats/products', [Admin\StatsController::class, 'products']);
        Route::get('stats/members', [Admin\StatsController::class, 'members']);

        // 系统设置
        Route::get('settings', [Admin\SettingController::class, 'show']);
        Route::put('settings', [Admin\SettingController::class, 'update']);

        // 管理员账号（仅超级管理员）
        Route::middleware('admin.super')->group(function () {
            Route::get('admins', [Admin\AdminAccountController::class, 'index']);
            Route::post('admins', [Admin\AdminAccountController::class, 'store']);
            Route::put('admins/{id}', [Admin\AdminAccountController::class, 'update'])->whereNumber('id');
            Route::put('admins/{id}/status', [Admin\AdminAccountController::class, 'setStatus'])->whereNumber('id');
            Route::put('admins/{id}/reset-password', [Admin\AdminAccountController::class, 'resetPassword'])->whereNumber('id');
            Route::delete('admins/{id}', [Admin\AdminAccountController::class, 'destroy'])->whereNumber('id');
        });
    });
});
