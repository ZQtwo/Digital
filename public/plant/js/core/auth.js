/**
 * auth.js —— 路由守卫
 * 用法：在需要登录的页面调用 Volta.Auth.requireLogin('/shuma/login?redirect=' + 当前页)
 */
(function (global) {
  function currentPath() {
    // 返回当前页相对路径（去掉 .html 后缀，兼容旧 SPA 路径）
    var p = location.pathname;
    // 去掉 /shuma/ 前缀和 .html 后缀
    p = p.replace(/^\/shuma\//, '').replace(/\.html$/, '') || 'index';
    return p + location.search;
  }
  function requireLogin(loginPage) {
    var Volta = global.Volta;
    if (!Volta || !Volta.User) return false;
    if (Volta.User.isLogin()) return true;
    // 旧版传入 '/shuma/login?redirect=xxx'，新版传入 '/shuma/login?redirect=xxx'
    var target = loginPage;
    if (!target) {
      target = '/shuma/login?redirect=' + encodeURIComponent(currentPath());
    } else if (target.indexOf('.html') !== -1 && target.indexOf('/shuma') === -1) {
      // 旧版 .html 路径 → 转换
      target = '/shuma/' + target.replace(/\.html/g, '').replace(/^\.?\//, '');
    } else if (target.indexOf('/shuma') !== 0) {
      target = '/shuma/' + target;
    }
    location.href = target;
    return false;
  }
  function redirectAfterLogin(fallback) {
    var q = new URLSearchParams(location.search);
    var r = q.get('redirect');
    if (r) {
      r = r.replace(/\.html$/g, '');
      // 如果是 Laravel 路由（不含 .html 且不含空格），直接跳转
      if (r.indexOf(' ') === -1) {
        // 确保带 /shuma/ 前缀
        if (r.indexOf('/shuma/') !== 0) {
          r = '/shuma/' + r.replace(/^\//, '');
        }
        location.href = r;
        return;
      }
    }
    var fb = fallback ? ('/shuma/' + String(fallback).replace(/\.html$/g, '').replace(/^\.?\/?shuma\/?/, '').replace(/^\//, '')) : '/shuma/index';
    location.href = fb;
  }
  global.Volta = global.Volta || {};
  global.Volta.Auth = {
    currentPath: currentPath,
    requireLogin: requireLogin,
    redirectAfterLogin: redirectAfterLogin
  };
})(window);
