<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Http\JsonResponse;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'shuma',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // 认证失败统一返回 401 JSON（接口场景不重定向）
        $middleware->redirectGuestsTo(fn () => null);

        // 全局禁用浏览器 HTTP 缓存（页面 HTML + API JSON）：
        // 防止浏览器缓存旧版页面/旧 JS/旧数据，导致"改了库页面没变"或新增分类看似没落库
        $middleware->append([
            \App\Http\Middleware\NoCacheHeaders::class,
        ]);

        $middleware->alias([
            'admin.super' => \App\Http\Middleware\EnsureSuperAdmin::class,
            'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'ability' => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // 判断是否为 API 请求：accept: application/json、X-Requested-With=XMLHttpRequest，
        // 或路径以 /shuma/api 开头（curl 等不带 Accept 头的客户端也返回 JSON，避免验证错误被 302 重定向）
        $isApi = fn ($req) => $req->expectsJson()
            || $req->wantsJson()
            || str_starts_with((string) $req->getPathInfo(), '/shuma/api');

        // 统一响应结构：{code, message, data}
        $exceptions->render(function (ValidationException $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return new JsonResponse([
                    'code' => 422,
                    'message' => $e->validator->errors()->first(),
                    'data' => ['errors' => $e->errors()],
                ], 422);
            }
        });

        $exceptions->render(function (AuthenticationException $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return new JsonResponse([
                    'code' => 401,
                    'message' => '未登录或登录已过期',
                    'data' => null,
                ], 401);
            }
        });

        $exceptions->render(function (ModelNotFoundException $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return new JsonResponse([
                    'code' => 404,
                    'message' => '资源不存在',
                    'data' => null,
                ], 404);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return new JsonResponse([
                    'code' => 404,
                    'message' => '接口不存在',
                    'data' => null,
                ], 404);
            }
        });

        $exceptions->render(function (HttpException $e, $request) use ($isApi) {
            if ($isApi($request) && $e->getStatusCode() >= 400) {
                return new JsonResponse([
                    'code' => $e->getStatusCode(),
                    'message' => $e->getMessage() ?: '请求失败',
                    'data' => null,
                ], $e->getStatusCode());
            }
        });

        $exceptions->render(function (Throwable $e, $request) use ($isApi) {
            if ($isApi($request)) {
                return new JsonResponse([
                    'code' => 500,
                    'message' => config('app.debug') ? $e->getMessage() : '服务器内部错误',
                    'data' => null,
                ], 500);
            }
        });
    })->create();
