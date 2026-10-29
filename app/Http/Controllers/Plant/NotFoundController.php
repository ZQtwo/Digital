<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotFoundController extends Controller
{
    /** GET /shuma/not-found 404 页 */
    public function index(Request $request)
    {
        return view('plant.not-found');
    }
}
