<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API 响应禁用浏览器 HTTP 缓存。
 * 背景：GET JSON 响应默认无 Cache-Control 头时，浏览器会缓存旧数据
 * （如分类表更新后前台仍显示旧分类），导致"数据库已改页面没变"的假象。
 */
class NoCacheHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');

        return $response;
    }
}
