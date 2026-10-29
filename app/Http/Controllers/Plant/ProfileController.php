<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /** GET /shuma/profile 个人中心主页 */
    public function index(Request $request)
    {
        return view('plant.profile');
    }

    /** GET /shuma/security 安全设置（改密码） */
    public function security(Request $request)
    {
        return view('plant.security');
    }

    /** GET /shuma/settings 账号设置 */
    public function settings(Request $request)
    {
        return view('plant.settings');
    }
}
