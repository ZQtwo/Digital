/**
 * dashboard.js —— 主面板（jQuery 版）
 * 顶部 KPI 卡（库存 + 订单）+ 分类分布（条形 / 环形）+ 库存 Top 10 + 预警清单 + 最近 5 条出入库流水。
 * 【v3】数据全部来自后端数据库：GET /shuma/api/admin/stats/overview
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var UI = Volta.UI;

  /* ============================== KPI 卡 ============================== */
  function fillKPI(stats, orderStats) {
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
    var cards = [
      { label: '在售型号', value: stats.skuCount, unit: '款', foot: '平均每款 ' + stats.avgStock + ' 件', tone: '' },
      { label: '总库存量', value: fmt(stats.totalStock), unit: '件', foot: '已扣减订单占用', tone: 'stat-card--accent' },
      { label: '预警数', value: stats.alertCount, unit: '款', foot: '偏低 ' + stats.lowCount + ' / 缺货 ' + stats.outCount, tone: 'stat-card--danger' },
      { label: '今日变动', value: stats.todayCount, unit: '次', foot: '当日出入库流水条数', tone: 'stat-card--success' },
      { label: '累计订单', value: fmt(orderStats.totalOrders), unit: '单', foot: '待付款 ' + orderStats.pendingPay + ' · 待发货 ' + orderStats.pendingShip, tone: '' },
      { label: '待收货', value: orderStats.shipped, unit: '单', foot: '等待买家确认收货', tone: 'stat-card--accent' },
      { label: '累计销售额', value: fmt(Math.round(orderStats.totalSales)), unit: '元', foot: '不含已取消订单', tone: 'stat-card--success' },
      { label: '客单价', value: fmt(Math.round(orderStats.avgOrderAmount)), unit: '元', foot: '单均实付金额', tone: '' }
    ];
    var html = cards.map(function (c) {
      return '<div class="stat-card ' + c.tone + '">'
        + '<span class="stat-card__label">' + c.label + '</span>'
        + '<span class="stat-card__value">' + c.value + '<span class="stat-card__unit">' + c.unit + '</span></span>'
        + '<span class="stat-card__foot">' + c.foot + '</span>'
        + '</div>';
    }).join('');
    $('[data-bind="kpi"]').html(html);
  }

  /* ============================== 条形图（按品类） ============================== */
  function fillBarChart(dist) {
    var max = dist.reduce(function (m, d) { return Math.max(m, d.stock); }, 0) || 1;
    var rows = dist.map(function (d) {
      var width = max ? Math.max(3, (d.stock / max) * 100) : 0;
      return '<div class="chart-bar">'
        + '<span class="chart-bar__label" title="' + d.name + '">' + d.name + '</span>'
        + '<div class="chart-bar__track"><div class="chart-bar__fill" style="width:' + width + '%"></div></div>'
        + '<span class="chart-bar__value">' + d.stock + ' 件</span>'
        + '</div>';
    }).join('');
    $('[data-bind="barChart"]').html(rows);
  }

  /* ============================== 环形图 ============================== */
  function fillDonut(dist, totalStock) {
    var DONUT_R = 54;
    var DONUT_C = 2 * Math.PI * DONUT_R;
    // 科技感冷色系：青/靛蓝/紫罗兰交替，冷暖间隔保证相邻可辨；琥珀色保留品牌锚点
    var colors = ['#22d3ee', '#818cf8', '#2dd4bf', '#a78bfa', '#f0a35e', '#60a5fa', '#c084fc', '#5eead4'];
    var total = totalStock || 1;
    var GAP = dist.length > 1 ? 3 : 0; // 扇区弧长间隙
    var acc = 0;
    var segs = dist.map(function (d, i) {
      var len = Math.max(0.5, (d.stock / total) * DONUT_C - GAP);
      var seg = {
        name: d.name, pct: (d.stock / total) * 100,
        len: len, start: acc + GAP / 2, color: colors[i % colors.length]
      };
      acc += (d.stock / total) * DONUT_C;
      return seg;
    });
    var circles = segs.map(function (s) {
      return '<circle cx="70" cy="70" r="' + DONUT_R + '" fill="none" '
        + 'stroke="' + s.color + '" stroke-width="16" '
        + 'style="filter:drop-shadow(0 0 4px ' + s.color + '55)" '
        + 'stroke-dasharray="' + s.len + ' ' + (DONUT_C - s.len) + '" '
        + 'stroke-dashoffset="-' + s.start + '" />';
    }).join('');
    var svg = '<svg class="donut__svg" width="150" height="150" viewBox="0 0 140 140" '
      + 'role="img" aria-label="各分类库存占比环形图">'
      + '<g transform="rotate(-90 70 70)">'
        + '<circle cx="70" cy="70" r="' + DONUT_R + '" fill="none" stroke="var(--c-surface-3)" stroke-width="16" />'
        + circles
      + '</g>'
      + '<text x="70" y="66" text-anchor="middle" fill="var(--c-text)" '
        + 'font-family="var(--font-mono)" font-size="19" font-weight="600">' + totalStock + '</text>'
      + '<text x="70" y="84" text-anchor="middle" fill="var(--c-muted)" '
        + 'font-family="var(--font-mono)" font-size="10">总库存</text>'
    + '</svg>';
    var legend = segs.map(function (s) {
      return '<div class="donut__row">'
        + '<span class="donut__swatch" style="background:' + s.color + '"></span>'
        + '<span class="donut__row-name">' + s.name + '</span>'
        + '<span class="donut__row-val">' + s.pct.toFixed(1) + '%</span>'
      + '</div>';
    }).join('');
    $('[data-bind="donut"]').html(svg + '<div class="donut__list">' + legend + '</div>');
  }

  /* ============================== Top 10 ============================== */
  function fillTop10(list) {
    var rows = list.map(function (r, i) {
      var art = Volta.ProductArt.render(r.art, r.artSeed, r.name + ' 示意图');
      return '<div class="admin-top-list__row">'
        + '<span class="admin-top-list__rank">' + String(i + 1).padStart(2, '0') + '</span>'
        + '<div style="display:flex;align-items:center;gap:var(--sp-2);min-width:0">'
          + '<span style="width:36px;aspect-ratio:4/3;flex:none;border:1px solid var(--c-border);border-radius:var(--r-xs);overflow:hidden;background:var(--c-surface-2)">' + art + '</span>'
          + '<span class="admin-top-list__name">' + r.name + '</span>'
        + '</div>'
        + '<span class="admin-top-list__val">' + r.stock + ' 件</span>'
      + '</div>';
    }).join('');
    $('[data-bind="top10"]').html(rows);
  }

  /* ============================== 预警清单 ============================== */
  function fillAlerts(alerts) {
    var $tag = $('[data-bind="alert.tag"]');
    var $items = $('[data-bind="alert.items"]');
    var $note = $('[data-bind="alert.note"]');
    var $more = $('[data-bind="alert.more"]');

    $note.attr('hidden', '');
    $more.attr('hidden', '');
    $items.empty();

    if (!alerts.length) {
      $tag.removeClass('tag--danger').addClass('tag--success').text('全部充足');
      $note.removeAttr('hidden');
      return;
    }

    $tag.removeClass('tag--success').addClass('tag--danger').text(alerts.length + ' 款待补货');

    var items = alerts.slice(0, 6).map(function (r) {
      return '<div class="alert-item">'
        + '<div>'
          + '<div class="alert-item__name">' + r.name + '</div>'
          + '<div class="alert-item__meta">剩余 ' + r.stock + ' 件 · 预警线 ' + r.threshold + ' 件</div>'
        + '</div>'
        + '<span class="tag ' + (r.status === 'out' ? 'tag--danger' : 'tag--accent') + '">'
          + (r.status === 'out' ? '缺货' : '偏低') + '</span>'
        + '<a href="/shuma/admin/inventory?q=' + encodeURIComponent(r.name) + '" class="btn btn--ghost btn--sm">补货</a>'
      + '</div>';
    }).join('');
    $items.html(items);

    if (alerts.length > 6) {
      $more.text('查看全部 ' + alerts.length + ' 款').removeAttr('hidden');
    }
  }

  /* ============================== 最近流水 ============================== */
  function fillRecent(logs) {
    var $container = $('[data-bind="recent"]');
    var $note = $('[data-bind="recent.note"]');

    $note.attr('hidden', '');
    $container.empty();

    if (!logs.length) {
      $note.removeAttr('hidden').text('还没有库存变动记录。去「库存管理」调整一次试试。');
      return;
    }

    var items = logs.map(function (log) {
      var tone = log.tone || 'neutral';
      var tagCls = tone === 'in' ? 'tag--success' : (tone === 'out' ? 'tag--danger' : '');
      var sign = log.delta > 0 ? '+' : '';
      return '<div class="alert-item">'
        + '<div>'
          + '<div class="alert-item__name">' + (log.name || '未知商品') + '</div>'
          + '<div class="alert-item__meta">' + (log.reason || log.label || '') + '</div>'
        + '</div>'
        + '<span class="tag ' + tagCls + '">' + (log.label || log.type) + '</span>'
        + '<span class="mono alert-item__meta">' + sign + log.delta + ' → ' + log.after + '</span>'
      + '</div>';
    }).join('');
    $container.html(items);
  }

  /* ============================== 启动 ============================== */
  $(function () {
    // 守卫：未登录跳登录页
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;

    UI.initTheme();
    Volta.AdminLayout.init();

    // 从数据库拉总览数据
    var token = Volta.Admin.getToken();
    fetch('/shuma/api/admin/stats/overview', {
      headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token }
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (json.code !== 0 || !json.data) throw new Error(json.message || '拉取失败');
      var d = json.data;

      $('[data-bind="overview.lede"]').text(
        '在售 ' + d.stats.skuCount + ' 个 SKU，库存合计 ' + d.stats.totalStock + ' 件。'
        + '本页数据实时来自数据库，任何调整都会同步到前台商城。'
      );
      fillKPI(d.stats, d.orderStats);
      fillBarChart(d.dist);
      fillDonut(d.dist, d.stats.totalStock);
      fillTop10(d.top10);
      fillAlerts(d.alerts);
      fillRecent(d.logs);
    }).catch(function (e) {
      $('[data-bind="kpi"]').html('<div class="stat-card"><span class="stat-card__label">加载失败</span>'
        + '<span class="stat-card__foot">' + (e.message || '请重新登录后台') + '</span></div>');
    });

    // 入场动画
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  });
})(window);
