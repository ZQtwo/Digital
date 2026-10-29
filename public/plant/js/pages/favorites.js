/**
 * favorites.js —— 我的收藏（jQuery 版，需登录）
 * 套 Volta.Layout.mount('favorites')
 * 功能：收藏商品列表、移除收藏（Volta.User.toggleFavorite）、加入购物车（Volta.Cart.add）、空态
 * 数据：Volta.User.favorites（productId 列表）→ map 到 Volta.Data.getProduct
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var UI = Volta.UI;
  var User = Volta.User;
  var Data = Volta.Data;
  var Cart = Volta.Cart;

  /* 登录守卫 */
  var loginTarget = '/shuma/login?redirect=' + encodeURIComponent(Volta.Auth.currentPath());
  if (!Volta.Auth.requireLogin(loginTarget)) return;

  /* 收藏列表：productId → 商品数据，过滤已不存在的 id */
  function favoriteList() {
    return (User.favorites || []).map(function (id) {
      return Data.getProduct(id);
    }).filter(Boolean);
  }

  /* 渲染头部 */
  function renderHead(count) {
    var clearBtn = count > 0
      ? '<button type="button" class="btn btn--sm btn--ghost" data-action="clear-all">清空收藏</button>'
      : '';
    return '<header class="favorites__head">'
      + '<div><span class="eyebrow">FAVORITES</span><h1 class="display-2">我的收藏</h1>'
      + (count > 0 ? '<p class="mono favorites__count">' + count + ' 件商品</p>' : '')
      + '</div>'
      + clearBtn
      + '</header>';
  }

  /* 渲染空态 */
  function renderEmpty() {
    return Volta.Components.EmptyState.render({
      icon: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.3l-6.6-6.5a4.2 4.2 0 1 1 6-5.9l.6.6.6-.6a4.2 4.2 0 1 1 6 5.9z" /></svg>',
      title: '还没有收藏任何商品',
      text: '在商品卡片或详情页点击心形图标即可收藏，方便下次比价时快速找回。',
      action: '去挑商品',
      actionHref: '/shuma/list'
    });
  }

  /* 主渲染 */
  function render() {
    var $root = $('#favorites-root');
    var list = favoriteList();
    var head = renderHead(list.length);
    var body;
    if (!list.length) {
      body = '<div>' + renderEmpty() + '</div>';
    } else {
      // 复用 ProductCard 组件渲染网格
      var cards = list.map(function (p) { return Volta.Components.ProductCard.render(p); }).join('');
      body = '<div class="grid-products">' + cards + '</div>';
    }
    $root.html('<div class="container favorites">' + head + body + '</div>');
    bind($root);
  }

  /* 事件绑定：收藏页自行处理 toggle-fav / quick-add，不调 ProductCard.bind 避免双重 toast */
  function bind($root) {
    // 收藏切换：取消收藏后直接移除卡片
    $root.on('click', '[data-action="toggle-fav"]', function (e) {
      e.preventDefault(); e.stopPropagation();
      var pid = $(this).data('pid');
      var on = User.toggleFavorite(pid);
      UI.toast(on ? '已加入收藏' : '已取消收藏', on ? 'success' : 'info');
      if (!on) {
        var $card = $(this).closest('.product-card');
        $card.fadeOut(180, function () {
          $card.remove();
          // 检查是否空了
          if (!favoriteList().length) {
            render();
          } else {
            $('.favorites__count').text(favoriteList().length + ' 件商品');
          }
        });
      }
    });
    // 加入购物车
    $root.on('click', '[data-action="quick-add"]', function (e) {
      e.preventDefault(); e.stopPropagation();
      var pid = $(this).data('pid');
      var p = Data.getProduct(pid);
      if (!p) return;
      if (Volta.Inventory.statusOf(pid) === 'out') {
        UI.toast('该商品已售罄', 'error');
        return;
      }
      var result = Cart.add(p, {}, 1);
      Promise.resolve(result).then(function (res) {
        if (res && res.ok) {
          UI.toast('已加入购物车', 'success');
        } else {
          UI.toast('操作失败', 'error');
        }
      }).catch(function () {
        UI.toast('操作失败', 'error');
      });
    });
    // 清空收藏
    $root.on('click', '[data-action="clear-all"]', function () {
      if (!User.favoriteCount()) return;
      (User.favorites || []).slice().forEach(function (id) {
        User.toggleFavorite(id);
      });
      UI.toast('已清空收藏', 'success');
      render();
    });
  }

  $(function () {
    // 初始化主题（避免闪烁）
    UI.initTheme();
    // 渲染外壳 + 当前页（favorites tab 高亮）
    Volta.Layout.mount('favorites');
    // 渲染页面内容
    render();
    // 入场动画
    setTimeout(function () { Volta.Reveal.init(document); }, 0);
  });
})(window);
