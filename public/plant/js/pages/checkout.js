/**
 * checkout.js —— 确认订单 / 结算（jQuery 版）
 * 纯前端模拟下单：地址做真实格式校验，提交后生成订单并写入本地存储，
 * 跳 /shuma/orders/success 显示订单号。
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var Data = Volta.Data;
  var UI = Volta.UI;
  var Components = Volta.Components;

  var PAY_OPTIONS = [
    { value: 'wechat', label: '微信支付' },
    { value: 'alipay', label: '支付宝' },
    { value: 'unionpay', label: '银联卡' }
  ];

  var TEMP_ADDR_KEY = 'volta.tmp.pickedAddr';

  var state = {
    selectedAddressId: '',
    shipping: 'standard',
    selectedCouponId: '',
    payMethod: 'wechat',
    agreed: true,
    submitting: false,
    /* 修改订单模式：从 order-confirm 「修改订单」按钮带 ?edit=xxx 跳过来 */
    isEdit: false,
    editId: '',
    editOrder: null
  };

  function pickedAddress() {
    if (!state.selectedAddressId) return null;
    return Volta.User.getAddress(state.selectedAddressId);
  }

  function items() {
    if (state.isEdit && state.editOrder) return state.editOrder.items || [];
    return Volta.Cart.checkedItems();
  }
  function subtotal() {
    if (state.isEdit && state.editOrder) return state.editOrder.subtotal || 0;
    return Volta.Cart.checkedSubtotal();
  }

  function shippingOptions() {
    var s = subtotal();
    return [
      { value: 'standard', label: '标准快递', desc: '预计 3–5 天送达', fee: s >= 199 ? 0 : 12 },
      { value: 'express', label: '次日达', desc: '工作日 12:00 前下单，次日送达', fee: 18 }
    ];
  }
  function shippingFee() {
    var opt = shippingOptions().find(function (s) { return s.value === state.shipping; });
    return opt ? opt.fee : 0;
  }

  function usableCoupons() {
    var now = Date.now();
    var s = subtotal();
    return Volta.User.coupons.filter(function (c) {
      return !c.used && c.expireAt > now && c.threshold <= s;
    });
  }

  function couponDiscount() {
    if (!state.selectedCouponId) return 0;
    var c = usableCoupons().find(function (x) { return x.id === state.selectedCouponId; });
    if (!c) return 0;
    return Math.min(c.amount, subtotal());
  }
  function couponTitle() {
    var c = usableCoupons().find(function (x) { return x.id === state.selectedCouponId; });
    return c ? c.title : '';
  }

  function payable() {
    return Math.max(0, subtotal() - couponDiscount() + shippingFee());
  }

  function renderHead() {
    return ''
      + '<header class="checkout__head">'
      + '<span class="eyebrow">CHECKOUT</span>'
      + '<h1 class="display-2">确认订单</h1>'
      + '</header>';
  }

  function renderEmpty(title, text) {
    return '<div class="container checkout">'
      + renderHead()
      + Components.EmptyState.render({
        icon: '🛒',
        title: title,
        text: text,
        action: '返回购物车',
        actionHref: '/shuma/cart'
      })
      + '</div>';
  }

  function renderAddressBlock() {
    var addr = pickedAddress();
    var list = Volta.User.listAddresses();
    var canSelect = list.length > 0;
    // redirect 带当前完整路径（含 ?edit=xxx），选完地址才能回到「修改订单」编辑页而不是普通结算页
    var selectorUrl = '/shuma/addresses?mode=select&redirect=' + encodeURIComponent(location.pathname + location.search);
    if (!addr) {
      // 没选地址：引导 + 直接点卡片区域跳地址页
      var emptyContent = canSelect
        ? '<div class="checkout-addr-empty" data-action="pick-addr">'
          + '<span class="checkout-addr-empty__icon">📍</span>'
          + '<span class="checkout-addr-empty__text">请选择收货地址</span>'
          + '<span class="checkout-addr-empty__arrow">›</span>'
          + '</div>'
        : '<div class="checkout-addr-empty" data-action="pick-addr">'
          + '<span class="checkout-addr-empty__icon">📍</span>'
          + '<span class="checkout-addr-empty__text">暂无收货地址，点击去添加</span>'
          + '<span class="checkout-addr-empty__arrow">›</span>'
          + '</div>';
      return ''
        + '<section class="card card--padded block">'
        + '<div class="block__head"><h2 class="display-3">收货信息</h2><span class="eyebrow">STEP 01</span></div>'
        + emptyContent
        + '</section>';
    }
    // 有选中地址：卡片显示 + 点卡片区域跳地址页
    return ''
      + '<section class="card card--padded block">'
      + '<div class="block__head"><h2 class="display-3">收货信息</h2><span class="eyebrow">STEP 01</span></div>'
      + '<div class="checkout-addr-card" data-action="pick-addr">'
      + '<div class="checkout-addr-card__main">'
      + '<div class="checkout-addr-card__row">'
      + '<span class="checkout-addr-card__name">' + addr.name + '</span>'
      + '<span class="checkout-addr-card__phone mono">' + addr.phone + '</span>'
      + (addr.isDefault ? '<span class="checkout-addr-card__default">默认</span>' : '')
      + '</div>'
      + '<p class="checkout-addr-card__region">' + addr.region + '</p>'
      + '<p class="checkout-addr-card__detail">' + addr.detail + '</p>'
      + '</div>'
      + '<span class="checkout-addr-card__arrow" aria-hidden="true">›</span>'
      + '</div>'
      + '</section>';
  }

  function renderShippingBlock() {
    var opts = shippingOptions().map(function (opt) {
      var checked = state.shipping === opt.value;
      return '<label class="radio-card radio-card--wide">'
        + '<input type="radio" name="shipping" value="' + opt.value + '"' + (checked ? ' checked' : '') + ' data-action="pick-shipping" data-value="' + opt.value + '" />'
        + '<span class="radio-card__text"><strong>' + opt.label + '</strong><em>' + opt.desc + '</em></span>'
        + '<span class="mono radio-card__fee">' + (opt.fee ? '¥' + opt.fee : '包邮') + '</span>'
        + '</label>';
    }).join('');
    return ''
      + '<section class="card card--padded block">'
      + '<div class="block__head"><h2 class="display-3">配送方式</h2><span class="eyebrow">STEP 02</span></div>'
      + '<div class="radio-row">' + opts + '</div>'
      + '</section>';
  }

  function renderCouponBlock() {
    var list = usableCoupons();
    var body;
    if (list.length) {
      body = '<div class="coupon-stack">'
        + list.map(function (c) {
          var sel = state.selectedCouponId === c.id;
          return Components.CouponCard.render(c, 'select') + (sel ? '<span class="tag tag--accent" style="margin-top:-8px">已选</span>' : '');
        }).join('')
        + '</div>';
    } else {
      body = '<p class="block__empty">' + (Volta.User.isLogin() ? '当前订单没有可用的优惠券，可到首页先领券。' : '登录后可查看账户中的优惠券。') + '</p>';
    }
    return ''
      + '<section class="card card--padded block">'
      + '<div class="block__head"><h2 class="display-3">优惠券</h2><span class="eyebrow">STEP 03</span></div>'
      + body
      + '</section>';
  }

  function renderPayBlock() {
    var opts = PAY_OPTIONS.map(function (opt) {
      var checked = state.payMethod === opt.value;
      return '<label class="radio-card">'
        + '<input type="radio" name="pay" value="' + opt.value + '"' + (checked ? ' checked' : '') + ' data-action="pick-pay" data-value="' + opt.value + '" />'
        + '<span>' + opt.label + '</span>'
        + '</label>';
    }).join('');
    return ''
      + '<section class="card card--padded block">'
      + '<div class="block__head"><h2 class="display-3">支付方式</h2><span class="eyebrow">STEP 04</span></div>'
      + '<div class="radio-row">' + opts + '</div>'
      + '<p class="block__empty">演示环境不会发起任何真实支付请求。</p>'
      + '</section>';
  }

  function renderItemsBlock() {
    var list = items();
    var html = list.map(function (it) {
      var art = Volta.ProductArt.render(it.art, it.artSeed, it.name + ' 示意图');
      var opt = Object.keys(it.options || {}).map(function (k) { return k + '：' + it.options[k]; }).join(' · ') || '标准配置';
      return ''
        + '<li class="order-item">'
        + '<span class="order-item__art">' + art + '</span>'
        + '<span class="order-item__info"><span class="order-item__name">' + it.name + '</span><span class="order-item__opt mono">' + opt + '</span></span>'
        + '<span class="mono order-item__qty">×' + it.qty + '</span>'
        + '<span class="mono order-item__price">¥' + F.formatPrice(it.price * it.qty) + '</span>'
        + '</li>';
    }).join('');
    return ''
      + '<section class="card card--padded block">'
      + '<div class="block__head"><h2 class="display-3">商品清单</h2><span class="mono block__count">' + list.length + ' 种 / ' + Volta.Cart.checkedQty() + ' 件</span></div>'
      + '<ul class="order-items">' + html + '</ul>'
      + '</section>';
  }

  function renderSummary() {
    var discount = couponDiscount();
    var fee = shippingFee();
    return ''
      + '<aside class="checkout__aside">'
      + '<div class="summary card card--padded">'
      + '<p class="eyebrow">PAYMENT</p>'
      + '<dl class="summary__list">'
      + '<div><dt>商品金额</dt><dd class="mono">¥' + F.formatPrice(subtotal()) + '</dd></div>'
      + '<div><dt>优惠券</dt><dd class="mono' + (discount ? ' is-cut' : '') + '">' + (discount ? '-¥' + F.formatPrice(discount) : '未使用') + '</dd></div>'
      + '<div><dt>运费</dt><dd class="mono">' + (fee ? '¥' + F.formatPrice(fee) : '包邮') + '</dd></div>'
      + '</dl>'
      + '<div class="summary__total"><span>应付金额</span><span class="price price--lg"><span class="price__sym">¥</span>' + F.formatPrice(payable()) + '</span></div>'
      + '<label class="agree">'
      + '<input type="checkbox"' + (state.agreed ? ' checked' : '') + ' data-action="toggle-agree" />'
      + '<span class="agree__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>'
      + '<span>我已阅读并同意《购买须知》与《隐私说明》（演示文本）</span>'
      + '</label>'
      + '<button type="button" class="btn btn--primary btn--block' + (state.submitting ? ' is-loading' : '') + '" data-action="submit"' + (state.submitting ? ' disabled' : '') + '>去支付</button>'
      + '<ul class="promise"><li>订单信息保存在本地浏览器，清空站点数据即会重置</li><li>如需重来，可在「我的订单」中删除演示订单</li></ul>'
      + '</div>'
      + '</aside>';
  }

  function renderPage() {
    var $root = $('#checkout-root');
    if (!items().length) {
      $root.html(renderEmpty('没有待结算的商品', '回到购物车勾选商品后再来结算。'));
      return;
    }
    var html = ''
      + '<div class="checkout container">'
      + renderHead()
      + '<div class="checkout__layout">'
      + '<div class="checkout__main">'
      + renderAddressBlock()
      + renderShippingBlock()
      + renderCouponBlock()
      + renderPayBlock()
      + renderItemsBlock()
      + '</div>'
      + renderSummary()
      + '</div>'
      + '</div>';
    $root.html(html);
    bind($root);
  }

  function refreshSummary() {
    var $aside = $('.checkout__aside');
    if ($aside.length) $aside.replaceWith(renderSummary());
  }

  function refreshAddress() {
    var $block = $('.checkout__main .block').first();
    if ($block.length) $block.replaceWith(renderAddressBlock());
  }

  function refreshShipping() {
    var $block = $('.checkout__main .block').eq(1);
    if ($block.length) $block.replaceWith(renderShippingBlock());
  }

  function refreshCoupons() {
    var $block = $('.checkout__main .block').eq(2);
    if ($block.length) $block.replaceWith(renderCouponBlock());
  }

  /* ------------------------------ 事件 ------------------------------- */
  function bind($root) {
    // 点击地址卡片 → 跳地址选择页（redirect 带当前路径，含 ?edit=xxx）
    $root.on('click', '[data-action="pick-addr"]', function () {
      global.location.href = '/shuma/addresses?mode=select&redirect=' + encodeURIComponent(location.pathname + location.search);
    });

    // 配送方式
    $root.on('change', '[data-action="pick-shipping"]', function (e) {
      state.shipping = String($(this).data('value'));
      refreshShipping();
      refreshSummary();
    });

    // 选 / 取消优惠券
    $root.on('click', '[data-action="select-coupon"]', function (e) {
      e.preventDefault();
      var cid = String($(this).data('cid'));
      state.selectedCouponId = (state.selectedCouponId === cid) ? '' : cid;
      refreshCoupons();
      refreshSummary();
    });

    // 支付方式
    $root.on('change', '[data-action="pick-pay"]', function (e) {
      state.payMethod = String($(this).data('value'));
    });

    // 同意条款
    $root.on('change', '[data-action="toggle-agree"]', function (e) {
      state.agreed = !!this.checked;
    });

    // 提交订单
    $root.on('click', '[data-action="submit"]', function (e) {
      e.preventDefault();
      if (state.submitting) return;
      submit();
    });
  }

  /* ------------------------------ 提交 ------------------------------- */
  function submit() {
    if (!items().length) { UI.toast('没有可结算的商品', 'error'); return; }
    var addr = pickedAddress();
    if (!addr) { UI.toast('请先选择收货地址', 'error'); return; }
    if (!state.agreed) { UI.toast('请先阅读并同意购买须知', 'error'); return; }

    state.submitting = true;
    refreshSummary();
    var $btns = $('[data-action="submit"]');
    $btns.addClass('is-loading').attr('disabled', 'disabled');

    var address = {
      name: addr.name,
      phone: addr.phone,
      region: addr.region,
      detail: addr.detail
    };

    // 模拟提交耗时
    setTimeout(function () {
      // 下单 payload —— 只传 store-user.createOrder 需要的字段
      var createPayload = {
        items: items().map(function (it) {
          return {
            skuCode: it.productId, // 前端用 skuCode，store-user 会转 DB id
            productId: it.productId,
            quantity: it.qty,
            options: Object.assign({}, it.options)
          };
        }),
        addressId: address.id,
        couponId: state.selectedCouponId || null,
        remark: null,
        payMethod: (PAY_OPTIONS.find(function (p) { return p.value === state.payMethod; }) || {}).value || 'wechat'
      };

      // 「修改订单」模式：调后端 PUT /orders/{orderNo}，收货地址/支付方式真实落库
      if (state.isEdit) {
        var pm = PAY_OPTIONS.find(function (p) { return p.value === state.payMethod; });
        Volta.API.Member.updateOrder(state.editId, {
          addressId: parseInt(addr.id, 10) || 0,
          payMethod: pm ? pm.value : 'wechat',
          remark: null
        }).then(function () {
          UI.toast('订单已更新，请确认付款', 'success');
          state.submitting = false;
          // 拉回最新订单（含新地址快照）后再跳确认页，避免本地缓存旧地址
          return Volta.User.refreshOrders();
        }).then(function () {
          global.location.href = '/shuma/orders/confirm?id=' + state.editId;
        }).catch(function (err) {
          UI.toast((err && err.message) || '修改失败，请重试', 'error');
          state.submitting = false;
          $btns.removeClass('is-loading').removeAttr('disabled');
        });
        return;
      }

      // 创建待付款订单（store-user.createOrder → POST /shuma/orders → 后端自动校验库存+扣库存+创建订单）
      Volta.User.createOrder(createPayload).then(function (res) {
        if (!res || !res.ok) {
          UI.toast('下单失败', 'error');
          state.submitting = false;
          refreshSummary();
          $('[data-action="submit"]').removeClass('is-loading').removeAttr('disabled');
          return;
        }

        // 清空已勾选的购物车行（仅本地）
        Volta.Cart.removeChecked();
        UI.toast('订单已提交，请确认付款', 'success');
        state.submitting = false;

        // 跳转到确认/支付页（走 Laravel 路由）
        var orderNo = res.orderNo;
        global.location.href = '/shuma/orders/confirm?id=' + orderNo;
      }).catch(function (err) {
        UI.toast((err && err.message) || '下单失败', 'error');
        state.submitting = false;
        refreshSummary();
        $('[data-action="submit"]').removeClass('is-loading').removeAttr('disabled');
      });
    }, 760);
  }

  /* ------------------------------ 入口 ------------------------------- */
  function pickInitialAddress() {
    // 1. 临时选中标记（从 addresses 选择页带回来的）——用户选哪个就用哪个（含非默认地址）
    //    先查后删：地址簿未加载完时查不到也不能丢标记，等下一轮重试
    try {
      var tmpId = localStorage.getItem(TEMP_ADDR_KEY);
      if (tmpId) {
        var tmp = Volta.User.getAddress(tmpId);
        if (tmp) {
          localStorage.removeItem(TEMP_ADDR_KEY);
          return tmpId;
        }
      }
    } catch (e) {}
    // 2. 默认地址
    var def = Volta.User.getDefaultAddress();
    if (def) return def.id;
    // 3. 第一个地址
    var all = Volta.User.listAddresses();
    if (all.length) return all[0].id;
    return '';
  }

  /* 等地址簿从数据库加载完（选择页带回的非默认地址才能查到） */
  function addrReadyPromise() {
    if (Volta.User.refreshAddresses && Volta.API && typeof Volta.API.getToken === 'function' && Volta.API.getToken()) {
      return Volta.User.refreshAddresses().catch(function () {});
    }
    return Promise.resolve();
  }

  /* 「修改订单」模式：用订单数据初始化编辑态 */
  function enterEditMode(ord, editId) {
    state.isEdit = true;
    state.editId = editId;
    state.editOrder = ord;
    state.shipping = ord.shippingType || 'standard';
    state.selectedCouponId = ord.couponId || '';
    var pm = PAY_OPTIONS.find(function (p) { return p.label === ord.payMethod; });
    state.payMethod = pm ? pm.value : 'wechat';
    state.agreed = true;
    // 把订单地址匹配到地址簿（匹配不到就用默认地址）
    var ordAddr = ord.address || {};
    var matchedId = '';
    var allAddrs = Volta.User.listAddresses();
    for (var i = 0; i < allAddrs.length; i++) {
      var a = allAddrs[i];
      if (a.name === ordAddr.name && a.phone === ordAddr.phone && a.region === ordAddr.region && a.detail === ordAddr.detail) {
        matchedId = a.id;
        break;
      }
    }
    // 用户从地址选择页带回的选择（临时标记）优先，其次匹配订单原地址
    var tmpPicked = '';
    try { tmpPicked = localStorage.getItem(TEMP_ADDR_KEY) || ''; } catch (e) {}
    if (tmpPicked && Volta.User.getAddress(tmpPicked)) {
      try { localStorage.removeItem(TEMP_ADDR_KEY); } catch (e) {}
      state.selectedAddressId = tmpPicked;
    } else {
      state.selectedAddressId = matchedId || pickInitialAddress();
    }
    renderPage();
  }

  function init() {
    // 顶部守卫：必须登录（带 redirect，登录后回到本页继续结算）
    if (!Volta.Auth.requireLogin('/shuma/login?redirect=' + encodeURIComponent(Volta.Auth.currentPath()))) return;

    // 检测 ?edit=xxx：进入「修改订单」模式
    // 订单事实源是数据库：先拉订单列表（本地缓存可能过期/为空），再等地址簿，最后匹配
    var editId = new URLSearchParams(location.search).get('edit');
    if (editId) {
      var ordersReady = (Volta.User.refreshOrders && Volta.API && typeof Volta.API.getToken === 'function' && Volta.API.getToken())
        ? Volta.User.refreshOrders().catch(function () {})
        : Promise.resolve();
      Promise.all([ordersReady, addrReadyPromise()]).then(function () {
        var ord = Volta.User.getOrder(editId);
        if (!ord || !(ord.items || []).length) {
          // 再试单条接口兜底
          if (Volta.API && Volta.API.Member && typeof Volta.API.Member.showOrder === 'function') {
            Volta.API.Member.showOrder(editId).then(function (res) {
              var o = res && res.data ? res.data : res;
              if (o && o.items && o.items.length) {
                Volta.User.updateOrder(editId, o);
                enterEditMode(Volta.User.getOrder(editId) || o, editId);
              } else {
                UI.toast('订单不存在，无法修改', 'error');
                global.location.replace('/shuma/orders');
              }
            }).catch(function () {
              UI.toast('订单不存在，无法修改', 'error');
              global.location.replace('/shuma/orders');
            });
            return;
          }
          UI.toast('订单不存在，无法修改', 'error');
          global.location.replace('/shuma/orders');
          return;
        }
        enterEditMode(ord, editId);
      });
      return;
    }

    // 关键：先等购物车数据从 API 加载完（异步 ensureLoaded），再检查 items
    var readyPromise = (typeof Volta.Cart.ensureLoaded === 'function')
      ? Volta.Cart.ensureLoaded()
      : Promise.resolve();

    readyPromise.then(function () {
      // 再等商品数据（bootstrap-data 发的 volta:data-ready）
      var productsReady = (Volta.Data && Volta.Data.products && Volta.Data.products.length > 0)
        ? Promise.resolve()
        : new Promise(function (res) {
            var handler = function () { document.removeEventListener('volta:data-ready', handler); res(); };
            document.addEventListener('volta:data-ready', handler, { once: true });
            // 5 秒兜底
            setTimeout(function () { document.removeEventListener('volta:data-ready', handler); res(); }, 5000);
          });

      productsReady.then(function () {
        // 先等地址簿加载完，再自动选中地址（临时标记 → 默认地址 → 第一个地址）
        addrReadyPromise().then(function () {
          state.selectedAddressId = pickInitialAddress();

          if (!items().length) {
            UI.toast('请先在购物车勾选商品', 'error');
            global.location.replace('/shuma/cart');
            return;
          }
          renderPage();
        });
      });
    });
  }

  $(function () {
    UI.initTheme();
    Volta.Layout.mount('');
    init();
    setTimeout(function () { Volta.Reveal.init(document); }, 0);
  });
})(window);
