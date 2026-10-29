/**
 * banners.js —— 广告位管理页（jQuery 版）【绑定数据库版】
 *
 * 数据源：GET    /shuma/api/admin/banners     （数据库广告位表 ssc_hengfu，含停用）
 * 写操作：POST   /shuma/api/admin/banners     （新增）
 *         PUT    /shuma/api/admin/banners/{id}（编辑 / 启停，enabled 取反）
 *         DELETE /shuma/api/admin/banners/{id}（删除）
 *
 * 位置编码与控制器校验一致：home_top / side / activity。
 */
(function (global) {
  "use strict";
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var C = Volta.AdminComponents;

  /* ------------------------------ API 层 ------------------------------ */
  function apiReq(method, path, body) {
    var token = Volta.Admin.getToken();
    var headers = { 'Accept': 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch('/shuma/api/admin' + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json(); }).catch(function (e) {
      return { code: 1, message: '网络错误：' + (e.message || e) };
    });
  }

  /** 【绑定数据库】拉取全部广告位 */
  function fetchAll() {
    return apiReq('GET', '/banners').then(function (json) {
      if (json.code === 0 && json.data && Array.isArray(json.data.list)) {
        state.banners = json.data.list;
        render();
        return true;
      }
      return false;
    }).catch(function () { return false; });
  }

  var POSITIONS = {
    "home_top": "首页 Banner",
    "side": "侧栏推荐",
    "activity": "活动位"
  };

  var state = {
    banners: [],
    q: "",
    posFilter: "all",
    editorOpen: false,
    editorId: null,
    draft: emptyDraft(),
    confirmId: null,
    touched: false,
    alert: null
  };

  function emptyDraft() {
    return { position: "home_top", title: "", image: "", link: "", weight: "100", enabled: true };
  }

  function errorIf(cond, msg) { return cond ? "<p class=\"field__error\">" + msg + "</p>" : ""; }

  function validate() {
    var errs = {};
    if (state.touched) {
      if (!state.draft.title.trim()) errs.title = "标题不能为空";
      if (state.draft.image && !/^https?:\/\//.test(state.draft.image)) errs.image = "图片 URL 需以 http(s):// 开头";
      var w = Number(state.draft.weight);
      if (!isFinite(w) || w < 0 || w > 999) errs.weight = "权重需为 0-999";
    }
    return errs;
  }

  /** 过滤 + 排序（与控制器一致：权重 desc，数字越大越靠前；同权重 id 升序） */
  function filtered() {
    var kw = state.q.trim().toLowerCase();
    return state.banners.filter(function (b) {
      if (state.posFilter !== "all" && b.position !== state.posFilter) return false;
      if (kw && (b.title + " " + b.id).toLowerCase().indexOf(kw) === -1) return false;
      return true;
    }).sort(function (a, b) {
      var wa = Number(a.weight == null ? 0 : a.weight);
      var wb = Number(b.weight == null ? 0 : b.weight);
      if (wa !== wb) return wb - wa;
      return (a.id || 0) - (b.id || 0);
    });
  }

  function render() {
    var $root = $("#page-root");
    $root.html(renderHead() + renderStats() + renderToolbar() + renderTable() + renderCards());
  }

  function renderHead() {
    var total = state.banners.length;
    return "<header class=\"admin-head\">"
      + "<div class=\"admin-head__text\">"
        + "<span class=\"eyebrow\">BANNERS</span>"
        + "<h1 class=\"display-3\">广告位管理</h1>"
        + "<p class=\"lede\" style=\"font-size: var(--fs-sm)\">共 " + total + " 个广告位。支持首页 Banner、侧栏推荐、活动位三类位置。</p>"
      + "</div>"
      + "<div><button type=\"button\" class=\"btn btn--primary btn--sm\" data-action=\"open-add\">"
        + "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 5v14M5 12h14\"/></svg>"
        + "<span>新增广告位</span></button></div>"
    + "</header>";
  }

  function renderStats() {
    var all = state.banners;
    var enabled = all.filter(function (b) { return b.enabled; }).length;
    var disabled = all.length - enabled;
    var byPos = {};
    Object.keys(POSITIONS).forEach(function (k) { byPos[k] = 0; });
    all.forEach(function (b) { byPos[b.position] = (byPos[b.position] || 0) + 1; });
    return "<div class=\"stat-grid\">"
      + "<div class=\"stat-card\"><span class=\"stat-card__label\">广告位总数</span>"
        + "<span class=\"stat-card__value\">" + all.length + "<span class=\"stat-card__unit\">条</span></span></div>"
      + "<div class=\"stat-card stat-card--success\"><span class=\"stat-card__label\">启用中</span>"
        + "<span class=\"stat-card__value\">" + enabled + "<span class=\"stat-card__unit\">条</span></span></div>"
      + "<div class=\"stat-card stat-card--danger\"><span class=\"stat-card__label\">已停用</span>"
        + "<span class=\"stat-card__value\">" + disabled + "<span class=\"stat-card__unit\">条</span></span></div>"
      + "<div class=\"stat-card stat-card--accent\"><span class=\"stat-card__label\">首页 Banner</span>"
        + "<span class=\"stat-card__value\">" + (byPos["home_top"] || 0) + "<span class=\"stat-card__unit\">条</span></span></div>"
    + "</div>";
  }

  function renderToolbar() {
    var tabs = [{ code: "all", label: "全部" }].concat(Object.keys(POSITIONS).map(function (k) {
      return { code: k, label: POSITIONS[k] };
    }));
    var html = tabs.map(function (t) {
      var on = state.posFilter === t.code;
      return "<button type=\"button\" class=\"order-tabs__btn" + (on ? " is-active" : "") + "\" data-action=\"switch-pos\" data-code=\"" + t.code + "\">"
        + "<span>" + t.label + "</span>"
      + "</button>";
    }).join("");
    return "<div class=\"admin-toolbar\">"
      + "<div class=\"order-tabs\">" + html + "</div>"
      + "<div class=\"admin-search\">"
        + "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/></svg>"
        + "<input class=\"input\" type=\"search\" placeholder=\"搜索标题 / ID\" value=\"" + esc(state.q) + "\" data-banner-search>"
      + "</div>"
    + "</div>";
  }

  function renderTable() {
    var rows = filtered();
    if (!rows.length) {
      return C.EmptyState.render({ icon: "image", title: "没有匹配的广告位", desc: "试试切换位置 tab 或新增一条广告位" });
    }
    var body = rows.map(function (b) { return renderRow(b); }).join("");
    return "<div class=\"admin-table-wrap\">"
      + "<table class=\"admin-table\">"
        + "<thead><tr>"
          + "<th>预览</th>"
          + "<th>标题</th>"
          + "<th>位置</th>"
          + "<th style=\"text-align:right\">权重</th>"
          + "<th>状态</th>"
          + "<th>更新时间</th>"
          + "<th>操作</th>"
        + "</tr></thead>"
        + "<tbody>" + body + "</tbody>"
      + "</table></div>";
  }

  function renderRow(b) {
    var posLabel = POSITIONS[b.position] || b.position;
    var statusBadge = b.enabled
      ? "<span class=\"badge badge--success badge--sm\">启用中</span>"
      : "<span class=\"badge badge--muted badge--sm\">已停用</span>";
    return "<tr data-bid=\"" + b.id + "\">"
      + "<td><div class=\"banner-preview\">"
        + (b.image
          ? "<img src=\"" + esc(b.image) + "\" alt=\"\" loading=\"lazy\" onerror=\"this.style.display='none'\">"
          : "<span class=\"banner-preview__placeholder\">无图</span>")
      + "</div></td>"
      + "<td><div style=\"font-weight:500\">" + esc(b.title) + "</div>"
        + "<div class=\"admin-table__sku\">" + b.id + (b.link ? " · " + esc(b.link) : "") + "</div></td>"
      + "<td><span class=\"badge badge--info badge--sm\">" + posLabel + "</span></td>"
      + "<td class=\"num\">" + (b.weight == null ? 0 : b.weight) + "</td>"
      + "<td>" + statusBadge + "</td>"
      + "<td><span class=\"mono\" style=\"font-size: var(--fs-xs)\">" + (b.updatedAt ? F.formatDateTime(b.updatedAt) : "\u2014") + "</span></td>"
      + "<td><div style=\"display:flex; gap:var(--sp-2); flex-wrap:wrap\">"
        + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"edit\" data-bid=\"" + b.id + "\">编辑</button>"
        + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"toggle\" data-bid=\"" + b.id + "\">" + (b.enabled ? "停用" : "启用") + "</button>"
        + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" style=\"color: var(--c-danger)\" data-action=\"delete\" data-bid=\"" + b.id + "\">删除</button>"
      + "</div></td>"
    + "</tr>";
  }

  function renderCards() {
    var rows = filtered();
    if (!rows.length) return "";
    var items = rows.map(function (b) {
      var posLabel = POSITIONS[b.position] || b.position;
      return "<article class=\"admin-card\" data-bid=\"" + b.id + "\">"
        + "<div class=\"admin-card__head\">"
          + "<div class=\"banner-card-preview\">"
            + (b.image ? "<img src=\"" + esc(b.image) + "\" alt=\"\" loading=\"lazy\">" : "<span>无图</span>")
          + "</div>"
          + "<div style=\"flex:1; min-width:0\">"
            + "<div class=\"admin-card__name\">" + esc(b.title) + "</div>"
            + "<div class=\"admin-card__id\">" + b.id + " · " + posLabel + "</div>"
          + "</div>"
        + "</div>"
        + "<dl class=\"admin-card__meta\">"
          + "<dt>状态</dt><dd>" + (b.enabled ? "<span class=\"badge badge--success badge--sm\">启用</span>" : "<span class=\"badge badge--muted badge--sm\">停用</span>") + "</dd>"
          + "<dt>权重</dt><dd>" + (b.weight == null ? 0 : b.weight) + "</dd>"
          + "<dt>更新</dt><dd>" + (b.updatedAt ? F.formatDate(b.updatedAt) : "\u2014") + "</dd>"
        + "</dl>"
        + "<div class=\"admin-card__actions\">"
          + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"edit\" data-bid=\"" + b.id + "\">编辑</button>"
          + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"toggle\" data-bid=\"" + b.id + "\">" + (b.enabled ? "停用" : "启用") + "</button>"
          + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" style=\"color: var(--c-danger)\" data-action=\"delete\" data-bid=\"" + b.id + "\">删除</button>"
        + "</div>"
      + "</article>";
    }).join("");
    return "<div class=\"admin-cards\">" + items + "</div>";
  }

  function renderEditor() {
    if (!state.editorOpen) return "";
    var d = state.draft;
    var isEdit = !!state.editorId;
    var errs = validate();
    var positionOptions = Object.keys(POSITIONS).map(function (k) {
      return "<option value=\"" + k + "\"" + (d.position === k ? " selected" : "") + ">" + POSITIONS[k] + "</option>";
    }).join("");
    return "<div class=\"admin-drawer\" data-editor-overlay>"
      + "<div class=\"admin-drawer__panel\">"
        + "<div class=\"admin-drawer__head\">"
          + "<div><span class=\"eyebrow\">BANNER FORM</span>"
            + "<h2 class=\"display-3\" style=\"margin-top:4px\">" + (isEdit ? "编辑广告位" : "新增广告位") + "</h2></div>"
          + "<button type=\"button\" class=\"icon-btn\" aria-label=\"关闭\" data-action=\"close-editor\">"
            + "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6 6 18\"/></svg>"
          + "</button>"
        + "</div>"
        + "<div class=\"admin-editor\">"
          + "<div class=\"field\"><label class=\"field__label\">广告位位置</label>"
            + "<select class=\"field__select\" data-field=\"position\">" + positionOptions + "</select></div>"
          + "<div class=\"field\"><label class=\"field__label\">标题</label>"
            + "<input class=\"field__input\" type=\"text\" data-field=\"title\" value=\"" + esc(d.title) + "\" placeholder=\"例：夏日数码季 · 全场立减\">"
            + errorIf(errs.title, errs.title) + "</div>"
          + "<div class=\"field\"><label class=\"field__label\">图片 URL</label>"
            + "<input class=\"field__input\" type=\"url\" data-field=\"image\" value=\"" + esc(d.image) + "\" placeholder=\"https://...\" style=\"width:100%\">"
            + errorIf(errs.image, errs.image)
            + (d.image ? "<div style=\"margin-top:8px\"><img src=\"" + esc(d.image) + "\" alt=\"\" style=\"max-width:240px; max-height:100px; border-radius:6px; object-fit:cover\" onerror=\"this.style.display='none'\"></div>" : "")
          + "</div>"
          + "<div class=\"field\"><label class=\"field__label\">跳转链接（选填）</label>"
            + "<input class=\"field__input\" type=\"text\" data-field=\"link\" value=\"" + esc(d.link) + "\" placeholder=\"例：/shuma/product/p01\" style=\"width:100%\"></div>"
          + "<div class=\"field\"><label class=\"field__label\">权重（数字越大越靠前）</label>"
            + "<input class=\"field__input\" type=\"number\" data-field=\"weight\" value=\"" + esc(d.weight) + "\" min=\"0\" max=\"999\">"
            + errorIf(errs.weight, errs.weight) + "</div>"
          + "<label class=\"field field--inline\"><input type=\"checkbox\" data-field=\"enabled\"" + (d.enabled ? " checked" : "") + "> 立即启用</label>"
        + "</div>"
        + "<div class=\"admin-editor__actions\">"
          + "<button type=\"button\" class=\"btn btn--primary\" data-action=\"save\">" + (isEdit ? "保存修改" : "创建广告位") + "</button>"
          + "<button type=\"button\" class=\"btn btn--ghost\" data-action=\"close-editor\">取消</button>"
        + "</div>"
      + "</div>"
    + "</div>";
  }

  function renderConfirm() {
    if (!state.confirmId) return "";
    var b = state.banners.find(function (x) { return x.id === state.confirmId; });
    if (!b) { state.confirmId = null; return ""; }
    return "<div class=\"confirm-modal\" data-confirm-overlay>"
      + "<div class=\"confirm-modal__card\">"
        + "<div class=\"confirm-modal__title\">删除广告位？</div>"
        + "<p class=\"confirm-modal__desc\">即将删除广告位「" + esc(b.title) + "」（" + b.id + "）。此操作不可撤销。</p>"
        + "<div class=\"confirm-modal__actions\">"
          + "<button type=\"button\" class=\"btn btn--ghost\" data-action=\"cancel-delete\">取消</button>"
          + "<button type=\"button\" class=\"btn\" style=\"background: var(--c-danger); color: #fff; border-color: var(--c-danger)\" data-action=\"confirm-delete\" data-bid=\"" + b.id + "\">确认删除</button>"
        + "</div>"
      + "</div>"
    + "</div>";
  }

  function renderAlert() {
    if (!state.alert) return "";
    return "<div class=\"confirm-modal\" data-alert-overlay>"
      + "<div class=\"confirm-modal__card\">"
        + "<div class=\"confirm-modal__title\">" + esc(state.alert.title || "提示") + "</div>"
        + "<p class=\"confirm-modal__desc\">" + esc(state.alert.message || "") + "</p>"
        + "<div class=\"confirm-modal__actions\">"
          + "<button type=\"button\" class=\"btn btn--primary\" data-action=\"close-alert\">知道了</button>"
        + "</div>"
      + "</div>"
    + "</div>";
  }

  function appendOverlays() {
    removeOverlays();
    $("body").append(renderEditor() + renderConfirm() + renderAlert());
  }
  function removeOverlays() {
    $("[data-editor-overlay], [data-confirm-overlay], [data-alert-overlay]").remove();
  }

  function esc(s) {
    return String(s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function bind($root) {
    $root.on("input", "[data-banner-search]", function () {
      state.q = $(this).val();
    });
    $root.on("keydown", "[data-banner-search]", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        render();
      }
    });
    $root.on("click", "[data-action=\"switch-pos\"]", function (e) {
      e.preventDefault();
      state.posFilter = $(this).data("code");
      render();
    });
    $root.on("click", "[data-action=\"open-add\"]", function (e) {
      e.preventDefault();
      state.editorOpen = true; state.editorId = null;
      state.draft = emptyDraft(); state.touched = false;
      appendOverlays();
    });
    $root.on("click", "[data-action=\"edit\"]", function (e) {
      e.preventDefault();
      var bid = $(this).data("bid");
      var b = state.banners.find(function (x) { return x.id === bid; });
      if (!b) { UI.toast("广告位不存在", "error"); return; }
      state.editorOpen = true; state.editorId = bid;
      state.draft = { position: b.position, title: b.title, image: b.image || "", link: b.link || "", weight: String(b.weight == null ? 0 : b.weight), enabled: !!b.enabled };
      state.touched = false;
      appendOverlays();
    });
    $root.on("click", "[data-action=\"toggle\"]", function (e) {
      e.preventDefault();
      var bid = $(this).data("bid");
      var b = state.banners.find(function (x) { return x.id === bid; });
      if (!b) return;
      apiReq('PUT', '/banners/' + bid, { enabled: !b.enabled }).then(function (json) {
        if (json.code === 0) {
          UI.toast(!b.enabled ? "已启用" : "已停用", "success");
          fetchAll();
        } else {
          UI.toast(json.message || "操作失败", "error");
        }
      });
    });
    $root.on("click", "[data-action=\"delete\"]", function (e) {
      e.preventDefault();
      state.confirmId = $(this).data("bid");
      appendOverlays();
    });
  }

  function bindOverlays() {
    var $doc = $(document);
    $doc.off(".bannerPage");
    $doc.on("input change.bannerPage", "[data-field]", function () {
      var k = $(this).data("field");
      var v = k === "enabled" ? this.checked : $(this).val();
      state.draft[k] = v;
      state.touched = true;
    });
    $doc.on("click.bannerPage", "[data-action=\"close-editor\"]", function (e) {
      e.preventDefault();
      state.editorOpen = false; state.editorId = null;
      removeOverlays();
    });
    $doc.on("click.bannerPage", "[data-action=\"save\"]", function (e) {
      e.preventDefault();
      state.touched = true;
      var errs = validate();
      if (Object.keys(errs).length) { appendOverlays(); UI.toast("请修正表单错误", "error"); return; }
      saveBanner();
    });
    $doc.on("click.bannerPage", "[data-editor-overlay]", function (e) {
      if (e.target === this) { state.editorOpen = false; state.editorId = null; removeOverlays(); }
    });
    $doc.on("click.bannerPage", "[data-action=\"cancel-delete\"]", function (e) {
      e.preventDefault();
      state.confirmId = null;
      removeOverlays();
    });
    $doc.on("click.bannerPage", "[data-action=\"confirm-delete\"]", function (e) {
      e.preventDefault();
      var bid = $(this).data("bid");
      apiReq('DELETE', '/banners/' + bid).then(function (json) {
        if (json.code === 0) {
          UI.toast("已删除", "success");
        } else {
          UI.toast(json.message || "删除失败", "error");
        }
        state.confirmId = null;
        removeOverlays();
        fetchAll();
      });
    });
    $doc.on("click.bannerPage", "[data-confirm-overlay]", function (e) {
      if (e.target === this) { state.confirmId = null; removeOverlays(); }
    });
    $doc.on("click.bannerPage", "[data-action=\"close-alert\"]", function (e) {
      e.preventDefault();
      state.alert = null;
      removeOverlays();
    });
    $doc.on("click.bannerPage", "[data-alert-overlay]", function (e) {
      if (e.target === this) { state.alert = null; removeOverlays(); }
    });
  }

  function saveBanner() {
    var d = state.draft;
    var payload = {
      position: d.position,
      title: d.title.trim(),
      image: d.image.trim(),
      link: d.link.trim(),
      weight: Number(d.weight) || 0,
      enabled: !!d.enabled
    };
    var req = state.editorId
      ? apiReq('PUT', '/banners/' + state.editorId, payload)
      : apiReq('POST', '/banners', payload);
    req.then(function (json) {
      if (json.code === 0) {
        UI.toast(state.editorId ? "已更新" : "已新增", "success");
      } else {
        UI.toast(json.message || "保存失败", "error");
      }
      state.editorOpen = false; state.editorId = null;
      removeOverlays();
      fetchAll();
    });
  }

  $(function () {
    if (!Volta.AdminAuth.requireAdmin("/shuma/admin/login")) return;
    UI.initTheme();
    Volta.AdminLayout.init();
    render();
    bind($("#page-root"));
    bindOverlays();
    fetchAll();
  });
})(window);
