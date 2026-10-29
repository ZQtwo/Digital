<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** 仅超级管理员可访问（role_code=super） */
class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user();
        if (!$admin || !$admin instanceof \App\Models\Admin || !$admin->isSuper()) {
            return response()->json([
                'code' => 403,
                'message' => '需要超级管理员权限',
                'data' => null,
            ], 403);
        }
        return $next($request);
    }
}
