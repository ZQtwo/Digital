/**
 * login.js —— 后台登录页（jQuery 版）
 * 独立页面，不套后台外壳、不调 AdminLayout.mount、不调 requireAdmin。
 * 功能：账号 + 密码表单、演示账号提示、登录后回跳、主题切换、Toast 提示。
 *
 * 【改造说明 v2】HTML 结构已直接写在 login.html 里，本文件只负责：
 *   1. 填充动态数据（演示账号）
 *   2. 绑定事件处理
 *   3. 启动守卫（已登录跳转）
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var Admin = Volta.Admin;
  var UI = Volta.UI;

  /* ============================== SVG ============================== */
  function svgSun() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">'
      + '<circle cx="12" cy="12" r="4" />'
      + '<path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />'
      + '</svg>';
  }
  function svgMoon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />'
      + '</svg>';
  }

  /* ============================== 数据填充 ============================== */
  function fillDemoAccount() {
    var demo = Admin.DEMO_ACCOUNT;
    $('[data-bind="demo.username"]').text(demo.phone || demo.username);
    $('[data-bind="demo.password"]').text(demo.password);
  }

  function bindToast() {
    var $host = $('.toast-host');
    if (!$host.length) return;
    UI.onChange(function () {
      var list = UI.toasts || [];
      var html = list.map(function (t) {
        return '<div class="toast toast--' + (t.type || 'info') + '" data-toast-id="' + t.id + '">'
          + '<span class="toast__bar"></span><span class="toast__text">' + t.message + '</span></div>';
      }).join('');
      $host.html(html);
    });
  }

  /* ============================== 事件绑定 ============================== */
  function bind() {
    // 主题切换
    $('#login-topbar, .admin-login__topbar').on('click', '[data-action="toggle-theme"]', function (e) {
      e.preventDefault();
      UI.toggleTheme();
      var $btn = $(this);
      $btn.attr('aria-label', UI.isDark() ? '切换到日间模式' : '切换到夜间模式');
      $btn.html(UI.isDark() ? svgSun() : svgMoon());
    });

    // 填入演示账号
    $(document).on('click', '[data-action="fill-demo"]', function (e) {
      e.preventDefault();
      var demo = Admin.DEMO_ACCOUNT;
      $('#admin-user').val(demo.phone || demo.username);
      $('#admin-pass').val(demo.password);
      $('#admin-user').focus();
    });

    // 显示 / 隐藏密码（小眼睛切换）
    $(document).on('click', '[data-action="toggle-pass"]', function (e) {
      e.preventDefault();
      var $input = $('#admin-pass');
      var show = $input.attr('type') === 'password';
      $input.attr('type', show ? 'text' : 'password');
      $(this).find('.eye-icon--open').toggle(!show);
      $(this).find('.eye-icon--closed').toggle(show);
    });

    // 输入时清空错误提示
    $(document).on('input', '.input', function () {
      $('.admin-login__error').remove();
    });

    // 提交登录（异步 —— 真调后端 API）
    $(document).on('submit', '[data-form="login"]', function (e) {
      e.preventDefault();
      var $form = $(this);
      var u = $form.find('[name="username"]').val();
      var p = $form.find('[name="password"]').val();

      // 禁用按钮防止重发
      var $btn = $form.find('button[type="submit"]');
      $btn.prop('disabled', true);

      Admin.login(u, p).then(function (res) {
        if (!res.ok) {
          var errMsg = res.message || '登录失败';
          $('.admin-login__error').remove();
          $form.find('#admin-pass').closest('.admin-login__field').append(
            '<p class="admin-login__error">' + errMsg + '</p>'
          );
          $btn.prop('disabled', false);
          return;
        }
        // 登录成功，跳转
        location.href = '/shuma/admin/';
      });
    });
  }

  /* ============================== 启动 ============================== */
  $(function () {
    // 主题初始化（避免闪烁）
    UI.initTheme();

    // 更新主题切换按钮的初始图标
    var $themeBtn = $('[data-action="toggle-theme"]');
    if (UI.isDark()) {
      $themeBtn.attr('aria-label', '切换到日间模式').html(svgSun());
    } else {
      $themeBtn.attr('aria-label', '切换到夜间模式').html(svgMoon());
    }

    // 已登录直接跳首页
    if (Admin.isLogin()) {
      location.href = '/shuma/admin/';
      return;
    }

    // 填充演示账号
    fillDemoAccount();

    // Toast
    bindToast();

    // 绑定事件
    bind();

    // 入场动画
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  });
})(window);
