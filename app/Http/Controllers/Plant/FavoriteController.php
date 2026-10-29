<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    /** GET /shuma/favorites 我的收藏页 */
    public function index(Request $request)
    {
        return view('plant.favorites');
    }
}
