<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ReturnOrderController extends Controller
{
    /** GET /shuma/admin/returns 退换货管理 */
    public function index(Request $request)
    {
        return view('admin.returns');
    }
}
