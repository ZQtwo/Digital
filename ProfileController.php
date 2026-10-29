<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /** GET /shuma/admin/profile 管理员个人资料 */
    public function index(Request $request)
    {
        return view('admin.profile');
    }
}
