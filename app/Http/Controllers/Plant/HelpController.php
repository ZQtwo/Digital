<?php

namespace App\Http\Controllers\Plant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class HelpController extends Controller
{
    /** GET /shuma/help 帮助/客服页 */
    public function index(Request $request)
    {
        return view('plant.help');
    }
}
