<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class BaseController extends Controller
{
    /**
     * 前台统一使用分类编号 code（1 位字母大小写均可 + 数字 1~99，如 A01、c1）。
     * 分类编号用于管理，分类名用于展示；前台筛选/跳转一律用 code。
     */
    public static function catSlug(?string $code): string
    {
        return (string) $code;
    }
    /** 统一成功响应 {code:0, message:'ok', data} */
    protected function ok(mixed $data = null, string $message = 'ok'): JsonResponse
    {
        return response()->json([
            'code' => 0,
            'message' => $message,
            'data' => $data,
        ]);
    }

    /** 统一失败响应（HTTP 状态码与业务码一致） */
    protected function fail(string $message, int $http = 400): JsonResponse
    {
        return response()->json([
            'code' => $http,
            'message' => $message,
            'data' => null,
        ], $http);
    }

    /** 分页结构 {list, total, page, pageSize} */
    protected function paginate(LengthAwarePaginator $paginator, ?callable $transform = null): array
    {
        $list = collect($paginator->items());
        if ($transform) {
            $list = $list->map($transform);
        }
        return [
            'list' => $list->values()->all(),
            'total' => $paginator->total(),
            'page' => $paginator->currentPage(),
            'pageSize' => $paginator->perPage(),
        ];
    }

    /** 每页条数（1-100） */
    protected function pageSize($request, int $default = 20): int
    {
        return max(1, min(100, (int) $request->query('pageSize', $default)));
    }

    /** 密码校验：bcrypt 优先，兼容存量明文演示数据 */
    protected function verifyPassword(string $plain, string $stored): bool
    {
        if ($stored !== '') {
            try {
                if (Hash::check($plain, $stored)) {
                    return true;
                }
            } catch (\Throwable) {
                // 存量明文数据非 bcrypt 格式，走明文比对
            }
        }
        return $plain === $stored;
    }
}
