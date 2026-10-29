<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Plant as Plant;
use App\Http\Controllers\Admin as Admin;

/* ======================================================================
   页面路由（web.php）—— 只负责渲染 Blade 页面（GET 只出 HTML）
   与 api.php 的 JSON 接口路径完全错开不重叠
   ====================================================================== */

Route::prefix('shuma')->group(function () {

    /* ==================== .html 后缀 fallback ==================== */
    // 用户刷新后可能带 .html 后缀，重定向到无后缀的 Blade 路由
    Route::get('{path}.html', function ($path) {
        // 特殊：product.html?id=p01 → product/p01
        if ($path === 'product') {
            $id = request()->query('id');
            return redirect($id ? "/shuma/product/$id" : '/shuma/product');
        }
        // 别名映射：静态 HTML 里的路径 vs Laravel 路由
        $aliases = [
            'favorites' => 'my-favorites',
            'addresses' => 'my-addresses',
            'orders'    => 'my-orders',
            'order-confirm' => 'orders/confirm',
            'order-success' => 'orders/success',
            'login'     => 'login',
            'register'  => 'register',
            'profile'   => 'profile',
            'list'      => 'list',
            'cart'      => 'cart',
            'checkout'  => 'checkout',
            'help'      => 'help',
            'settings'  => 'settings',
            'security'  => 'security',
            'not-found' => 'not-found',
        ];
        $target = isset($aliases[$path]) ? $aliases[$path] : $path;
        return redirect('/shuma/' . $target);
    })->where('path', '[A-Za-z0-9_\-/]+');

    /* ==================== 前台页面（GET only） ==================== */

    // 首页
    Route::get('/', [Plant\IndexController::class, 'index']);
    Route::get('index', [Plant\IndexController::class, 'index']);

    // 认证页
    Route::get('login', [Plant\LoginController::class, 'index'])->name('login');
    Route::get('register', [Plant\RegisterController::class, 'index'])->name('register');

    // 商品
    Route::get('list', [Plant\ProductController::class, 'index']);
    Route::get('product/{id}', [Plant\ProductController::class, 'show']);

    // 购物/结算
    Route::get('cart', [Plant\CartController::class, 'index']);
    Route::get('checkout', [Plant\CheckoutController::class, 'index']);
    Route::get('orders/confirm', [Plant\OrderController::class, 'confirm']);
    Route::get('orders/success', [Plant\OrderController::class, 'success']);
    // 订单详情 —— 放在 orders/confirm 后面，且 orderNo 必须匹配 SO+数字，避免吃掉 confirm
    Route::get('orders/{orderNo}', [Plant\OrderController::class, 'detail'])->where('orderNo', 'SO\d+');

    // 我的
    Route::get('orders', [Plant\OrderController::class, 'index']);
    Route::get('my-orders', [Plant\OrderController::class, 'index']);
    Route::get('my-addresses', [Plant\AddressController::class, 'index']);
    Route::get('my-favorites', [Plant\FavoriteController::class, 'index']);
    Route::get('favorites', [Plant\FavoriteController::class, 'index']);
    Route::get('addresses', [Plant\AddressController::class, 'index']);

    // 个人中心
    Route::get('profile', [Plant\ProfileController::class, 'index']);
    Route::get('settings', [Plant\ProfileController::class, 'settings']);
    Route::get('security', [Plant\ProfileController::class, 'security']);

    // 帮助/404
    Route::get('help', [Plant\HelpController::class, 'index']);
    Route::get('not-found', [Plant\NotFoundController::class, 'index']);

    /* ==================== 后台页面（每个一条显式 GET） ==================== */

    Route::prefix('admin')->group(function () {
        // 登录页（独立，不走 SPA）
        Route::get('login', [Admin\IndexController::class, 'login']);

        Route::middleware('web')->group(function () {
            Route::get('/', [Admin\MainController::class, 'index']);
            Route::get('index', [Admin\MainController::class, 'index']);

            Route::get('products', [Admin\ProductController::class, 'index']);
            Route::get('products/create', [Admin\ProductController::class, 'create']);

            Route::get('orders', [Admin\OrderController::class, 'index']);
            Route::get('orders/stats', [Admin\OrderController::class, 'stats']);

            Route::get('members', [Admin\MemberController::class, 'index']);
            Route::get('categories', [Admin\CategoryController::class, 'index']);
            Route::get('banners', [Admin\BannerController::class, 'index']);
            Route::get('admins', [Admin\AdminAccountController::class, 'index']);
            Route::get('inventory', [Admin\InventoryController::class, 'index']);
            Route::get('returns', [Admin\ReturnOrderController::class, 'index']);
            Route::get('settings', [Admin\SettingController::class, 'index']);
            Route::get('logs', [Admin\LogController::class, 'index']);
            Route::get('profile', [Admin\ProfileController::class, 'index']);
        });
    });
});
