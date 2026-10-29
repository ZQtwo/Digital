<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class LogController extends Controller
{
    /** GET /shuma/admin/logs 库存流水日志 */
    public function index(Request $request)
    {
        return view('admin.logs');
    }
}
