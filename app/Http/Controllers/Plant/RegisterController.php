<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class RegisterController extends Controller
{
    /** GET /shuma/register 前台注册页 */
    public function index(Request $request)
    {
        return view('plant.register');
    }
}
