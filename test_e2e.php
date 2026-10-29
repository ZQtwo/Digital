<?php
/**
 * 端到端 API 测试脚本
 * 用法: php test_e2e.php
 * 测: 注册→登录→加购→查购物车→下单→支付→查订单→后台发货
 */
$base = 'http://localhost:8080/shuma/api';
$pass = '123456';

function http($method, $url, $body = null, $token = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $headers = ['Content-Type: application/json', 'Accept: application/json'];
    if ($token) $headers[] = 'Authorization: Bearer ' . $token;
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    return ['code' => $code, 'raw' => $resp, 'json' => json_decode($resp, true), 'err' => $err];
}

function p($label, $ok, $detail = '') {
    $icon = $ok ? '✅' : '❌';
    echo "$icon [$label] $detail\n";
}

echo "=== 1. 登录（已存在账号） ===\n";
$r = http('POST', "$base/auth/login", ['phone' => '13800009955', 'password' => $pass]);
$token = $r['json']['data']['token'] ?? null;
p('登录', $token !== null, $token ? 'token=' . substr($token, 0, 20) . '...' : $r['raw']);
if (!$token) { echo "FAIL: 无法登录，终止\n"; exit(1); }

echo "\n=== 2. 加购 product_id=1 ===\n";
$r = http('POST', "$base/cart-api", ['productId' => 1, 'quantity' => 1], $token);
p('加购', ($r['json']['code'] ?? -1) === 0, $r['raw']);

echo "\n=== 3. 查购物车 ===\n";
$r = http('GET', "$base/cart-api", null, $token);
$items = $r['json']['data']['items'] ?? [];
p('购物车', count($items) > 0, 'items=' . count($items) . ' totalQty=' . ($r['json']['data']['totalQty'] ?? 0));

echo "\n=== 4. 下单 ===\n";
$cartItems = array_map(function ($it) {
    return ['productId' => $it['productId'], 'quantity' => $it['quantity']];
}, $items);
$r = http('POST', "$base/orders", [
    'items' => $cartItems,
    'addressId' => null,
    'remark' => 'E2E 测试订单',
    'payMethod' => 'wechat'
], $token);
$orderNo = $r['json']['data']['orderNo'] ?? null;
p('创建订单', $orderNo !== null, $orderNo ?? $r['raw']);

if ($orderNo) {
    echo "\n=== 5. 查订单详情 ===\n";
    $r = http('GET', "$base/orders/$orderNo", null, $token);
    p('订单详情', ($r['json']['code'] ?? -1) === 0, 'status=' . ($r['json']['data']['status'] ?? '?') . ' statusLabel=' . ($r['json']['data']['statusLabel'] ?? '?'));

    echo "\n=== 6. 支付订单 ===\n";
    $r = http('POST', "$base/orders/$orderNo/pay", ['payMethod' => 'wechat'], $token);
    p('支付', ($r['json']['code'] ?? -1) === 0, $r['raw']);

    echo "\n=== 7. 再查订单（应已付款）===\n";
    $r = http('GET', "$base/orders/$orderNo", null, $token);
    p('订单状态', ($r['json']['data']['status'] ?? '') === 'pending_ship', 'status=' . ($r['json']['data']['status'] ?? '?'));
}

echo "\n=== 8. 查订单列表 ===\n";
$r = http('GET', "$base/orders?pageSize=10", null, $token);
$list = $r['json']['data']['list'] ?? [];
p('订单列表', count($list) > 0, 'orders=' . count($list));

echo "\n=== 9. 后台登录 ===\n";
$r = http('POST', "$base/admin/auth/login", ['username' => 'admin', 'password' => 'admin123']);
$adminToken = $r['json']['data']['token'] ?? null;
p('后台登录', $adminToken !== null);

if ($adminToken) {
    echo "\n=== 10. 后台查订单列表 ===\n";
    $r = http('GET', "$base/admin/orders?pageSize=10", null, $adminToken);
    $adminList = $r['json']['data']['list'] ?? [];
    p('后台订单列表', count($adminList) > 0, 'orders=' . count($adminList));

    if ($orderNo) {
        echo "\n=== 11. 后台模拟发货 $orderNo ===\n";
        $r = http('PUT', "$base/admin/orders/$orderNo/status", ['status' => 'shipped', 'trackingNo' => 'SF' . time()], $adminToken);
        p('模拟发货', ($r['json']['code'] ?? -1) === 0, $r['raw']);

        echo "\n=== 12. 前台查订单（应已发货）===\n";
        $r = http('GET', "$base/orders/$orderNo", null, $token);
        p('发货状态', ($r['json']['data']['status'] ?? '') === 'shipped', 'status=' . ($r['json']['data']['status'] ?? '?'));
    }

    echo "\n=== 13. 后台统计 ===\n";
    $r = http('GET', "$base/admin/stats/orders", null, $adminToken);
    p('后台统计', ($r['json']['code'] ?? -1) === 0, $r['raw']);
}

echo "\n=== 14. 查商品库 ===\n";
$r = http('GET', "$base/products?pageSize=5", null, $token);
$prods = $r['json']['data']['list'] ?? [];
p('商品列表', count($prods) > 0, 'products=' . count($prods));

echo "\n✅ E2E 测试完成\n";
