/**
 * layout.js —— 应用外壳（jQuery 版）
 * 重构后：HTML 文件直接包含完整 header/footer/tabbar/toast/back-to-top，
 * mount() 只负责：事件绑定 + store 监听 + SearchBox 挂载 + reveal 初始化
 * renderXxx() 函数保留供 store 监听（登录态变化时局部刷新 user-area）
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;

  var NAV_LINKS = [
    { href: '/shuma/index', label: '首页', tab: 'home' },
    { href: '/shuma/list', label: '全部商品', tab: 'list' },
    { href: '/shuma/list?cat=P01', label: '手机通讯', tab: '' },
    { href: '/shuma/list?cat=A01', label: '影音娱乐', tab: '' },
    { href: '/shuma/orders', label: '我的订单', tab: 'orders' }
  ];

  var TABBAR_ITEMS = [
    { href: '/shuma/index', label: '首页', tab: 'home', icon: 'home' },
    { href: '/shuma/list', label: '分类', tab: 'list', icon: 'grid' },
    { href: '/shuma/favorites', label: '收藏', tab: 'favorites', icon: 'heart' },
    { href: '/shuma/cart', label: '购物车', tab: 'cart', icon: 'cart', badge: true },
    { href: '/shuma/profile', label: '我的', tab: 'me', icon: 'user', loginHref: '/shuma/login?redirect=' + encodeURIComponent('/shuma/profile') }
  ];

  function svgBrand() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M13 2 L4.5 13.5 H11 L10 22 L19.5 10 H13 Z" />'
      + '</svg>';
  }
  function svgSearch() {
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'
      + '<circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 L21 21" /></svg>';
  }
  function svgSun() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;">'
      + '<circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></svg>';
  }
  function svgMoon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;">'
      + '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>';
  }
  function svgHeart() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transform:translateY(-2px);display:block;">'
      + '<path d="M12 20.3l-6.6-6.5a4.2 4.2 0 1 1 6-5.9l.6.6.6-.6a4.2 4.2 0 1 1 6 5.9z" /></svg>';
  }
  function svgCart() {
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;">'
      + '<path d="M3 4h2.2l2.1 10.6h10.9l1.8-7H6" /><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></svg>';
  }
  function svgTab(icon) {
    var body = '';
    if (icon === 'home') body = '<path d="M4 10.5 L12 3.5 L20 10.5 V20 H4 Z" /><path d="M9.5 20 V14 H14.5 V20" />';
    else if (icon === 'grid') body = '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />';
    else if (icon === 'heart') body = '<path d="M12 20.3l-6.6-6.5a4.2 4.2 0 1 1 6-5.9l.6.6.6-.6a4.2 4.2 0 1 1 6 5.9z" />';
    else if (icon === 'cart') body = '<path d="M3 4h2.2l2.1 10.6h10.9l1.8-7H6" /><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" />';
    else body = '<circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />';
    var heartStyle = icon === 'heart' ? ' style="transform:translateY(-2px);display:block;"' : ' style="display:block;"';
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + heartStyle + '>' + body + '</svg>';
  }

  /* ============================== Header ============================== */
  function renderHeader(activeTab) {
    var user = Volta.User;
    var cart = Volta.Cart;
    var ui = Volta.UI;
    var totalQty = cart.totalQty();
    var cartBadge = totalQty > 99 ? '99+' : String(totalQty);
    var favCount = user.favoriteCount();
    var favBadge = favCount > 99 ? '99+' : String(favCount);
    var isDark = ui.isDark();

    var navHtml = NAV_LINKS.map(function (link) {
      var cls = 'site-nav__link' + (link.tab && link.tab === activeTab ? ' is-active' : '');
      return '<a href="' + link.href + '" class="' + cls + '">' + link.label + '</a>';
    }).join('');

    var userArea = '';
    if (user.isLogin()) {
      var nick = user.nickname();
      var initial = nick.slice(0, 1).toUpperCase();
      userArea = '<div class="user-area desktop-only">'
        + '<button type="button" class="user-chip" aria-expanded="false" data-action="toggle-user-menu">'
        + '<span class="user-chip__avatar mono" aria-hidden="true">' + initial + '</span>'
        + '<span class="user-chip__name">' + nick + '</span>'
        + '</button>'
        + '<div class="user-menu" style="display:none">'
        + '<div class="user-menu__head"><p class="user-menu__name">' + nick + '</p>'
        + '<p class="user-menu__meta mono">' + (user.profile ? user.profile.level : '') + ' · 订单 ' + user.orderCount() + '</p></div>'
        + '<a href="/shuma/profile" class="user-menu__item">个人主页</a>'
        + '<a href="/shuma/orders" class="user-menu__item">我的订单</a>'
        + '<a href="/shuma/favorites" class="user-menu__item">我的收藏</a>'
        + '<button type="button" class="user-menu__item user-menu__item--danger" data-action="logout">退出登录</button>'
        + '</div></div>';
    } else {
      userArea = '<div class="user-area desktop-only"><a href="/shuma/login" class="btn btn--sm btn--outline-accent">登录</a></div>';
    }

    return ''
      + '<header class="site-header">'
      + '<div class="container site-header__bar">'
      + '<a href="/shuma/index" class="brand" aria-label="VOLTA 数码商城 首页">'
      + '<span class="brand__mark" aria-hidden="true">' + svgBrand() + '</span>'
      + '<span class="brand__text" style="display:inline-flex;align-items:baseline;gap:8px;white-space:nowrap;"><span class="brand__name" style="display:inline;">VOLTA</span><span class="brand__sub" style="display:inline;">DIGITAL STORE</span></span>'
      + '</a>'
      + '<nav class="site-nav" aria-label="主导航">' + navHtml + '</nav>'
      + '<div class="header-search"><div data-mount="search-box" data-mode="header"></div></div>'
      + '<div class="header-actions">'
      + '<button type="button" class="icon-btn mobile-only" aria-expanded="false" aria-label="搜索" data-action="toggle-mobile-search">' + svgSearch() + '</button>'
      + '<button type="button" class="icon-btn" aria-label="' + (isDark ? '切换到日间模式' : '切换到夜间模式') + '" data-action="toggle-theme">'
      + (isDark ? svgSun() : svgMoon())
      + '</button>'
      + '<a href="/shuma/favorites" class="icon-btn" aria-label="我的收藏">' + svgHeart()
      + (favCount ? '<span class="icon-btn__badge">' + favBadge + '</span>' : '') + '</a>'
      + '<a href="/shuma/cart" class="icon-btn" aria-label="购物车">' + svgCart()
      + (totalQty ? '<span class="icon-btn__badge">' + cartBadge + '</span>' : '') + '</a>'
      + userArea
      + '</div>'
      + '</div>'
      + '<div class="mobile-search" style="display:none"><div class="container"><div data-mount="search-box" data-mode="mobile"></div></div></div>'
      + '</header>';
  }

  function bindHeader(root) {
    var ui = Volta.UI;
    var user = Volta.User;
    var $root = $(root);

    // 先解绑之前的委托，防止 bindHeader 被多次调用时事件处理器累积
    $root.off('click', '[data-action="toggle-theme"]');
    $root.off('click', '[data-action="toggle-mobile-search"]');
    $root.off('click', '[data-action="toggle-user-menu"]');
    $root.off('click', '[data-action="logout"]');

    $root.on('click', '[data-action="toggle-theme"]', function (e) { e.preventDefault(); ui.toggleTheme(); });
    $root.on('click', '[data-action="toggle-mobile-search"]', function (e) {
      e.preventDefault();
      $root.find('.mobile-search').slideToggle(160);
    });
    $root.on('click', '[data-action="toggle-user-menu"]', function (e) {
      e.preventDefault();
      var $btn = $(this);
      var $menu = $btn.siblings('.user-menu');
      var open = $menu.is(':visible');
      $menu.slideToggle(160);
      $btn.attr('aria-expanded', String(!open));
      if (!open) {
        var handler = function (ev) {
          if (!$(ev.target).closest($root.find('.user-area')).length) {
            $menu.slideUp(160); $btn.attr('aria-expanded', 'false');
            $(document).off('click', handler);
          }
        };
        setTimeout(function () { $(document).on('click', handler); }, 0);
      }
    });
    $root.on('click', '[data-action="logout"]', function (e) {
      e.preventDefault();
      user.logout();
      ui.toast('已退出登录');
      var path = location.pathname.split('/').slice(-1)[0];
      if (['/shuma/profile', '/shuma/orders', '/shuma/favorites', '/shuma/checkout', '/shuma/orders/confirm'].indexOf(path) !== -1) {
        location.href = '/shuma/index';
      } else {
        Volta.Layout.mount(Volta.Layout.currentTab());
      }
    });

    // bindHeader 里不再调 SearchBox.bind，统一由 mountAllSearchBoxes 负责

  }

  /* ============================== TabBar ============================== */
  function renderTabBar(activeTab) {
    var user = Volta.User;
    var cart = Volta.Cart;
    var items = TABBAR_ITEMS.map(function (item) {
      var href = item.href;
      if (item.loginHref && !user.isLogin()) href = item.loginHref;
      var isActive = false;
      if (item.tab === 'orders') isActive = (activeTab === 'orders' || activeTab === 'me');
      else if (item.tab === 'me') isActive = (activeTab === 'me' || activeTab === 'orders');
      else isActive = (item.tab === activeTab);
      var badge = '';
      if (item.badge) {
        var q = cart.totalQty();
        if (q > 0) badge = '<span class="tabbar__badge">' + (q > 99 ? '99+' : q) + '</span>';
      }
      return '<a href="' + href + '" class="tabbar__item' + (isActive ? ' is-active' : '') + '"'
        + (isActive ? ' aria-current="page"' : '') + '>'
        + svgTab(item.icon) + '<span>' + item.label + '</span>' + badge + '</a>';
    }).join('');
    return '<nav class="tabbar" aria-label="底部导航">' + items + '</nav>';
  }

  /* ============================== Footer ============================== */
  function renderFooter() {
    var cols = [
      { title: '选购', links: [
        { label: '全部商品', href: '/shuma/list' },
        { label: '手机通讯', href: '/shuma/list?cat=P01' },
        { label: '电脑整机', href: '/shuma/list?cat=C01' },
        { label: '影音娱乐', href: '/shuma/list?cat=A01' }
      ]},
      { title: '账户', links: [
        { label: '登录 / 注册', href: '/shuma/login' },
        { label: '我的订单', href: '/shuma/orders' },
        { label: '我的收藏', href: '/shuma/favorites' },
        { label: '购物车', href: '/shuma/cart' }
      ]},
      { title: '服务', links: [
        { label: '七天无理由退货', href: '/shuma/list' },
        { label: '全国联保', href: '/shuma/list' },
        { label: '顺丰包邮', href: '/shuma/list' },
        { label: '价格保护', href: '/shuma/list' }
      ]}
    ];
    var colsHtml = cols.map(function (c) {
      var links = c.links.map(function (l) { return '<li><a href="' + l.href + '">' + l.label + '</a></li>'; }).join('');
      return '<div class="site-footer__col"><h3>' + c.title + '</h3><ul>' + links + '</ul></div>';
    }).join('');

    return '<footer class="site-footer">'
      + '<div class="container site-footer__grid">'
      + '<div class="site-footer__col">'
      + '<div class="brand" style="margin-bottom: var(--sp-3)">'
      + '<span class="brand__mark" aria-hidden="true">' + svgBrand() + '</span>'
      + '<span class="brand__name">VOLTA</span>'
      + '</div>'
      + '<p class="footer-note">本页面为前端演示项目：商品、品牌、评价、订单均为虚构数据，所有操作只在浏览器本地生效，不涉及真实交易、支付与账号。</p>'
      + '</div>'
      + colsHtml
      + '</div>'
      + '<div class="container site-footer__bottom">'
      + '<span>© 2026 VOLTA DIGITAL STORE · DEMO</span>'
      + '<span>纯前端演示 · 数据保存在本地浏览器</span>'
      + '</div>'
      + '</footer>';
  }

  /* ============================== Toast ============================== */
  function renderToastHost() {
    return '<div class="toast-host" role="status" aria-live="polite"></div>';
  }
  function syncToasts($host) {
    var $container = $host.find('.toast-host');
    if (!$container.length) {
      $container = $(renderToastHost()).appendTo($host);
    }
    var list = Volta.UI.toasts;
    var html = list.map(function (t) {
      return '<div class="toast toast--' + (t.type || 'info') + '" data-toast-id="' + t.id + '">'
        + '<span class="toast__bar"></span><span class="toast__text">' + t.message + '</span></div>';
    }).join('');
    $container.html(html);
  }

  /* ============================ BackToTop ============================ */
  function renderBackToTop() {
    return '<button type="button" class="back-to-top" aria-label="回到顶部" style="display:none">↑</button>';
  }
  function bindBackToTop($btn) {
    $(window).on('scroll', function () {
      $btn.toggle(window.scrollY > 600);
    });
    $btn.on('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ============================ 根据 activeTab 高亮 nav/tabbar ============================ */
  function highlightActiveTab(activeTab) {
    // Nav：遍历 .site-nav__link，对比 href 与 tab 映射
    $('.site-nav__link').removeClass('is-active');
    if (activeTab) {
      NAV_LINKS.forEach(function (link) {
        if (link.tab === activeTab) {
          $('.site-nav__link[href="' + link.href + '"]').addClass('is-active');
        }
      });
    }

    // TabBar：更复杂（orders/me 互高亮）
    var $tabbarItems = $('.tabbar__item');
    $tabbarItems.removeClass('is-active').removeAttr('aria-current');
    TABBAR_ITEMS.forEach(function (item, idx) {
      var isActive = false;
      if (item.tab === 'orders') isActive = (activeTab === 'orders' || activeTab === 'me');
      else if (item.tab === 'me') isActive = (activeTab === 'me' || activeTab === 'orders');
      else isActive = (item.tab === activeTab);
      if (isActive) {
        $tabbarItems.eq(idx).addClass('is-active').attr('aria-current', 'page');
      }
    });
  }

  /* ============================ SearchBox 批量挂载 ============================ */
  function mountAllSearchBoxes() {
    if (!Volta.Components || !Volta.Components.SearchBox) return;
    $('[data-mount="search-box"]').each(function () {
      var mode = $(this).data('mode') || 'header';
      $(this).html(Volta.Components.SearchBox.render({ mode: mode }));
      Volta.Components.SearchBox.bind($(this), function (kw) {
        location.href = '/shuma/list' + (kw ? '?q=' + encodeURIComponent(kw) : '');
      });
    });
  }

  /* ============================ 主题按钮图标 ============================ */
  function syncThemeBtn() {
    var ui = Volta.UI;
    var $btn = $('.site-header [data-action="toggle-theme"]');
    if (!$btn.length) return;
    $btn.attr('aria-label', ui.isDark() ? '切换到日间模式' : '切换到夜间模式');
    $btn.html(ui.isDark() ? svgSun() : svgMoon());
  }

  /* ============================== Mount ============================== */
  var currentTab_ = '';
  var storeListenersBound_ = false;
  function currentTab() { return currentTab_; }

  function mount(tab, opts) {
    opts = opts || {};
    currentTab_ = tab;
    var $body = $(document.body);

    // 整体骨架
    if (!$body.hasClass('app-shell')) $body.addClass('app-shell atmosphere');

    /* ====== 预渲染后不再注入外壳 HTML，只做事件绑定 + 挂载 SearchBox ====== */

    // 绑定 header 事件（无论 header 是预渲染的还是 data-mount 占位的）
    var $header = $('.site-header');
    if ($header.length) {
      bindHeader($header[0]);
    }

    // 挂载顶栏 / 移动端搜索栏（data-mount="search-box" 占位仍由 SearchBox.render 填充）
    mountAllSearchBoxes();

    // BackToTop 事件绑定（如果 DOM 已存在）
    var $btt = $('.back-to-top');
    if ($btt.length) {
      bindBackToTop($btt);
    }

    // Toast 首次同步
    syncToasts($('body'));

    // 根据 activeTab 高亮 nav 和 tabbar
    highlightActiveTab(currentTab_);

    /* ====== 全局 store 监听（只绑定一次，防 mount() 重复调用时的监听器泄漏）====== */
    if (!storeListenersBound_) {
      storeListenersBound_ = true;

      // 1) Toast 同步
      Volta.UI.onChange(function () {
        syncToasts($('body'));
      });

      // 2) 主题变化 → 更新主题按钮图标
      Volta.UI.onChange(function () {
        syncThemeBtn();
      });

      // 3) 搜索历史变化 → 重渲染 SearchBox DOM
      var _lastSearchHistKey_ = '';
      Volta.UI.onChange(function () {
        var cur = JSON.stringify(Volta.UI.searchHistory || []);
        if (cur !== _lastSearchHistKey_) {
          _lastSearchHistKey_ = cur;
          mountAllSearchBoxes();
        }
      });

      // 4) Cart 变化 → 刷新顶栏 + TabBar 购物车徽章
      Volta.Cart.onChange(function () {
        var qty = Volta.Cart.totalQty();
        var badgeText = qty > 99 ? '99+' : String(qty);

        // 顶栏徽章
        var $headerCart = $('.site-header .icon-btn[aria-label="购物车"]');
        if ($headerCart.length) {
          var $hb = $headerCart.find('.icon-btn__badge');
          if (qty > 0) {
            if ($hb.length) { $hb.text(badgeText); $hb.show(); }
            else $headerCart.append('<span class="icon-btn__badge">' + badgeText + '</span>');
          } else {
            $hb.remove();
          }
        }

        // TabBar 徽章（购物车第 4 项，index 3）
        var $cartTab = $('.tabbar .tabbar__item').eq(3);
        if ($cartTab.length) {
          var $tb = $cartTab.find('.tabbar__badge');
          if (qty > 0) {
            if ($tb.length) { $tb.text(badgeText); $tb.show(); }
            else $cartTab.append('<span class="tabbar__badge">' + badgeText + '</span>');
          } else {
            $tb.remove();
          }
        }
      });

      // 5) 用户变化 → 局部更新：收藏角标 + 登录/登出时刷新 user-area
      var _prevUserSig_ = '';
      Volta.User.onChange(function () {
        // 5a) 收藏角标实时更新
        var favCount = Volta.User.favoriteCount();
        var favBadge = favCount > 99 ? '99+' : String(favCount);
        var $headerFav = $('.site-header a.icon-btn[href="/shuma/favorites"]');
        if ($headerFav.length) {
          var $fb = $headerFav.find('.icon-btn__badge');
          if (favCount > 0) {
            if ($fb.length) { $fb.text(favBadge); $fb.show(); }
            else $headerFav.append('<span class="icon-btn__badge">' + favBadge + '</span>');
          } else {
            $fb.remove();
          }
        }

        // 5b) 登录/登出 → 局部替换 user-area
        var curSig = Volta.User.isLogin() ? 'in:' + (Volta.User.profile ? Volta.User.profile.phone : '') : 'out';
        if (curSig !== _prevUserSig_) {
          _prevUserSig_ = curSig;
          // 找到 header，替换 user-area
          var $ha = $('.site-header .header-actions');
          if ($ha.length) {
            // 移除旧的 .user-area 或 .user-chip 相关 DOM
            $ha.find('.user-area').remove();
            // 根据登录状态插入新的 user-area
            var uaHtml;
            if (Volta.User.isLogin()) {
              var nick = Volta.User.nickname();
              var initial = nick.slice(0, 1).toUpperCase();
              uaHtml = '<div class="user-area desktop-only">'
                + '<button type="button" class="user-chip" aria-expanded="false" data-action="toggle-user-menu">'
                + '<span class="user-chip__avatar mono" aria-hidden="true">' + initial + '</span>'
                + '<span class="user-chip__name">' + nick + '</span>'
                + '</button>'
                + '<div class="user-menu" style="display:none">'
                + '<div class="user-menu__head"><p class="user-menu__name">' + nick + '</p>'
                + '<p class="user-menu__meta mono">' + (Volta.User.profile ? Volta.User.profile.level : '') + ' · 订单 ' + Volta.User.orderCount() + '</p></div>'
                + '<a href="/shuma/profile" class="user-menu__item">个人主页</a>'
                + '<a href="/shuma/orders" class="user-menu__item">我的订单</a>'
                + '<a href="/shuma/favorites" class="user-menu__item">我的收藏</a>'
                + '<button type="button" class="user-menu__item user-menu__item--danger" data-action="logout">退出登录</button>'
                + '</div></div>';
            } else {
              uaHtml = '<div class="user-area desktop-only"><a href="/shuma/login" class="btn btn--sm btn--outline-accent">登录</a></div>';
            }
            $ha.append(uaHtml);
            // 重新绑定事件到新 DOM
            bindHeader($('.site-header')[0]);
          }

          // 登录态变化时还需要更新 tabbar 的"我的"项 href（未登录时指向 /shuma/login）
          var $meTab = $('.tabbar .tabbar__item').eq(4);
          if ($meTab.length) {
            if (Volta.User.isLogin()) {
              $meTab.attr('href', '/shuma/profile');
            } else {
              $meTab.attr('href', '/shuma/login?redirect=' + encodeURIComponent('/shuma/profile'));
            }
          }
        }
      });
    }

    // ====== 首次同步：header / tabbar 根据登录态修正硬编码的静态 HTML ======
    syncUserAreaOnMount();

    // 触发 reveal 入场
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  }

  /**
   * 页面首次加载时，Volta.User.onChange 不会自动触发（没有 persist()），
   * 但 header 是硬编码的"登录"按钮，tabbar 的"我的"也是指向 /shuma/login。
   * 这里主动根据当前登录态修正 DOM。
   */
  function syncUserAreaOnMount() {
    var user = Volta.User;
    var $header = $('.site-header');
    if (!$header.length) return;

    // 替换 header 里的 .user-area
    var $ha = $header.find('.header-actions');
    if ($ha.length) {
      $ha.find('.user-area').remove();
      var uaHtml;
      if (user.isLogin()) {
        var nick = user.nickname();
        var initial = nick.slice(0, 1).toUpperCase();
        uaHtml = '<div class="user-area desktop-only">'
          + '<button type="button" class="user-chip" aria-expanded="false" data-action="toggle-user-menu">'
          + '<span class="user-chip__avatar mono" aria-hidden="true">' + initial + '</span>'
          + '<span class="user-chip__name">' + nick + '</span>'
          + '</button>'
          + '<div class="user-menu" style="display:none">'
          + '<div class="user-menu__head"><p class="user-menu__name">' + nick + '</p>'
          + '<p class="user-menu__meta mono">' + (user.profile ? user.profile.level : '') + ' · 订单 ' + user.orderCount() + '</p></div>'
          + '<a href="/shuma/profile" class="user-menu__item">个人主页</a>'
          + '<a href="/shuma/orders" class="user-menu__item">我的订单</a>'
          + '<a href="/shuma/favorites" class="user-menu__item">我的收藏</a>'
          + '<button type="button" class="user-menu__item user-menu__item--danger" data-action="logout">退出登录</button>'
          + '</div></div>';
      } else {
        uaHtml = '<div class="user-area desktop-only"><a href="/shuma/login" class="btn btn--sm btn--outline-accent">登录</a></div>';
      }
      $ha.append(uaHtml);
      bindHeader($header[0]);
    }

    // 同步 tabbar "我的" 项的 href
    var $meTab = $('.tabbar .tabbar__item').eq(4);
    if ($meTab.length) {
      if (user.isLogin()) $meTab.attr('href', '/shuma/profile');
      else $meTab.attr('href', '/shuma/login?redirect=' + encodeURIComponent('/shuma/profile'));
    }

    // 同步收藏角标
    var favCount = user.favoriteCount();
    var favBadge = favCount > 99 ? '99+' : String(favCount);
    var $headerFav = $('.site-header a.icon-btn[href="/shuma/favorites"]');
    if ($headerFav.length) {
      var $fb = $headerFav.find('.icon-btn__badge');
      if (favCount > 0) {
        if ($fb.length) { $fb.text(favBadge); $fb.show(); }
        else $headerFav.append('<span class="icon-btn__badge">' + favBadge + '</span>');
      } else { $fb.remove(); }
    }

    // 同步购物车角标（header + tabbar）
    var cart = Volta.Cart;
    if (cart) {
      var qty = cart.totalQty();
      var cartBadge = qty > 99 ? '99+' : String(qty);
      // header 购物车角标
      var $headerCart = $('.site-header .icon-btn[aria-label="购物车"]');
      if ($headerCart.length) {
        var $hb = $headerCart.find('.icon-btn__badge');
        if (qty > 0) {
          if ($hb.length) { $hb.text(cartBadge); $hb.show(); }
          else $headerCart.append('<span class="icon-btn__badge">' + cartBadge + '</span>');
        } else { $hb.remove(); }
      }
      // tabbar 购物车角标（第 4 项，index 3）
      var $cartTab = $('.tabbar .tabbar__item').eq(3);
      if ($cartTab.length) {
        var $tb = $cartTab.find('.tabbar__badge');
        if (qty > 0) {
          if ($tb.length) { $tb.text(cartBadge); $tb.show(); }
          else $cartTab.append('<span class="tabbar__badge">' + cartBadge + '</span>');
        } else { $tb.remove(); }
      }
    }
  }

  global.Volta.Layout = {
    mount: mount,
    currentTab: currentTab,
    renderHeader: renderHeader,
    renderTabBar: renderTabBar,
    renderFooter: renderFooter,
    bindHeader: bindHeader
  };
})(window);
