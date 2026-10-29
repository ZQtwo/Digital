<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /** GET /shuma/admin/settings 系统设置 */
    public function index(Request $request)
    {
        return view('admin.settings');
    }
}
