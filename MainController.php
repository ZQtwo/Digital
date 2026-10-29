<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MainController extends Controller
{
    /** GET /shuma/admin 后台主框架（工作台） */
    public function index(Request $request)
    {
        return view('admin.index');
    }
}
