<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /** GET /shuma/admin/products 商品列表 */
    public function index(Request $request)
    {
        return view('admin.products');
    }

    /** GET /shuma/admin/products/create 商品新增/编辑 */
    public function create(Request $request)
    {
        return view('admin.product-create');
    }
}
