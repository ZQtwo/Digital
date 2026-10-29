/**
 * admin-auth.js —— 后台路由守卫 + 角色守卫（jQuery 版）
 * 走 volta.admin（管理员登录态），默认登录页是 /shuma/admin/login。
 *
 * 用法：
 *   Volta.AdminAuth.requireAdmin()           // 检查登录
 *   Volta.AdminAuth.requireRole('super')     // 检查角色
 *   Volta.AdminAuth.requireSuper()           // super 守卫别名
 *   Volta.AdminAuth.redirectAfterAdminLogin('/shuma/admin/')
 */
(function (global) {
  function currentPath() {
    var p = location.pathname.split('/').slice(-1)[0] || '/shuma/admin/';
    return p + location.search;
  }

  function requireAdmin(loginPage) {
    var Volta = global.Volta;
    if (!Volta || !Volta.Admin) return false;
    if (Volta.Admin.requireAdmin(loginPage)) return true;
    // requireAdmin 内部已处理跳转
    return false;
  }

  function requireRole(role) {
    var Volta = global.Volta;
    if (!Volta || !Volta.Admin) return false;
    return Volta.Admin.requireRole(role);
  }

  function requireSuper() { return requireRole('super'); }

  function currentRole() {
    var Volta = global.Volta;
    if (!Volta || !Volta.Admin) return '';
    return Volta.Admin.role();
  }

  function redirectAfterAdminLogin(fallback) {
    var q = new URLSearchParams(location.search);
    var r = q.get('redirect');
    if (r && /^[\w./?&=\-]+\.html(\?[\w./?&=\-]*)?$/i.test(r)) {
      location.href = r;
    } else {
      location.href = fallback || '/shuma/admin/';
    }
  }

  global.Volta = global.Volta || {};
  global.Volta.AdminAuth = {
    currentPath: currentPath,
    requireAdmin: requireAdmin,
    requireRole: requireRole,
    requireSuper: requireSuper,
    currentRole: currentRole,
    redirectAfterAdminLogin: redirectAfterAdminLogin
  };
})(window);
