<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    /** GET /shuma/admin/banners 轮播图管理 */
    public function index(Request $request)
    {
        return view('admin.banners');
    }
}
