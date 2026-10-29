<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /** GET /shuma/admin/categories 分类管理 */
    public function index(Request $request)
    {
        return view('admin.categories');
    }
}
