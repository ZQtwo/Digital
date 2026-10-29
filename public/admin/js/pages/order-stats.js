/**
 * order-stats.js —— 订单统计页（jQuery 版）
 * 【v2】数据全部来自后端数据库：
 *   - GET /shuma/api/admin/stats/orders   → 订单总数/状态分布/销售额/客单价
 *   - GET /shuma/api/admin/stats/sales    → 近 7 日趋势（按天）
 *   - GET /shuma/api/admin/stats/products → 品类销售额占比 + Top 商品
 * 全部基于 SVG/div 渲染，无图表库依赖。
 */
(function (global) {
  'use strict';
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var Orders = Volta.Orders;
  var C = Volta.AdminComponents;
  var STATUS_MAP = Orders.ORDER_STATUSES;

  /* ------------------------------ 工具 ------------------------------ */
  function statusLabel(code) { return STATUS_MAP[code] ? STATUS_MAP[code].label : code; }
  function statusTone(code) { return C.StatusBadge.meta(code).tone; }
  function fmt3(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ------------------------------ 渲染 ----------------============== */
  function renderHead(total) {
    return '<header class="admin-head">'
      + '<div class="admin-head__text">'
        + '<span class="eyebrow">ORDER ANALYTICS</span>'
        + '<h1 class="display-3">订单统计</h1>'
        + '<p class="lede" style="font-size: var(--fs-sm)">基于 ' + total + ' 笔订单聚合的状态分布、品类占比与近 7 日趋势。数据实时来自数据库。</p>'
      + '</div>'
      + '<div>' + C.CsvButton.render({ id: 'order-stats', label: '导出明细 CSV' }) + '</div>'
    + '</header>';
  }

  function renderKPI(s) {
    var pending = (s.statusCounts.pending_pay || 0) + (s.statusCounts.pending_ship || 0);
    return '<div class="stat-grid">'
      + '<div class="stat-card"><span class="stat-card__label">订单总数</span>'
        + '<span class="stat-card__value">' + s.totalOrders + '<span class="stat-card__unit">笔</span></span></div>'
      + '<div class="stat-card stat-card--accent"><span class="stat-card__label">待处理</span>'
        + '<span class="stat-card__value">' + pending + '<span class="stat-card__unit">笔</span></span></div>'
      + '<div class="stat-card stat-card--success"><span class="stat-card__label">有效订单总额</span>'
        + '<span class="stat-card__value">¥' + F.formatPrice(s.totalSales) + '</span></div>'
      + '<div class="stat-card"><span class="stat-card__label">客单价</span>'
        + '<span class="stat-card__value">¥' + F.formatPrice(s.avgOrderAmount) + '</span></div>'
    + '</div>';
  }

  /* 状态分布条形图 */
  function renderStatusBar(s) {
    var codes = Object.keys(STATUS_MAP);
    var max = codes.reduce(function (m, c) { return Math.max(m, s.statusCounts[c] || 0); }, 0) || 1;
    var rows = codes.map(function (c) {
      var cnt = s.statusCounts[c] || 0;
      var w = max ? Math.max(3, (cnt / max) * 100) : 0;
      var tone = statusTone(c);
      return '<div class="chart-bar">'
        + '<span class="chart-bar__label">' + statusLabel(c) + '</span>'
        + '<div class="chart-bar__track"><div class="chart-bar__fill chart-bar__fill--' + tone + '" style="width:' + w + '%"></div></div>'
        + '<span class="chart-bar__value">' + cnt + ' 笔</span>'
      + '</div>';
    }).join('');
    return '<section class="chart-card">'
      + '<div class="chart-card__head">'
        + '<div><span class="eyebrow">STATUS DISTRIBUTION</span>'
          + '<h2 class="display-3" style="margin-top:4px">状态分布</h2></div>'
        + '<span class="admin-table-foot__info">共 ' + s.totalOrders + ' 笔</span>'
      + '</div>'
      + '<div class="chart-bars">' + rows + '</div>'
    + '</section>';
  }

  /* 品类销售额占比环形图 */
  function renderCategoryDonut(categorySales) {
    if (!categorySales || !categorySales.length) {
      return '<section class="chart-card"><div class="chart-card__head"><div><span class="eyebrow">CATEGORY</span>'
        + '<h2 class="display-3" style="margin-top:4px">品类占比</h2></div></div>'
        + '<p class="admin-note">暂无订单数据。</p></section>';
    }

    var DONUT_R = 54;
    var DONUT_C = 2 * Math.PI * DONUT_R;
    // 科技感冷色系：青/靛蓝/紫罗兰交替，冷暖间隔保证相邻可辨；琥珀色保留品牌锚点
    var colors = ['#22d3ee', '#818cf8', '#2dd4bf', '#a78bfa', '#f0a35e', '#60a5fa', '#c084fc', '#5eead4'];
    var GAP = categorySales.length > 1 ? 3 : 0;
    var acc = 0;
    var segs = categorySales.map(function (c, i) {
      var pct = c.percent || 0;
      var len = Math.max(0.5, (pct / 100) * DONUT_C - GAP);
      var seg = { name: c.category, pct: pct, len: len, start: acc + GAP / 2, color: colors[i % colors.length] };
      acc += (pct / 100) * DONUT_C;
      return seg;
    });
    var circles = segs.map(function (s2) {
      return '<circle cx="70" cy="70" r="' + DONUT_R + '" fill="none" '
        + 'stroke="' + s2.color + '" stroke-width="16" '
        + 'style="filter:drop-shadow(0 0 4px ' + s2.color + '55)" '
        + 'stroke-dasharray="' + s2.len + ' ' + (DONUT_C - s2.len) + '" '
        + 'stroke-dashoffset="-' + s2.start + '" />';
    }).join('');
    var totalAmount = categorySales.reduce(function (m, c) { return m + c.amount; }, 0);
    var svg = '<svg class="donut__svg" width="150" height="150" viewBox="0 0 140 140" role="img" aria-label="各品类销售额占比环形图">'
      + '<g transform="rotate(-90 70 70)">'
        + '<circle cx="70" cy="70" r="' + DONUT_R + '" fill="none" stroke="var(--c-surface-3)" stroke-width="16" />'
        + circles
      + '</g>'
      + '<text x="70" y="66" text-anchor="middle" fill="var(--c-text)" font-family="var(--font-mono)" font-size="16" font-weight="600">¥' + fmt3(totalAmount) + '</text>'
      + '<text x="70" y="84" text-anchor="middle" fill="var(--c-muted)" '
        + 'font-family="var(--font-mono)" font-size="10">销售额</text>'
    + '</svg>';
    var legend = segs.map(function (s2) {
      return '<div class="donut__row">'
        + '<span class="donut__swatch" style="background:' + s2.color + '"></span>'
        + '<span class="donut__row-name">' + s2.name + '</span>'
        + '<span class="donut__row-val">' + s2.pct.toFixed(1) + '%</span>'
      + '</div>';
    }).join('');
    return '<section class="chart-card">'
      + '<div class="chart-card__head">'
        + '<div><span class="eyebrow">CATEGORY SHARE</span>'
          + '<h2 class="display-3" style="margin-top:4px">品类占比</h2></div>'
      + '</div>'
      + '<div class="donut">' + svg + '<div class="donut__list">' + legend + '</div></div>'
    + '</section>';
  }

  /* 近 7 日趋势 */
  function renderTrend(salesList) {
    var days = salesList.slice(-7);
    var maxCnt = days.reduce(function (m, d) { return Math.max(m, d.orders); }, 0) || 1;
    var bars = days.map(function (d) {
      var w = maxCnt ? (d.orders / maxCnt) * 100 : 0;
      return '<div class="chart-bar">'
        + '<span class="chart-bar__label" style="font-size: var(--fs-xs)">' + d.date.slice(5) + '</span>'
        + '<div class="chart-bar__track" style="height:80px; align-items:flex-end">'
          + '<div class="chart-bar__fill chart-bar__fill--accent" style="height:' + Math.max(2, w) + '%; width:60%; margin:0 auto"></div>'
        + '</div>'
        + '<span class="chart-bar__value" style="font-size: var(--fs-xs)">' + d.orders + ' 笔 / ¥' + F.formatPrice(d.sales) + '</span>'
      + '</div>';
    }).join('');
    var trend = days.map(function (d) {
      return '<div style="display:flex; justify-content:space-between; padding: var(--sp-1) 0; border-bottom: 1px solid var(--c-border); font-size: var(--fs-xs)">'
        + '<span class="mono" style="color: var(--c-muted)">' + d.date + '</span>'
        + '<span>' + d.orders + ' 笔</span>'
        + '<span class="mono">¥' + F.formatPrice(d.sales) + '</span>'
      + '</div>';
    }).join('');
    return '<section class="chart-card">'
      + '<div class="chart-card__head">'
        + '<div><span class="eyebrow">LAST 7 DAYS</span>'
          + '<h2 class="display-3" style="margin-top:4px">近 7 日趋势</h2></div>'
      + '</div>'
      + '<div class="chart-bars" style="grid-template-columns: repeat(7, 1fr); gap: var(--sp-2)">' + bars + '</div>'
      + '<div style="margin-top: var(--sp-3)">' + trend + '</div>'
    + '</section>';
  }

  /* ------------------------------ 事件 ------------------------------ */
  function bind($root) {
    $root.off();
    $(document).off('click.voltaMsClick');
    C.CsvButton.bind($root, function () {
      var orders = Orders.list();
      if (!orders.length) return null;
      return {
        filename: 'VOLTA订单统计_' + Volta.AdminCsv.dateStamp() + '.csv',
        header: ['订单号', '客户', '手机号', '金额', '状态', '下单时间'],
        rows: orders.map(function (o) {
          var cust = o.customer || { name: '', phone: '' };
          return [o.orderNo, cust.name, cust.phone,
            o.totalAmount || o.total, statusLabel(o.status), o.createdAt || ''];
        })
      };
    });
  }

  /* ------------------------------ 启动 ------------------------------ */
  $(function () {
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;
    UI.initTheme();
    Volta.AdminLayout.init();

    var token = Volta.Admin.getToken();
    var H = { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token };
    function get(url) {
      return fetch(url, { headers: H }).then(function (r) { return r.json(); })
        .then(function (j) { if (j.code !== 0) throw new Error(j.message || '拉取失败'); return j.data; });
    }

    Promise.all([
      get('/shuma/api/admin/stats/orders'),
      get('/shuma/api/admin/stats/sales?days=7'),
      get('/shuma/api/admin/stats/products')
    ]).then(function (rs) {
      var s = rs[0];
      var $root = $('#page-root');
      $root.html(
        renderHead(s.totalOrders)
        + renderKPI(s)
        + renderStatusBar(s)
        + renderCategoryDonut(rs[2].categorySales)
        + renderTrend(rs[1].list)
      );
      bind($root);
      setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
    }).catch(function (e) {
      $('#page-root').html('<div class="admin-note">订单统计加载失败：' + (e.message || '请重新登录') + '</div>');
    });
  });
})(window);
