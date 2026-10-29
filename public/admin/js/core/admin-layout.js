/**
 * admin-layout.js —— 后台外壳初始化（jQuery 版）
 * 【改造说明 v2】sidebar / topbar / toast-host 的完整 HTML 已直接写在各页面的 HTML 文件里。
 *   本模块只负责：
 *     1. 填充动态数据（alertCount 徽章、管理员名称、角色过滤）
 *     2. 绑定事件（主题切换、导航折叠、汉堡按钮、抽屉开关、登出）
 *     3. Toast 同步
 *
 *  用法：页面 body 里写好完整的 sidebar / topbar HTML 结构后，
 *   调用 Volta.AdminLayout.init() 初始化数据和事件。
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;

  /* ============================== SVG（用于主题切换图标） ============================== */
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

  /* ============================ Nav drawer ============================ */
  function openNav() {
    $('[data-mount="admin-sidebar"]').addClass('is-open');
    var $scrim = $('.admin-scrim');
    $scrim.removeAttr('hidden');
    var handler = function (ev) {
      if (!$(ev.target).closest('[data-mount="admin-sidebar"]').length) {
        closeNav();
        $(document).off('click.adminNav', handler);
      }
    };
    setTimeout(function () { $(document).on('click.adminNav', handler); }, 0);
  }
  function closeNav() {
    $('[data-mount="admin-sidebar"]').removeClass('is-open');
    $('.admin-scrim').attr('hidden', '');
  }

  /* ============================== 登出 ============================== */
  function doLogout() {
    var admin = Volta.Admin;
    admin.logout();
    Volta.UI.toast('已退出后台管理', 'info');
    setTimeout(function () { location.href = '/shuma/admin/login'; }, 480);
  }

  /* ============================== 事件绑定 ============================== */
  function bindEvents() {
    // 侧边栏折叠/展开
    $(document).on('click', '[data-mount="admin-sidebar"] [data-action="toggle-group"]', function (e) {
      e.preventDefault();
      $(this).closest('.admin-nav__group').toggleClass('is-open');
    });
    // 侧边栏：退出系统（二级菜单项）
    $(document).on('click', '[data-mount="admin-sidebar"] [data-action="logout"]', function (e) {
      e.preventDefault();
      doLogout();
    });
    // 侧边栏底部退出按钮
    $(document).on('click', '[data-mount="admin-sidebar"] [data-action="admin-logout"]', function (e) {
      e.preventDefault();
      doLogout();
    });

    // 顶栏：主题切换
    $(document).on('click', '[data-mount="admin-topbar"] [data-action="toggle-theme"]', function (e) {
      e.preventDefault();
      Volta.UI.toggleTheme();
      var $btn = $(this);
      $btn.attr('aria-label', Volta.UI.isDark() ? '切换到日间模式' : '切换到夜间模式');
      $btn.html(Volta.UI.isDark() ? svgSun() : svgMoon());
    });
    // 顶栏：汉堡按钮
    $(document).on('click', '[data-mount="admin-topbar"] [data-action="open-nav"]', function (e) {
      e.preventDefault();
      openNav();
    });
    // 顶栏：退出按钮
    $(document).on('click', '[data-mount="admin-topbar"] [data-action="admin-logout"]', function (e) {
      e.preventDefault();
      doLogout();
    });

    // 遮罩点击关闭抽屉
    $(document).on('click', '.admin-scrim', function (e) {
      e.preventDefault();
      closeNav();
    });
  }

  /* ============================== 数据填充 ============================== */
  function fillSidebar() {
    var Admin = Volta.Admin;
    var Inventory = Volta.Inventory;

    // 角色过滤：隐藏 requireRole="super" 的菜单项（非超管看不到）
    var curRole = (Admin && Admin.role && Admin.role()) || '';
    $('[data-mount="admin-sidebar"] [data-require-role]').each(function () {
      var required = $(this).attr('data-require-role');
      if (required && curRole !== required) {
        $(this).css('display', 'none');
      }
    });

    // 预警数徽章 — 仅在 dashboard 页面显示，避免主面板一行在其他页面上视觉上"像选中"
    var isDashboard = location.pathname.replace(/.*\//, '').split('#')[0] === '/shuma/admin/';
    var alertCount = Inventory ? Inventory.stats().alertCount : 0;
    var $badge = $('[data-bind="sidebar.alertCount"]');
    if ($badge.length) {
      if (alertCount > 0 && isDashboard) {
        $badge.text(alertCount).show();
      } else {
        $badge.hide();
      }
    }
  }

  function fillTopbar() {
    var Admin = Volta.Admin;
    var Inventory = Volta.Inventory;

    // 管理员名称
    $('[data-bind="topbar.adminName"]').text(Admin.name() || '未登录');

    // 预警数 tag
    var alertCount = Inventory ? Inventory.stats().alertCount : 0;
    var $tag = $('[data-bind="topbar.alertTag"]');
    if ($tag.length) {
      if (alertCount > 0) {
        $tag.text(alertCount + ' 项待补货').removeAttr('hidden');
      } else {
        $tag.attr('hidden', '');
      }
    }

    // 更新主题切换按钮图标（根据当前主题）
    var $themeBtn = $('[data-mount="admin-topbar"] [data-action="toggle-theme"]');
    if (Volta.UI.isDark()) {
      $themeBtn.attr('aria-label', '切换到日间模式').html(svgSun());
    } else {
      $themeBtn.attr('aria-label', '切换到夜间模式').html(svgMoon());
    }
  }

  /* ============================== Toast ============================== */
  function initToast() {
    var $host = $('.toast-host');
    if (!$host.length) return;
    Volta.UI.onChange(function () {
      var list = Volta.UI.toasts || [];
      var html = list.map(function (t) {
        return '<div class="toast toast--' + (t.type || 'info') + '" data-toast-id="' + t.id + '">'
          + '<span class="toast__bar"></span><span class="toast__text">' + t.message + '</span></div>';
      }).join('');
      $host.html(html);
    });
  }

  /* ============================== Init ============================== */
  function init() {
    fillSidebar();
    fillTopbar();
    bindEvents();
    initToast();
  }

  global.Volta.AdminLayout = {
    init: init,
    openNav: openNav,
    closeNav: closeNav
  };
})(window);
