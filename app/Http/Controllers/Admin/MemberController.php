<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    /** GET /shuma/admin/members 会员列表 */
    public function index(Request $request)
    {
        return view('admin.members');
    }
}
