<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /** GET /shuma/orders 我的订单页 */
    public function index(Request $request)
    {
        return view('plant.orders');
    }

    /** GET /shuma/orders/{orderNo} 订单详情页 */
    public function detail(Request $request, string $orderNo)
    {
        return view('plant.order-detail', [
            'orderNo' => $orderNo,
        ]);
    }

    /** GET /shuma/orders/confirm 结算确认页 */
    public function confirm(Request $request)
    {
        return view('plant.order-confirm');
    }

    /** GET /shuma/orders/success 下单成功页 */
    public function success(Request $request)
    {
        return view('plant.order-success');
    }
}
