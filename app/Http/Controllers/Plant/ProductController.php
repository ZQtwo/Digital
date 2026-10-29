<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /** GET /shuma/list 商品列表页（搜索/筛选） */
    public function index(Request $request)
    {
        return view('plant.list');
    }

    /** GET /shuma/product/{id} 商品详情页 */
    public function show(Request $request, string $id)
    {
        return view('plant.product', ['productId' => $id]);
    }
}
