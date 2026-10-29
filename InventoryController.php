<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    /** GET /shuma/admin/inventory 库存管理 */
    public function index(Request $request)
    {
        return view('admin.inventory');
    }
}
