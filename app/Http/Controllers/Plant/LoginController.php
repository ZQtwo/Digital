<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class LoginController extends Controller
{
    /** GET /shuma/login 前台登录页 */
    public function index(Request $request)
    {
        return view('plant.login');
    }
}
