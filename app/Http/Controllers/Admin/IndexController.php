<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    /** GET /shuma/admin/login 后台登录页 */
    public function login(Request $request)
    {
        return view('admin.login');
    }
}
