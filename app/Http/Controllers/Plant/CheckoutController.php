<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    /** GET /shuma/checkout 结算页 */
    public function index(Request $request)
    {
        return view('plant.checkout');
    }
}
