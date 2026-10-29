<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CartController extends Controller
{
    /** GET /shuma/cart 购物车页 */
    public function index(Request $request)
    {
        return view('plant.cart');
    }
}
