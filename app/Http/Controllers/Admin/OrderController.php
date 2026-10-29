<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /** GET /shuma/admin/orders 订单列表 */
    public function index(Request $request)
    {
        return view('admin.orders');
    }

    /** GET /shuma/admin/orders/stats 订单统计 */
    public function stats(Request $request)
    {
        return view('admin.order-stats');
    }
}
