/**
 * orders.js —— 订单管理页（jQuery 版）
 * 参考 Vue 版 AdminOrdersView.vue + 本次规格：
 *   状态 tab 带计数 / 搜索 / 分页 / 详情弹层 / 状态机推进 / 取消订单（库存回补） / CSV 导出。
 *
 * 状态机：
 *   pending_pay → pending_ship → shipped → completed
 *   可在 pending_pay / pending_ship / shipped 状态取消 → cancelled
 *
 * 取消订单：Volta.Orders.setStatus(id, "cancelled") 会自动调用 Volta.Inventory.restoreForOrder 回补库存。
 */
(function (global) {
  "use strict";
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var Orders = Volta.Orders;
  var Inventory = Volta.Inventory;
  var C = Volta.AdminComponents;
  var STATUS_MAP = Orders.ORDER_STATUSES;

  var TAB_LABELS = {
    pending_pay: "待付款",
    pending_ship: "待发货",
    shipped: "待收货",
    completed: "已完成",
    cancelled: "已取消"
  };
  var STATUS_TABS = [{ code: "all", label: "全部" }]
    .concat(Object.keys(STATUS_MAP).map(function (code) {
      return { code: code, label: TAB_LABELS[code] || STATUS_MAP[code].label };
    }));

  var NEXT_STATUS = {
    pending_ship: "shipped",
    shipped: "completed"
  };
  var NEXT_LABEL = {
    pending_ship: "模拟发货",
    shipped: "模拟完成"
  };

  var state = {
    q: "",
    statusFilter: "all",
    page: 1,
    pageSize: 20,
    detailId: null
  };

  function itemQtySum(order) {
    return (order.items || []).reduce(function (s, it) { return s + (Number(it.qty) || 0); }, 0);
  }
  function itemSummary(order) {
    var names = (order.items || []).map(function (it) { return it.name; });
    if (names.length === 0) return "-";
    if (names.length <= 2) return names.join("、");
    return names.slice(0, 2).join("、") + " 等 " + names.length + " 件";
  }
  function statusLabel(code) { return TAB_LABELS[code] || (STATUS_MAP[code] ? STATUS_MAP[code].label : code); }
  function statusTone(code) { return C.StatusBadge.meta(code).tone; }
  function statusBadgeHtml(code) {
    var tone = statusTone(code);
    var label = statusLabel(code);
    return "<span class=\"badge badge--" + tone + " badge--sm\">" + label + "</span>";
  }

  function filtered() {
    var kw = state.q.trim().toLowerCase();
    return Orders.list().filter(function (o) {
      if (kw) {
        var hay = (o.orderNo + " " + (o.customer ? o.customer.name : "") + " " + (o.customer ? o.customer.phone : "")).toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      if (state.statusFilter !== "all" && o.status !== state.statusFilter) return false;
      return true;
    });
  }
  function paged() {
    var list = filtered();
    var start = (state.page - 1) * state.pageSize;
    return list.slice(start, start + state.pageSize);
  }
  function pageCount() { return Math.max(1, Math.ceil(filtered().length / state.pageSize)); }

  function statsWithCounts() {
    var s = Orders.stats();
    s.byLabelCounts = STATUS_TABS.map(function (t) {
      return t.code === "all" ? s.total : (s.byStatus[t.code] || 0);
    });
    return s;
  }

  function render() {
    var $root = $("#page-root");
    $root.html(renderHead() + renderStats() + renderTabs() + renderToolbar() + renderTable() + renderCards() + renderFoot());
  }

  function renderHead() {
    var s = Orders.stats();
    return "<header class=\"admin-head\">"
      + "<div class=\"admin-head__text\">"
        + "<span class=\"eyebrow\">ORDERS</span>"
        + "<h1 class=\"display-3\">订单管理</h1>"
        + "<p class=\"lede\" style=\"font-size: var(--fs-sm)\">共 " + s.total + " 笔订单。取消订单会自动回补库存并记录到出入库流水。</p>"
      + "</div>"
      + "<div>" + C.CsvButton.render({ id: "orders", label: "导出 CSV" }) + "</div>"
    + "</header>";
  }

  function renderStats() {
    var s = Orders.stats();
    return "<div class=\"stat-grid\">"
      + "<div class=\"stat-card\"><span class=\"stat-card__label\">订单总数</span>"
        + "<span class=\"stat-card__value\">" + s.total + "<span class=\"stat-card__unit\">笔</span></span></div>"
      + "<div class=\"stat-card stat-card--accent\"><span class=\"stat-card__label\">待处理</span>"
        + "<span class=\"stat-card__value\">" + s.pendingCount + "<span class=\"stat-card__unit\">笔</span></span></div>"
      + "<div class=\"stat-card\"><span class=\"stat-card__label\">已发货</span>"
        + "<span class=\"stat-card__value\">" + s.shippedCount + "<span class=\"stat-card__unit\">笔</span></span></div>"
      + "<div class=\"stat-card stat-card--success\"><span class=\"stat-card__label\">有效订单总额</span>"
        + "<span class=\"stat-card__value\">¥" + F.formatPrice(s.totalAmount) + "</span></div>"
    + "</div>";
  }

  function renderTabs() {
    var s = statsWithCounts();
    var html = STATUS_TABS.map(function (t, i) {
      var count = s.byLabelCounts[i];
      var isActive = state.statusFilter === t.code;
      return "<button type=\"button\" class=\"order-tabs__btn" + (isActive ? " is-active" : "") + "\" data-action=\"switch-tab\" data-code=\"" + t.code + "\">"
        + "<span>" + t.label + "</span>"
        + "<span class=\"order-tabs__count\">" + count + "</span>"
      + "</button>";
    }).join("");
    return "<div class=\"order-tabs\">" + html + "</div>";
  }

  function renderToolbar() {
    return "<div class=\"admin-toolbar\">"
      + "<div class=\"admin-search\">"
        + "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/></svg>"
        + "<input class=\"input\" type=\"search\" placeholder=\"搜索订单号 / 客户 / 手机号\" value=\"" + escapeAttr(state.q) + "\" data-order-search>"
      + "</div>"
    + "</div>";
  }

  function renderTable() {
    var rows = paged();
    if (!rows.length) {
      return C.EmptyState.render({ icon: "order", title: "没有匹配的订单", desc: "试试切换状态 tab 或放宽搜索条件" });
    }
    var body = rows.map(function (o) { return renderRow(o); }).join("");
    return "<div class=\"admin-table-wrap\">"
      + "<table class=\"admin-table\">"
        + "<thead><tr>"
          + "<th>订单号</th>"
          + "<th>客户</th>"
          + "<th>商品</th>"
          + "<th style=\"text-align:right\">金额</th>"
          + "<th>状态</th>"
          + "<th>下单时间</th>"
          + "<th>操作</th>"
        + "</tr></thead>"
        + "<tbody>" + body + "</tbody>"
      + "</table></div>";
  }

  function renderRow(o) {
    var canCancel = o.status === "pending_pay" || o.status === "pending_ship" || o.status === "shipped";
    var next = NEXT_STATUS[o.status];
    var nextLabel = NEXT_LABEL[o.status];
    var customerName = o.customer ? o.customer.name : "匿名";
    var customerPhone = o.customer ? o.customer.phone : "";
    var oid = o.orderNo || o.id;  // ← 关键：用 orderNo（SOxxx），不是数字 id
    return "<tr data-oid=\"" + oid + "\">"
      + "<td><span class=\"mono\">" + escapeAttr(o.orderNo) + "</span>"
        + "<div class=\"admin-table__sku\">" + o.id + "</div></td>"
      + "<td><div style=\"font-weight:500\">" + escapeAttr(customerName) + "</div>"
        + (customerPhone ? "<div class=\"admin-table__sku\">" + escapeAttr(customerPhone) + "</div>" : "") + "</td>"
      + "<td><div class=\"truncate\" title=\"" + escapeAttr(itemSummary(o)) + "\">" + escapeAttr(itemSummary(o)) + "</div>"
        + "<div class=\"admin-table__sku\">共 " + itemQtySum(o) + " 件</div></td>"
      + "<td class=\"num\" style=\"text-align:right\">¥" + F.formatPrice(o.totalAmount || 0) + "</td>"
      + "<td>" + statusBadgeHtml(o.status) + "</td>"
      + "<td><span class=\"mono\" style=\"font-size: var(--fs-xs)\">" + (o.createdAt ? F.formatDateTime(o.createdAt) : "\u2014") + "</span></td>"
      + "<td><div style=\"display:flex; gap:var(--sp-2); flex-wrap:wrap\">"
        + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"detail\" data-oid=\"" + oid + "\">详情</button>"
        + (next ? "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"advance\" data-oid=\"" + oid + "\" title=\"" + nextLabel + "\">推进</button>" : "")
        + (canCancel ? "<button type=\"button\" class=\"btn btn--ghost btn--sm\" style=\"color: var(--c-danger)\" data-action=\"cancel\" data-oid=\"" + oid + "\">取消</button>" : "")
      + "</div></td>"
    + "</tr>";
  }

  function renderCards() {
    var rows = paged();
    if (!rows.length) return "";
    var items = rows.map(function (o) {
      var next = NEXT_STATUS[o.status];
      var canCancel = o.status === "pending_pay" || o.status === "pending_ship" || o.status === "shipped";
      var customerName = o.customer ? o.customer.name : "匿名";
      var oid = o.orderNo || o.id;
      return "<article class=\"admin-card\" data-oid=\"" + oid + "\">"
        + "<div class=\"admin-card__head\"><div><div class=\"admin-card__name\">" + escapeAttr(customerName) + "</div>"
        + "<div class=\"admin-card__id\"><span class=\"mono\">" + escapeAttr(o.orderNo) + "</span></div></div>"
        + statusBadgeHtml(o.status) + "</div>"
        + "<dl class=\"admin-card__meta\">"
          + "<dt>商品</dt><dd>" + escapeAttr(itemSummary(o)) + "</dd>"
          + "<dt>金额</dt><dd>¥" + F.formatPrice(o.totalAmount || 0) + "</dd>"
          + "<dt>下单</dt><dd>" + (o.createdAt ? F.formatDate(o.createdAt) : "\u2014") + "</dd>"
        + "</dl>"
        + "<div class=\"admin-card__actions\">"
          + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"detail\" data-oid=\"" + oid + "\">详情</button>"
          + (next ? "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"advance\" data-oid=\"" + oid + "\">推进</button>" : "")
          + (canCancel ? "<button type=\"button\" class=\"btn btn--ghost btn--sm\" style=\"color: var(--c-danger)\" data-action=\"cancel\" data-oid=\"" + oid + "\">取消</button>" : "")
        + "</div>"
      + "</article>";
    }).join("");
    return "<div class=\"admin-cards\">" + items + "</div>";
  }

  function renderFoot() {
    var list = filtered();
    if (!list.length) return "";
    return "<div class=\"admin-table-foot\">"
      + "<span class=\"admin-table-foot__info\">共 " + list.length + " 条 · 第 " + state.page + " / " + pageCount() + " 页</span>"
      + C.Pagination.render({ page: state.page, pageCount: pageCount(), total: list.length, pageSize: state.pageSize })
    + "</div>";
  }

  function renderDetail() {
    if (!state.detailId) return "";
    var o = Orders.get(state.detailId);
    if (!o) { state.detailId = null; return ""; }
    var itemsHtml = (o.items || []).map(function (it) {
      return "<tr>"
        + "<td><div style=\"font-weight:500\">" + escapeAttr(it.name) + "</div>"
          + "<div class=\"admin-table__sku\">" + (it.id || "") + "</div></td>"
        + "<td class=\"num\">" + (it.qty || 1) + "</td>"
        + "<td class=\"num\" style=\"text-align:right\">¥" + F.formatPrice(it.price || 0) + "</td>"
        + "<td class=\"num\" style=\"text-align:right\">¥" + F.formatPrice((it.price || 0) * (it.qty || 1)) + "</td>"
      + "</tr>";
    }).join("");
    return "<div class=\"admin-drawer\" data-detail-overlay>"
      + "<div class=\"admin-drawer__panel\">"
        + "<div class=\"admin-drawer__head\">"
          + "<div><span class=\"eyebrow\">ORDER DETAIL</span>"
            + "<h2 class=\"display-3\" style=\"margin-top:4px\">订单详情 · " + escapeAttr(o.orderNo) + "</h2></div>"
          + "<button type=\"button\" class=\"icon-btn\" aria-label=\"关闭\" data-action=\"close-detail\">"
            + "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6 6 18\"/></svg>"
          + "</button>"
        + "</div>"
        + "<div class=\"admin-editor\">"
          + "<div class=\"field\"><label class=\"field__label\">订单信息</label>"
            + "<div style=\"display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size: var(--fs-sm)\">"
              + "<div><span class=\"admin-table__sku\">订单号</span><br><span class=\"mono\">" + escapeAttr(o.orderNo) + "</span></div>"
              + "<div><span class=\"admin-table__sku\">状态</span><br>" + statusBadgeHtml(o.status) + "</div>"
              + "<div><span class=\"admin-table__sku\">客户</span><br>" + escapeAttr(o.customer ? o.customer.name : "匿名") + (o.customer && o.customer.phone ? " · " + escapeAttr(o.customer.phone) : "") + "</div>"
              + "<div><span class=\"admin-table__sku\">下单时间</span><br>" + (o.createdAt ? F.formatDateTime(o.createdAt) : "\u2014") + "</div>"
              + "<div><span class=\"admin-table__sku\">配送地址</span><br>" + escapeAttr((o.shipping || {}).address || "\u2014") + "</div>"
              + "<div><span class=\"admin-table__sku\">订单金额</span><br><strong>¥" + F.formatPrice(o.totalAmount || 0) + "</strong></div>"
            + "</div>"
          + "</div>"
          + "<div class=\"field\"><label class=\"field__label\">商品明细</label>"
            + "<table class=\"admin-table\" style=\"font-size: var(--fs-sm)\"><thead><tr>"
              + "<th>商品</th><th style=\"text-align:right\">数量</th><th style=\"text-align:right\">单价</th><th style=\"text-align:right\">小计</th>"
            + "</tr></thead><tbody>" + itemsHtml + "</tbody></table>"
          + "</div>"
        + "</div>"
      + "</div>"
    + "</div>";
  }

  function appendOverlays() {
    removeOverlays();
    $("body").append(renderDetail());
  }
  function removeOverlays() { $("[data-detail-overlay]").remove(); }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function bind($root) {
    $root.on("input", "[data-order-search]", function () { state.q = $(this).val(); });
    $root.on("keydown", "[data-order-search]", function (e) { if (e.key === "Enter") { e.preventDefault(); state.page = 1; render(); } });
    C.Pagination.bind($root, function (p) { state.page = p; render(); });
    C.CsvButton.bind($root, function () {
      var list = filtered(); if (!list.length) return null;
      return {
        filename: "VOLTA订单_" + Volta.AdminCsv.dateStamp() + ".csv",
        header: ["订单号", "客户", "手机号", "商品汇总", "金额", "状态", "下单时间"],
        rows: list.map(function (o) {
          return [o.orderNo, o.customer ? o.customer.name : "", o.customer ? o.customer.phone : "",
            itemSummary(o), o.totalAmount || 0, statusLabel(o.status), Volta.AdminCsv.formatStamp(o.createdAt)];
        })
      };
    });
    $root.on("click", "[data-action=\"switch-tab\"]", function (e) { e.preventDefault(); state.statusFilter = $(this).data("code"); state.page = 1; render(); });
    $root.on("click", "[data-action=\"detail\"]", function (e) { e.preventDefault(); state.detailId = $(this).data("oid"); appendOverlays(); });
    $root.on("click", "[data-action=\"advance\"]", function (e) { e.preventDefault(); advanceOrder($(this).data("oid")); });
    $root.on("click", "[data-action=\"cancel\"]", function (e) {
      e.preventDefault();
      var oid = $(this).data("oid");
      Orders.setStatus(oid, "cancelled").then(function (ok) {
        if (ok.ok) { UI.toast("订单已取消，库存已回补", "success"); refreshAndRender(); }
        else { UI.toast(ok.message || "取消失败", "error"); }
      });
    });
  }

  function bindOverlays() {
    var $doc = $(document);
    $doc.off(".orderPage");
    $doc.on("click.orderPage", "[data-action=\"close-detail\"]", function (e) { e.preventDefault(); state.detailId = null; removeOverlays(); });
    $doc.on("click.orderPage", "[data-detail-overlay]", function (e) { if (e.target === this) { state.detailId = null; removeOverlays(); } });
  }

  function advanceOrder(oid) {
    var o = Orders.get(oid);
    if (!o) return;
    var next = NEXT_STATUS[o.status];
    if (!next) { UI.toast("当前状态不可推进", "error"); return; }
    Orders.setStatus(oid, next).then(function (ok) {
      if (ok.ok) { UI.toast(NEXT_LABEL[o.status] || "已推进", "success"); refreshAndRender(); }
      else { UI.toast(ok.message || "操作失败", "error"); }
    });
  }

  /** 从后端拉最新数据 → 重渲染 */
  function refreshAndRender() {
    if (typeof Orders.fetchAll === 'function') {
      Orders.fetchAll().then(function () { render(); }).catch(function () { render(); });
    } else {
      render();
    }
  }

  $(function () {
    if (!Volta.AdminAuth.requireAdmin("/shuma/admin/login")) return;
    UI.initTheme();
    Volta.AdminLayout.init();
    // 初始化拉后端订单数据
    var lastSig = "";
    function dataSig() {
      return Orders.list().map(function (o) { return (o.orderNo || o.id) + ":" + o.status; }).join("|");
    }
    if (typeof Orders.fetchAll === 'function') {
      Orders.fetchAll().then(function () { lastSig = dataSig(); render(); }).catch(function () { render(); });

      /* 轮询：每 5 秒拉一次后端订单，有新订单/状态变化才重渲染（无需手动刷新页面） */
      setInterval(function () {
        if (document.hidden) return;
        // 正在搜索输入时不打扰
        var ae = document.activeElement;
        if (ae && ae.hasAttribute && ae.hasAttribute("data-order-search")) return;
        // 详情弹层打开时不打扰
        if ($("[data-detail-overlay]").length) return;
        Orders.fetchAll(true).then(function () {
          var sig = dataSig();
          if (sig !== lastSig) {
            lastSig = sig;
            render();
            setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
          }
        }).catch(function () { /* 静默 */ });
      }, 5000);
    } else {
      render();
    }
    bind($("#page-root"));
    bindOverlays();
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  });
})(window);