<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AdminAccountController extends Controller
{
    /** GET /shuma/admin/admins 管理员账号管理 */
    public function index(Request $request)
    {
        return view('admin.admins');
    }
}
