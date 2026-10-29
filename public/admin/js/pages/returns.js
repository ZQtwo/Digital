/**
 * returns.js —— 退换货管理页（jQuery 版）
 * mock 退换货申请列表（订单号 / 会员 / 类型 / 原因 / 状态），状态流转操作 + 筛选。
 * 状态机：pending_review → approved → returning → completed
 *           ↓ rejected
 * 持久化到 volta.returns LS 键。首次访问时生成 mock 数据。
 */
(function (global) {
  "use strict";
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var Storage = Volta.Storage;
  var C = Volta.AdminComponents;
  var Orders = Volta.Orders;
  var RETURN_KEY = "volta.returns";

  var TYPES = { refund: "退货退款", exchange: "换货" };
  var STATUS = {
    pending_review: { label: "待审核", tone: "accent", next: "approved", nextLabel: "审核通过" },
    approved: { label: "已通过", tone: "info", next: "returning", nextLabel: "开始退货" },
    returning: { label: "退货中", tone: "info", next: "completed", nextLabel: "确认收货" },
    completed: { label: "已完成", tone: "success", next: null, nextLabel: "" },
    rejected: { label: "已拒绝", tone: "muted", next: null, nextLabel: "" }
  };
  var TAB_LABELS = { all: "全部", pending_review: "待审核", approved: "已通过", returning: "退货中", completed: "已完成", rejected: "已拒绝" };

  function seedMock() {
    var orders = Orders.list();
    if (!orders.length) return [];
    var rnd = F.seededRandom(20260920);
    var reasonsPool = ["商品有质量问题", "尺寸不合适", "不想要了", "发错货", "收到商品破损", "与描述不符"];
    var types = ["refund", "exchange"];
    var statuses = ["pending_review", "pending_review", "approved", "returning", "completed", "rejected"];
    var list = [];
    var n = Math.min(10, orders.length);
    for (var i = 0; i < n; i++) {
      var o = orders[Math.floor(rnd() * orders.length)];
      var st = statuses[Math.floor(rnd() * statuses.length)];
      var ts = (o.ts || o.createdAt || Date.now()) - Math.floor(rnd() * 5) * 86400000;
      list.push({
        id: "r" + String(1001 + i),
        orderNo: o.orderNo,
        orderId: o.id,
        customer: (o.customer || {}).name || "匿名",
        phone: (o.customer || {}).phone || "",
        type: types[Math.floor(rnd() * types.length)],
        reason: reasonsPool[Math.floor(rnd() * reasonsPool.length)],
        status: st,
        amount: Number(o.totalAmount || o.total || 0),
        createdAt: ts,
        updatedAt: ts,
        timeline: [{ status: st, at: ts, note: "提交申请" }]
      });
    }
    return list;
  }

  function loadAll() {
    var arr = Storage.readLS(RETURN_KEY, null);
    if (arr == null) {
      arr = seedMock();
      Storage.writeLS(RETURN_KEY, arr);
    }
    return arr;
  }
  function saveAll(arr) { Storage.writeLS(RETURN_KEY, arr); }

  function statusLabel(code) { return STATUS[code] ? STATUS[code].label : code; }
  function statusTone(code) { return STATUS[code] ? STATUS[code].tone : "muted"; }
  function statusBadge(code) {
    return "<span class=\"badge badge--" + statusTone(code) + " badge--sm\">" + statusLabel(code) + "</span>";
  }

  var state = {
    q: "",
    typeFilter: "all",
    statusFilter: "all",
    page: 1,
    pageSize: 15,
    detailId: null,
    rejectId: null
  };

  function filtered() {
    var kw = state.q.trim().toLowerCase();
    return loadAll().filter(function (r) {
      if (state.typeFilter !== "all" && r.type !== state.typeFilter) return false;
      if (state.statusFilter !== "all" && r.status !== state.statusFilter) return false;
      if (kw && (r.id + " " + r.orderNo + " " + r.customer).toLowerCase().indexOf(kw) === -1) return false;
      return true;
    }).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
  }
  function paged() {
    var list = filtered();
    var start = (state.page - 1) * state.pageSize;
    return list.slice(start, start + state.pageSize);
  }
  function pageCount() { return Math.max(1, Math.ceil(filtered().length / state.pageSize)); }

  function statusCounts() {
    var arr = loadAll();
    var m = { all: arr.length };
    Object.keys(STATUS).forEach(function (k) { m[k] = 0; });
    arr.forEach(function (r) { m[r.status] = (m[r.status] || 0) + 1; });
    return m;
  }

  function render() {
    var $root = $("#page-root");
    $root.html(renderHead() + renderStats() + renderTabs() + renderToolbar() + renderTable() + renderCards() + renderFoot());
  }

  function renderHead() {
    var total = loadAll().length;
    return "<header class=\"admin-head\">"
      + "<div class=\"admin-head__text\">"
        + "<span class=\"eyebrow\">AFTER-SALE</span>"
        + "<h1 class=\"display-3\">退换货管理</h1>"
        + "<p class=\"lede\" style=\"font-size: var(--fs-sm)\">共 " + total + " 条退换货申请。可审核 / 推进 / 拒绝，并自动维护处理时间线。</p>"
      + "</div>"
      + "<div>" + C.CsvButton.render({ id: "returns", label: "导出 CSV" }) + "</div>"
    + "</header>";
  }

  function renderStats() {
    var arr = loadAll();
    var refund = arr.filter(function (r) { return r.type === "refund"; }).length;
    var exchange = arr.length - refund;
    var pending = arr.filter(function (r) { return r.status === "pending_review"; }).length;
    var completed = arr.filter(function (r) { return r.status === "completed"; }).length;
    var totalAmount = arr.filter(function (r) { return r.status === "completed" && r.type === "refund"; })
      .reduce(function (s, r) { return s + (r.amount || 0); }, 0);
    return "<div class=\"stat-grid\">"
      + "<div class=\"stat-card\"><span class=\"stat-card__label\">申请总数</span>"
        + "<span class=\"stat-card__value\">" + arr.length + "<span class=\"stat-card__unit\">条</span></span></div>"
      + "<div class=\"stat-card stat-card--accent\"><span class=\"stat-card__label\">待审核</span>"
        + "<span class=\"stat-card__value\">" + pending + "<span class=\"stat-card__unit\">条</span></span></div>"
      + "<div class=\"stat-card stat-card--success\"><span class=\"stat-card__label\">已完成</span>"
        + "<span class=\"stat-card__value\">" + completed + "<span class=\"stat-card__unit\">条</span></span></div>"
      + "<div class=\"stat-card stat-card--danger\"><span class=\"stat-card__label\">退款总额</span>"
        + "<span class=\"stat-card__value\">¥" + F.formatPrice(totalAmount) + "</span></div>"
    + "</div>";
  }

  function renderTabs() {
    var counts = statusCounts();
    var codes = ["all"].concat(Object.keys(STATUS));
    var html = codes.map(function (code) {
      var on = state.statusFilter === code;
      return "<button type=\"button\" class=\"order-tabs__btn" + (on ? " is-active" : "") + "\" data-action=\"switch-status\" data-code=\"" + code + "\">"
        + "<span>" + TAB_LABELS[code] + "</span>"
        + "<span class=\"order-tabs__count\">" + counts[code] + "</span>"
      + "</button>";
    }).join("");
    return "<div class=\"order-tabs\">" + html + "</div>";
  }

  function renderToolbar() {
    return "<div class=\"admin-toolbar\">"
      + "<div class=\"admin-search\">"
        + "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/></svg>"
        + "<input class=\"input\" type=\"search\" placeholder=\"搜索申请号 / 订单号 / 客户\" value=\"" + esc(state.q) + "\" data-return-search>"
      + "</div>"
      + "<select class=\"input\" data-action=\"switch-type\" style=\"width:auto\">"
        + "<option value=\"all\"" + (state.typeFilter === "all" ? " selected" : "") + ">全部类型</option>"
        + "<option value=\"refund\"" + (state.typeFilter === "refund" ? " selected" : "") + ">退货退款</option>"
        + "<option value=\"exchange\"" + (state.typeFilter === "exchange" ? " selected" : "") + ">换货</option>"
      + "</select>"
    + "</div>";
  }

  function renderTable() {
    var rows = paged();
    if (!rows.length) {
      return C.EmptyState.render({ icon: "refresh", title: "没有匹配的退换货申请", desc: "试试切换状态或调整搜索词" });
    }
    var body = rows.map(function (r) { return renderRow(r); }).join("");
    return "<div class=\"admin-table-wrap\">"
      + "<table class=\"admin-table\">"
        + "<thead><tr>"
          + "<th>申请号</th>"
          + "<th>订单号</th>"
          + "<th>客户</th>"
          + "<th>类型</th>"
          + "<th>原因</th>"
          + "<th>金额</th>"
          + "<th>状态</th>"
          + "<th>申请时间</th>"
          + "<th>操作</th>"
        + "</tr></thead>"
        + "<tbody>" + body + "</tbody>"
      + "</table></div>";
  }

  function renderRow(r) {
    var typeLabel = TYPES[r.type] || r.type;
    var next = STATUS[r.status];
    var actions = "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"detail\" data-rid=\"" + r.id + "\">详情</button>";
    if (next && next.next && next.nextLabel) {
      actions += "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"advance\" data-rid=\"" + r.id + "\">" + next.nextLabel + "</button>";
    }
    if (r.status === "pending_review") {
      actions += "<button type=\"button\" class=\"btn btn--ghost btn--sm\" style=\"color: var(--c-danger)\" data-action=\"reject\" data-rid=\"" + r.id + "\">拒绝</button>";
    }
    return "<tr data-rid=\"" + r.id + "\">"
      + "<td><span class=\"mono\" style=\"font-size: var(--fs-xs)\">" + r.id + "</span></td>"
      + "<td><span class=\"mono\" style=\"font-size: var(--fs-xs)\">" + esc(r.orderNo) + "</span></td>"
      + "<td><div style=\"font-weight:500\">" + esc(r.customer) + "</div>"
        + (r.phone ? "<div class=\"admin-table__sku\">" + esc(r.phone) + "</div>" : "") + "</td>"
      + "<td>" + (r.type === "refund" ? "<span class=\"badge badge--info badge--sm\">退货退款</span>" : "<span class=\"badge badge--accent badge--sm\">换货</span>") + "</td>"
      + "<td style=\"max-width:200px\"><div class=\"truncate\" title=\"" + esc(r.reason) + "\">" + esc(r.reason) + "</div></td>"
      + "<td class=\"num\" style=\"text-align:right\">¥" + F.formatPrice(r.amount || 0) + "</td>"
      + "<td>" + statusBadge(r.status) + "</td>"
      + "<td><span class=\"mono\" style=\"font-size: var(--fs-xs)\">" + F.formatDateTime(r.createdAt) + "</span></td>"
      + "<td><div style=\"display:flex; gap:var(--sp-2); flex-wrap:wrap\">" + actions + "</div></td>"
    + "</tr>";
  }

  function renderCards() {
    var rows = paged();
    if (!rows.length) return "";
    var items = rows.map(function (r) {
      var next = STATUS[r.status];
      var actions = "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"detail\" data-rid=\"" + r.id + "\">详情</button>";
      if (next && next.next && next.nextLabel) {
        actions += "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"advance\" data-rid=\"" + r.id + "\">" + next.nextLabel + "</button>";
      }
      if (r.status === "pending_review") {
        actions += "<button type=\"button\" class=\"btn btn--ghost btn--sm\" style=\"color: var(--c-danger)\" data-action=\"reject\" data-rid=\"" + r.id + "\">拒绝</button>";
      }
      return "<article class=\"admin-card\" data-rid=\"" + r.id + "\">"
        + "<div class=\"admin-card__head\"><div><div class=\"admin-card__name\">" + esc(r.customer) + "</div>"
        + "<div class=\"admin-card__id\">" + r.id + " · " + esc(r.orderNo) + "</div></div>"
        + statusBadge(r.status) + "</div>"
        + "<dl class=\"admin-card__meta\">"
          + "<dt>类型</dt><dd>" + (r.type === "refund" ? "退货退款" : "换货") + "</dd>"
          + "<dt>金额</dt><dd>¥" + F.formatPrice(r.amount || 0) + "</dd>"
          + "<dt>原因</dt><dd>" + esc(r.reason) + "</dd>"
        + "</dl>"
        + "<div class=\"admin-card__actions\">" + actions + "</div>"
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
    var r = loadAll().find(function (x) { return x.id === state.detailId; });
    if (!r) { state.detailId = null; return ""; }
    var timelineHtml = (r.timeline || []).map(function (t) {
      return "<li class=\"timeline__item\">"
        + "<span class=\"timeline__dot\"></span>"
        + "<div class=\"timeline__content\">"
          + "<div class=\"timeline__title\">" + esc(t.note || statusLabel(t.status)) + "</div>"
          + "<div class=\"timeline__time\">" + F.formatDateTime(t.at) + "</div>"
        + "</div>"
      + "</li>";
    }).join("");
    return "<div class=\"admin-drawer\" data-detail-overlay>"
      + "<div class=\"admin-drawer__panel\">"
        + "<div class=\"admin-drawer__head\">"
          + "<div><span class=\"eyebrow\">RETURN DETAIL</span>"
            + "<h2 class=\"display-3\" style=\"margin-top:4px\">退换货详情 · " + r.id + "</h2></div>"
          + "<button type=\"button\" class=\"icon-btn\" aria-label=\"关闭\" data-action=\"close-detail\">"
            + "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6 6 18\"/></svg>"
          + "</button>"
        + "</div>"
        + "<div class=\"admin-editor\">"
          + "<div class=\"field\"><label class=\"field__label\">申请信息</label>"
            + "<div style=\"display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size: var(--fs-sm)\">"
              + "<div><span class=\"admin-table__sku\">客户</span><br>" + esc(r.customer) + "</div>"
              + "<div><span class=\"admin-table__sku\">订单号</span><br><span class=\"mono\">" + esc(r.orderNo) + "</span></div>"
              + "<div><span class=\"admin-table__sku\">类型</span><br>" + (r.type === "refund" ? "退货退款" : "换货") + "</div>"
              + "<div><span class=\"admin-table__sku\">金额</span><br>¥" + F.formatPrice(r.amount || 0) + "</div>"
              + "<div><span class=\"admin-table__sku\">状态</span><br>" + statusBadge(r.status) + "</div>"
              + "<div><span class=\"admin-table__sku\">申请时间</span><br>" + F.formatDateTime(r.createdAt) + "</div>"
            + "</div>"
          + "</div>"
          + "<div class=\"field\"><label class=\"field__label\">原因</label>"
            + "<p style=\"font-size: var(--fs-sm)\">" + esc(r.reason) + "</p>"
          + "</div>"
          + "<div class=\"field\"><label class=\"field__label\">处理时间线</label>"
            + "<ul class=\"timeline\">" + timelineHtml + "</ul>"
          + "</div>"
        + "</div>"
      + "</div>"
    + "</div>";
  }

  function renderReject() {
    if (!state.rejectId) return "";
    var r = loadAll().find(function (x) { return x.id === state.rejectId; });
    if (!r) { state.rejectId = null; return ""; }
    return "<div class=\"confirm-modal\" data-reject-overlay>"
      + "<div class=\"confirm-modal__card\">"
        + "<div class=\"confirm-modal__title\">拒绝申请？</div>"
        + "<p class=\"confirm-modal__desc\">即将拒绝「" + esc(r.customer) + "」的退换货申请（" + r.id + "）。操作后会通知客户。</p>"
        + "<div class=\"confirm-modal__actions\">"
          + "<button type=\"button\" class=\"btn btn--ghost\" data-action=\"cancel-reject\">取消</button>"
          + "<button type=\"button\" class=\"btn\" style=\"background: var(--c-danger); color: #fff; border-color: var(--c-danger)\" data-action=\"confirm-reject\" data-rid=\"" + r.id + "\">确认拒绝</button>"
        + "</div>"
      + "</div>"
    + "</div>";
  }

  function appendOverlays() {
    removeOverlays();
    $("body").append(renderDetail() + renderReject());
  }
  function removeOverlays() {
    $("[data-detail-overlay], [data-reject-overlay]").remove();
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function bind($root) {
    $root.on("input", "[data-return-search]", function () {
      state.q = $(this).val();
    });
    $root.on("keydown", "[data-return-search]", function (e) {
      if (e.key === "Enter") { e.preventDefault(); state.page = 1; render(); }
    });
    C.Pagination.bind($root, function (p) { state.page = p; render(); });
    C.CsvButton.bind($root, function () {
      var list = filtered();
      if (!list.length) return null;
      return {
        filename: "VOLTA退换货_" + Volta.AdminCsv.dateStamp() + ".csv",
        header: ["申请号", "订单号", "客户", "类型", "原因", "金额", "状态", "申请时间"],
        rows: list.map(function (r) {
          return [r.id, r.orderNo, r.customer, TYPES[r.type] || r.type, r.reason, r.amount || 0, statusLabel(r.status), Volta.AdminCsv.formatStamp(r.createdAt)];
        })
      };
    });
    $root.on("click", "[data-action=\"switch-status\"]", function (e) {
      e.preventDefault(); state.statusFilter = $(this).data("code"); state.page = 1; render();
    });
    $root.on("change", "[data-action=\"switch-type\"]", function () {
      state.typeFilter = $(this).val(); state.page = 1; render();
    });
    $root.on("click", "[data-action=\"detail\"]", function (e) {
      e.preventDefault(); state.detailId = $(this).data("rid"); appendOverlays();
    });
    $root.on("click", "[data-action=\"advance\"]", function (e) {
      e.preventDefault(); advanceReturn($(this).data("rid"));
    });
    $root.on("click", "[data-action=\"reject\"]", function (e) {
      e.preventDefault(); state.rejectId = $(this).data("rid"); appendOverlays();
    });
  }

  function bindOverlays() {
    var $doc = $(document);
    $doc.off(".returnPage");
    $doc.on("click.returnPage", "[data-action=\"close-detail\"]", function (e) {
      e.preventDefault(); state.detailId = null; removeOverlays();
    });
    $doc.on("click.returnPage", "[data-detail-overlay]", function (e) {
      if (e.target === this) { state.detailId = null; removeOverlays(); }
    });
    $doc.on("click.returnPage", "[data-action=\"cancel-reject\"]", function (e) {
      e.preventDefault(); state.rejectId = null; removeOverlays();
    });
    $doc.on("click.returnPage", "[data-action=\"confirm-reject\"]", function (e) {
      e.preventDefault();
      var rid = $(this).data("rid");
      var arr = loadAll();
      var hit = arr.find(function (x) { return x.id === rid; });
      if (hit) {
        hit.status = "rejected"; hit.updatedAt = Date.now();
        hit.timeline = hit.timeline || [];
        hit.timeline.push({ status: "rejected", at: Date.now(), note: "申请已拒绝" });
        saveAll(arr); UI.toast("已拒绝", "success");
      }
      state.rejectId = null; removeOverlays(); render();
    });
    $doc.on("click.returnPage", "[data-reject-overlay]", function (e) {
      if (e.target === this) { state.rejectId = null; removeOverlays(); }
    });
  }

  function advanceReturn(rid) {
    var arr = loadAll();
    var hit = arr.find(function (x) { return x.id === rid; });
    if (!hit) return;
    var meta = STATUS[hit.status];
    if (!meta || !meta.next) { UI.toast("当前状态不可推进", "error"); return; }
    hit.status = meta.next; hit.updatedAt = Date.now();
    hit.timeline = hit.timeline || [];
    hit.timeline.push({ status: meta.next, at: Date.now(), note: meta.nextLabel || "状态推进" });
    saveAll(arr);
    UI.toast(meta.nextLabel || "已推进", "success");
    render();
  }

  $(function () {
    if (!Volta.AdminAuth.requireAdmin("/shuma/admin/login")) return;
    UI.initTheme();
    Volta.AdminLayout.init();
    render();
    bind($("#page-root"));
    bindOverlays();
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  });
})(window);