<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    /** GET /shuma/index 或 /shuma/ 前台首页 */
    public function index(Request $request)
    {
        return view('plant.index');
    }
}
