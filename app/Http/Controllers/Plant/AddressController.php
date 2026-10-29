<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    /** GET /shuma/addresses 收货地址管理页 */
    public function index(Request $request)
    {
        return view('plant.addresses');
    }
}
