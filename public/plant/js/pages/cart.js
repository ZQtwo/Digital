/**
 * cart.js —— 购物车（jQuery 版）
 * 桌面端：左侧明细 + 右侧吸顶结算面板；移动端：底部固定结算条。
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var Data = Volta.Data;
  var UI = Volta.UI;
  var Components = Volta.Components;

  var removingKey = '';

  function stockOf(item) { return Volta.Inventory.getStock(item.productId); }

  function stockIssueOf(item) {
    var s = stockOf(item);
    if (s <= 0) return '该商品已缺货';
    if (s < item.qty) return '库存仅剩 ' + s + ' 件';
    return '';
  }

  function hasStockIssue() {
    return Volta.Cart.checkedItems().some(function (it) { return stockOf(it) < it.qty; });
  }

  function optionText(item) {
    var entries = Object.keys(item.options || {});
    if (!entries.length) return '标准配置';
    return entries.map(function (k) { return k + '：' + item.options[k]; }).join(' · ');
  }

  function totalText() { return F.formatPrice(Volta.Cart.checkedSubtotal()); }

  /* ------------------------------ 渲染 ------------------------------- */
  function renderEmpty() {
    return '<div class="container cart">'
      + renderHead()
      + Components.EmptyState.render({
        icon: '🛒',
        title: '购物车还是空的',
        text: '挑几件称手的数码产品，参数都写在明面上。',
        action: '去逛逛',
        actionHref: '/shuma/list'
      })
      + '</div>';
  }

  function renderHead() {
    return ''
      + '<header class="cart__head">'
      + '<div><span class="eyebrow">CART</span><h1 class="display-2">购物车</h1></div>'
      + '<p class="mono cart__count">共 ' + Volta.Cart.lineCount() + ' 种商品 / ' + Volta.Cart.totalQty() + ' 件</p>'
      + '</header>';
  }

  function renderBar() {
    var allChecked = Volta.Cart.allChecked();
    return ''
      + '<div class="cart__bar">'
      + renderCheckLine('all', allChecked, '全选', '')
      + '<div class="cart__bar-actions">'
      + '<button type="button" class="btn btn--sm btn--ghost" data-action="remove-checked">删除选中</button>'
      + '<button type="button" class="btn btn--sm btn--ghost" data-action="clear-all">清空</button>'
      + '</div>'
      + '</div>';
  }

  function renderCheckLine(key, checked, label, ariaLabel) {
    return '<label class="check-line' + (ariaLabel ? ' check-line--only' : '') + '">'
      + '<input type="checkbox" data-action="toggle-check" data-key="' + key + '"' + (checked ? ' checked' : '') + (ariaLabel ? ' aria-label="' + ariaLabel + '"' : '') + ' />'
      + '<span class="check-line__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>'
      + (label ? '<span>' + label + '</span>' : '')
      + '</label>';
  }

  function renderCartItem(item) {
    var issue = stockIssueOf(item);
    var art = Volta.ProductArt.render(item.art, item.artSeed, item.name + ' 示意图');
    return ''
      + '<li class="cart-item' + (removingKey === item.key ? ' is-removing' : '') + '" data-key="' + item.key + '">'
      + renderCheckLine(item.key, item.checked, '', '选择 ' + item.name)
      + '<a href="/shuma/product/' + item.productId + '" class="cart-item__art">' + art + '</a>'
      + '<div class="cart-item__info">'
      + '<a href="/shuma/product/' + item.productId + '" class="cart-item__name">' + item.name + '</a>'
      + '<span class="cart-item__options mono">' + optionText(item) + '</span>'
      + '<span class="cart-item__brand mono">' + item.brand + '</span>'
      + (issue ? '<span class="cart-item__warn mono">' + issue + '</span>' : '')
      + '</div>'
      + '<div class="cart-item__price mono">¥' + F.formatPrice(item.price) + '</div>'
      + '<div class="cart-item__qty">' + Components.QuantityStepper.render({ value: item.qty, max: Math.max(1, stockOf(item)) }) + '</div>'
      + '<div class="cart-item__total">¥' + F.formatPrice(item.price * item.qty) + '</div>'
      + '<button type="button" class="cart-item__del" data-action="remove" data-key="' + item.key + '" aria-label="从购物车移除 ' + item.name + '">'
      + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></svg>'
      + '</button>'
      + '</li>';
  }

  function renderMain() {
    var items = Volta.Cart.items;
    var listHtml = items.map(renderCartItem).join('');
    var subtotal = Volta.Cart.checkedSubtotal();
    var summary = ''
      + '<aside class="cart__aside">'
      + '<div class="summary card card--padded">'
      + '<p class="eyebrow">SUMMARY</p>'
      + '<dl class="summary__list">'
      + '<div><dt>已选商品</dt><dd class="mono">' + Volta.Cart.checkedQty() + ' 件</dd></div>'
      + '<div><dt>商品金额</dt><dd class="mono">¥' + F.formatPrice(subtotal) + '</dd></div>'
      + '<div><dt>运费</dt><dd class="mono">' + (subtotal >= 199 ? '包邮' : '¥12') + '</dd></div>'
      + '</dl>'
      + '<div class="summary__total"><span>合计</span><span class="price price--lg"><span class="price__sym">¥</span>' + totalText() + '</span></div>'
      + '<button type="button" class="btn btn--primary btn--block" data-action="checkout"' + (!Volta.Cart.checkedItems().length ? ' disabled' : '') + '>去结算</button>'
      + '<p class="summary__note">优惠券与运费将在结算页统一计算，登录后可继续下单。</p>'
      + '</div>'
      + '</aside>';
    return ''
      + '<div class="cart__layout">'
      + '<div class="cart__main">'
      + renderBar()
      + '<ul class="cart-list">' + listHtml + '</ul>'
      + '</div>'
      + summary
      + '</div>';
  }

  function renderActionBar() {
    if (!Volta.Cart.items.length) return '';
    var allChecked = Volta.Cart.allChecked();
    return ''
      + '<div class="action-bar cart-action">'
      + renderCheckLine('all', allChecked, '全选', '')
      + '<div class="cart-action__total">'
      + '<span class="mono cart-action__hint">已选 ' + Volta.Cart.checkedQty() + ' 件</span>'
      + '<span class="price price--md"><span class="price__sym">¥</span>' + totalText() + '</span>'
      + '</div>'
      + '<button type="button" class="btn btn--primary" data-action="checkout"' + (!Volta.Cart.checkedItems().length ? ' disabled' : '') + '>结算</button>'
      + '</div>';
  }

  function renderPage() {
    var $root = $('#cart-root');
    if (!Volta.Cart.items.length) {
      $root.html(renderEmpty());
      bind($root);
      return;
    }
    var html = '<div class="cart container">' + renderHead() + renderMain() + '</div>' + renderActionBar();
    $root.html(html);
    bind($root);
    Volta.Reveal.init(document);
  }

  /* ------------------------------ 事件 ------------------------------- */
  var __bound = false;
  function bind($root) {
    // renderPage 在每次 Cart.onChange 后都会重绘并调用 bind，
    // 事件只绑一次；重复绑定会导致一次点击弹多个提示、重复调接口
    if (__bound) return;
    __bound = true;
    // 全选 / 单行勾选
    $root.on('change', '[data-action="toggle-check"]', function (e) {
      var key = String($(this).data('key'));
      if (key === 'all') {
        Volta.Cart.setAllChecked(!Volta.Cart.allChecked());
      } else {
        Volta.Cart.toggleCheck(key);
      }
      renderPage();
    });

    // 数量步进 —— setQty 里已 emit，Cart.onChange(renderPage) 会自动重渲染整个页面
    Components.QuantityStepper.bind($root, function (v, $wrap) {
      var $item = $wrap.closest('.cart-item');
      var key = String($item.data('key'));
      Volta.Cart.setQty(key, v);
      // emit 已触发 Cart.onChange(renderPage)，整个页面（包括底部结算条）自动重渲染
    });

    // 删除单行
    $root.on('click', '[data-action="remove"]', function (e) {
      e.preventDefault();
      var key = String($(this).data('key'));
      removingKey = key;
      var $item = $(this).closest('.cart-item');
      $item.addClass('is-removing');
      setTimeout(function () {
        Volta.Cart.removeItem(key);
        removingKey = '';
        UI.toast('已从购物车移除');
        renderPage();
      }, 160);
    });

    // 删除选中
    $root.on('click', '[data-action="remove-checked"]', function (e) {
      e.preventDefault();
      if (!Volta.Cart.checkedItems().length) { UI.toast('请先勾选要删除的商品', 'error'); return; }
      var n = Volta.Cart.checkedItems().length;
      Volta.Cart.removeChecked();
      UI.toast('已移除 ' + n + ' 件商品', 'success');
      renderPage();
    });

    // 清空
    $root.on('click', '[data-action="clear-all"]', function (e) {
      e.preventDefault();
      if (!Volta.Cart.items.length) return;
      Volta.Cart.clear();
      UI.toast('购物车已清空', 'success');
      renderPage();
    });

    // 去结算
    $root.on('click', '[data-action="checkout"]', function (e) {
      e.preventDefault();
      if (!Volta.Cart.checkedItems().length) { UI.toast('请先勾选要结算的商品', 'error'); return; }
      if (hasStockIssue()) { UI.toast('已选商品中存在库存不足，请先调整数量', 'error'); return; }
      if (!Volta.User.isLogin()) {
        UI.toast('请先登录再结算', 'error');
        global.location.href = '/shuma/login?redirect=' + encodeURIComponent('/shuma/cart');
        return;
      }
      global.location.href = '/shuma/checkout';
    });
  }

  /* ------------------------------ 入口 ------------------------------- */
  $(function () {
    UI.initTheme();
    Volta.Layout.mount('cart');

    // 订阅 Cart 变化（登录态下数据异步回来时自动重渲染；加购/改Qty/删除后也立即刷新）
    Volta.Cart.onChange(function () { renderPage(); });

    // 关键：等待商品数据加载完（bootstrap-data.js 发 volta:data-ready）
    // 之前有竞态：ensureLoaded() 拉购物车时商品列表还没加载，Data.getProduct() 返回 null
    function tryRenderAfterProducts() {
      var hasProducts = Volta.Data && Volta.Data.products && Volta.Data.products.length > 0;
      if (!hasProducts) {
        // 商品还没加载完，等 volta:data-ready 事件
        document.addEventListener('volta:data-ready', function () {
          // 商品数据齐了，重新从 API 拉购物车（这次 Data.getProduct 能找到了）
          if (typeof Volta.Cart.syncFromApi === 'function') {
            Volta.Cart.syncFromApi().then(function () { renderPage(); });
          } else {
            renderPage();
          }
        }, { once: true });
        // 同时先走一遍 ensureLoaded，购物车数据先回来就先渲染（商品信息可能不完整）
        if (typeof Volta.Cart.ensureLoaded === 'function') {
          Volta.Cart.ensureLoaded().then(function () { renderPage(); });
        } else {
          renderPage();
        }
      } else {
        // 商品已就绪，直接拉购物车 + 渲染
        if (typeof Volta.Cart.ensureLoaded === 'function') {
          Volta.Cart.ensureLoaded().then(function () { renderPage(); });
        } else if (typeof Volta.Cart.syncFromApi === 'function') {
          Promise.resolve(Volta.Cart.syncFromApi()).then(function () { renderPage(); });
        } else {
          renderPage();
        }
      }
    }

    tryRenderAfterProducts();
    setTimeout(function () { Volta.Reveal.init(document); }, 0);
  });
})(window);
