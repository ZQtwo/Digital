/**
 * home.js —— 首页（jQuery 版）
 * 页面骨架在 /shuma/index 预渲染，但所有业务数据来自 API 控制器：
 *   GET /shuma/api/home            → stats / feature / deals / categories / hotProducts
 *   GET /shuma/api/coupons/templates → 券模板（公开）
 * 本文件职责：
 *   1) HERO 统计 + 本周主推（#hero-stat-* / #hero-art / #hero-spec）
 *   2) 分类导航（#cat-grid）
 *   3) 今日限时价（#deals-grid）
 *   4) 本月热销榜（#rank-list）
 *   5) 优惠券（#coupon-grid，来自数据库券模板）
 *   6) 猜你喜欢：骨架 → 真实数据替换（Data.products，620ms 延迟 + 加载更多）
 *   7) 事件绑定 / 倒计时 / 入场动画
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var Data = Volta.Data;
  var UI = Volta.UI;

  /* ---------------- 工具：home 接口商品字段 → Data.products 同构（id=skuCode） ---------------- */
  function toCard(t) {
    return Data.getProduct(t.skuCode) || {
      id: t.skuCode,
      dbId: t.id,
      skuCode: t.skuCode,
      name: t.name,
      subtitle: t.subtitle || '',
      brand: t.brand,
      category: t.category,
      art: t.art,
      artSeed: t.artSeed,
      price: Number(t.price) || 0,
      listPrice: Number(t.listPrice) || 0,
      rating: Number(t.rating) || 0,
      ratingCount: t.ratingCount || 0,
      sales: t.sales || 0,
      stock: Number(t.stock) || 0,
      threshold: t.threshold || 20,
      tags: Array.isArray(t.tags) ? t.tags : [],
      highlights: [], desc: '', options: [], specs: {}
    };
  }

  /* ---------------- HERO：统计 + 本周主推 ---------------- */
  function renderHero(d) {
    if (d.stats) {
      $('#hero-stat-models').text(d.stats.models);
      $('#hero-stat-cats').text(d.stats.categories);
      $('#hero-stat-rating').text(d.stats.avgRating);
    }
    var p = d.feature;
    if (!p) return;
    $('#hero-art').html(Volta.ProductArt.render(p.art, p.artSeed, p.name + ' 示意图'));
    var discount = p.listPrice > p.price ? F.discountOf(p.price, p.listPrice) : 0;
    $('#hero-spec').html(
      '<p class="eyebrow">本周主推</p>'
      + '<a href="/shuma/product/' + p.skuCode + '" class="hero__spec-name">' + p.name + '</a>'
      + '<span class="price-tag price-tag--lg"><span class="price-tag__sym">¥</span>'
      + '<span class="price-tag__current">' + F.formatPrice(p.price) + '</span>'
      + (p.listPrice > p.price ? '<span class="price-tag__old">¥' + F.formatPrice(p.listPrice) + '</span>' : '')
      + (discount ? '<span class="price-tag__discount">-' + discount + '%</span>' : '')
      + '</span>'
      + '<div class="hero__spec-foot"><a href="/shuma/product/' + p.skuCode
      + '" class="btn btn--sm btn--outline-accent">查看完整规格</a></div>'
    );
  }

  /* ---------------- 分类导航 ---------------- */
  function renderCategories(cats) {
    var list = cats || [];
    $('#cat-grid').html(list.map(function (c, i) {
      return '<li class="reveal" data-delay="' + (2 + (i % 3)) + '">'
        + '<a href="/shuma/list?cat=' + c.code + '" class="cat-card">'
        + '<span class="cat-card__art">' + Volta.ProductArt.render(c.art || 'default', i + 2, c.name + ' 图标') + '</span>'
        + '<span class="cat-card__body"><span class="cat-card__name">' + c.name + '</span>'
        + '<span class="cat-card__count mono">' + (c.count || 0) + ' 款在售</span></span>'
        + '</a></li>';
    }).join(''));
    var n = list.length;
    $('#cat-count-label').text('CATEGORIES / ' + (n < 10 ? '0' : '') + n);
  }

  /* ---------------- 本月热销榜（rank-item） ---------------- */
  function renderRank(items) {
    $('#rank-list').html((items || []).slice(0, 6).map(function (t, i) {
      var p = toCard(t);
      var no = ('0' + (i + 1)).slice(-2);
      return '<li class="rank-item reveal" data-delay="' + (2 + (i % 3)) + '">'
        + '<span class="rank-item__no mono">' + no + '</span>'
        + '<a href="/shuma/product/' + p.id + '" class="rank-item__art" aria-label="' + p.name + '">'
        + Volta.ProductArt.render(p.art, p.artSeed, p.name + ' 示意图') + '</a>'
        + '<div class="rank-item__info">'
        + '<a href="/shuma/product/' + p.id + '" class="rank-item__name">' + p.name + '</a>'
        + '<span class="rank-item__meta mono">' + (p.brand || '') + ' · 已售 ' + F.formatSales(p.sales) + '</span>'
        + '</div>'
        + '<span class="price-tag price-tag--sm"><span class="price-tag__sym">¥</span>'
        + '<span class="price-tag__current">' + F.formatPrice(p.price) + '</span>'
        + (p.listPrice > p.price ? '<span class="price-tag__old">¥' + F.formatPrice(p.listPrice) + '</span>' : '')
        + '</span>'
        + '</li>';
    }).join(''));
  }

  /* ---------------- 今日限时价 + 备用：商品卡网格 ---------------- */
  function renderGrid(selector, items) {
    $(selector).html((items || []).map(function (t) {
      return Volta.Components.ProductCard.render(toCard(t));
    }).join(''));
  }

  /* ---------------- 优惠券（数据库模板） ---------------- */
  function renderCoupons(list) {
    var picks = (list || []).slice(0, 4);
    // 同步写入 Data，供领券点击时按 id 查找
    Data.couponTemplates = picks.map(function (t) {
      return {
        id: t.id, title: t.title, amount: Number(t.amount) || 0,
        threshold: Number(t.threshold) || 0, days: t.validDays || 30,
        scope: t.scope || '全场通用', desc: t.description || '', remaining: t.remaining
      };
    });
    Data.promotableCoupons = Data.couponTemplates;
    $('#coupon-grid').html(Data.promotableCoupons.map(function (cp) {
      return Volta.Components.CouponCard.render(cp, 'claim');
    }).join(''));
  }

  /* ---------------- 猜你喜欢（骨架 → 真实数据） ---------------- */
  function renderForYouLoading() {
    var sk = '';
    for (var i = 0; i < 8; i++) sk += Volta.Components.SkeletonCard.render();
    return '<section class="section container">'
      + '<header class="section-head"><div class="section-head__text"><span class="eyebrow">FOR YOU</span><h2 class="display-2 section-head__title">猜你喜欢</h2></div></header>'
      + '<div class="grid-products">' + sk + '</div></section>';
  }

  function renderForYou(visibleList, hasMore, loadingMore) {
    var cards = visibleList.map(function (p) { return Volta.Components.ProductCard.render(p); }).join('');
    var foot = hasMore
      ? '<div class="load-more"><button type="button" class="btn' + (loadingMore ? ' is-loading' : '') + '" id="load-more-btn">' + (loadingMore ? '加载中…' : '加载更多') + '</button></div>'
      : '<p class="load-end mono">— 已经到底了 —</p>';
    return '<section class="section container">'
      + '<header class="section-head"><div class="section-head__text"><span class="eyebrow">FOR YOU</span><h2 class="display-2 section-head__title">猜你喜欢</h2></div></header>'
      + '<div class="grid-products">' + cards + '</div>'
      + foot + '</section>';
  }

  /* ---------------- 领券 ---------------- */
  function claimCoupon(coupon) {
    if (!Volta.User.isLogin()) {
      UI.toast('登录后即可领券', 'error');
      return;
    }
    var ok = Volta.User.claimCoupon(coupon);
    UI.toast(ok ? '已领取「' + coupon.title + '」' : '该券已在你的账户中', ok ? 'success' : 'info');
  }

  /* ---------------- 事件绑定 ---------------- */
  function bind(root) {
    var $root = $(root);
    Volta.Components.ProductCard.bind($root);
    Volta.Components.SearchBox.bind($root, function (kw) {
      location.href = '/shuma/list' + (kw ? '?q=' + encodeURIComponent(kw) : '');
    });

    $root.on('click', '[data-action="claim-coupon"]', function (e) {
      e.preventDefault();
      var cid = $(this).data('cid');
      var c = Data.couponTemplates.find(function (t) { return t.id === cid; });
      if (c) claimCoupon(c);
      $('#coupon-grid').html(Data.promotableCoupons.map(function (cp) {
        return Volta.Components.CouponCard.render(cp, 'claim');
      }).join(''));
    });
  }

  /* ---------------- 倒计时 ---------------- */
  function startCountdown() {
    var d = new Date(); d.setHours(24, 0, 0, 0);
    var deadline = d.getTime();
    function tick() {
      var r = F.splitRemain(deadline - Date.now());
      $('#cd-h').text(r.h); $('#cd-m').text(r.m); $('#cd-s').text(r.s);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------- 等待 bootstrap-data 商品就绪（ProductCard/Inventory 依赖） ---------------- */
  function whenProductsReady(cb) {
    if (Data.products && Data.products.length) { cb(); return; }
    var fired = false;
    function done() { if (fired) return; fired = true; cb(); }
    global.addEventListener('volta:data-ready', done, { once: true });
    global.addEventListener('volta:data-error', done, { once: true });
    setTimeout(done, 4000); // 兜底
  }

  /* ---------------- 首页数据加载（全部来自控制器） ---------------- */
  function loadHome() {
    Volta.API.Public.home().then(function (res) {
      if (!res || !res.ok || !res.data) throw new Error('home 接口返回异常');
      var d = res.data;
      renderHero(d);
      renderCategories(d.categories);
      renderRank(d.hotProducts);
      renderGrid('#deals-grid', d.deals);
    }).catch(function (err) {
      console.error('[home] 首页数据加载失败:', (err && err.message) || err);
    });

    Volta.API.Public.couponTemplates().then(function (res) {
      if (!res || !res.ok || !res.data) return;
      renderCoupons(res.data.list);
    }).catch(function (err) {
      console.error('[home] 券模板加载失败:', (err && err.message) || err);
    });
  }

  /* ---------------- 入口 ---------------- */
  function render() {
    var $root = $('#main');
    bind($root[0]);
    startCountdown();

    whenProductsReady(function () {
      loadHome();

      // 猜你喜欢：骨架屏 → 620ms 后替换为真实数据（Data.products 来自 /api/products）
      var recommended = Data.products.filter(function (_, i) { return i % 2 === 0; });
      var shown = 8;
      function refreshForYou(loadingMore) {
        var list = recommended.slice(0, shown);
        var hasMore = shown < recommended.length;
        // "猜你喜欢" 是 <main> 内的第 5 个 section（index 4）
        $('#main > section').eq(4).replaceWith(renderForYou(list, hasMore, loadingMore));
        Volta.Components.ProductCard.bind($('#main'));
        Volta.Reveal.init(document);
      }
      setTimeout(function () { refreshForYou(false); }, 620);

      $('#main').on('click', '#load-more-btn', function () {
        var $btn = $(this);
        if ($btn.hasClass('is-loading')) return;
        $btn.addClass('is-loading').text('加载中…');
        setTimeout(function () {
          shown += 8;
          refreshForYou(false);
        }, 480);
      });

      Volta.Reveal.init(document);
    });
  }

  $(function () {
    UI.initTheme();
    Volta.Layout.mount('home');
    render();
    setTimeout(function () { Volta.Reveal.init(document); }, 0);
  });
})(window);
