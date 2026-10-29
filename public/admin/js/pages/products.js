/**
 * products.js —— 商品管理页（jQuery 版）
 * 参考 Vue 版 AdminProductsView.vue，按本次规格扩展：新增 / 编辑 / 删除 / 库存只读列。
 *
 * 数据流：
 *   Volta.Products.list()  → 商品列表
 *   Volta.Inventory.getStock(id) → 每件商品当前库存（只读展示）
 *   Volta.Products.add / update / remove → 增删改
 *   Volta.AdminComponents.* → 复用 MultiSelect / CsvButton / Pagination / EmptyState / StatusBadge
 */
(function (global) {
  "use strict";
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var Data = Volta.Data;
  var Products = Volta.Products;
  var Inventory = Volta.Inventory;
  var C = Volta.AdminComponents;

  var state = {
    q: "",
    catFilter: [],
    brandFilter: [],
    page: 1,
    pageSize: 20,
    editorOpen: false,
    editorId: null,
    editorStock: null,
    draft: null,
    confirmId: null
  };

  /* 分类数据表（ssc_fenlei）：[{id, code, name}]，含子分类；编辑弹窗/筛选均以此为准 */
  var catList = [];
  function loadCategories() {
    var token = Volta.Admin && Volta.Admin.getToken ? Volta.Admin.getToken() : "";
    return fetch("/shuma/api/admin/categories?pageSize=100", {
      headers: { "Accept": "application/json", "Authorization": "Bearer " + token }
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.code !== 0 || !j.data || !j.data.list) throw new Error(j.message || "拉取分类失败");
      var out = [];
      (j.data.list || []).forEach(function (top) {
        out.push({ id: top.id, code: top.code, name: top.name });
        (top.children || []).forEach(function (c) { out.push({ id: c.id, code: c.code, name: c.name }); });
      });
      catList = out;
    });
  }

  /** 分类名：优先 DB 行自带的 category 名；缺失时按 categoryId 在分类表里找 */
  function categoryName(p) {
    if (p && typeof p === "object") {
      if (p.category) return p.category;
      var hit = catList.find(function (c) { return String(c.id) === String(p.categoryId); });
      return hit ? hit.name : "未分类";
    }
    var hit2 = catList.find(function (c) { return c.code === p || String(c.id) === String(p); });
    if (hit2) return hit2.name;
    var hit3 = Data.categories.find(function (c) { return c.id === p; });
    return hit3 ? hit3.name : p;
  }
  function categoryOptions() {
    var list = catList.length ? catList : Data.categories;
    return list.map(function (c) { return { value: c.id, label: c.name }; });
  }
  function brandOptions() {
    return Data.brandList.map(function (b) { return { value: b, label: b }; });
  }

  function filtered() {
    var kw = state.q.trim().toLowerCase();
    return Products.list().filter(function (p) {
      if (kw) {
        var hay = (p.name + " " + p.brand + " " + p.id).toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      if (state.catFilter.length) {
        // 筛选值可能是分类表 dbId 或旧分类编码，商品行两侧都比对
        var catVals = [p.categoryId, p.category].filter(function (x) { return x !== undefined && x !== null && x !== ""; }).map(String);
        if (!state.catFilter.some(function (v) { return catVals.indexOf(String(v)) !== -1; })) return false;
      }
      if (state.brandFilter.length && state.brandFilter.indexOf(p.brand) === -1) return false;
      return true;
    });
  }
  function paged() {
    var list = filtered();
    var start = (state.page - 1) * state.pageSize;
    return list.slice(start, start + state.pageSize);
  }
  function pageCount() { return Math.max(1, Math.ceil(filtered().length / state.pageSize)); }

  function render() {
    var $root = $("#page-root");
    $root.html(renderHead() + renderStats() + renderToolbar() + renderTable() + renderCards() + renderFoot());
  }

  function renderHead() {
    var s = Products.stats();
    return "<header class=\"admin-head\">"
      + "<div class=\"admin-head__text\">"
        + "<span class=\"eyebrow\">PRODUCTS</span>"
        + "<h1 class=\"display-3\">商品管理</h1>"
        + "<p class=\"lede\" style=\"font-size: var(--fs-sm)\">共 " + s.total + " 个 SKU。新增请到「商品发布」页；编辑 / 删除直接落库，库存请到「库存管理」页维护。</p>"
      + "</div>"
      + "<div style=\"display: flex; gap: var(--sp-2)\">"
        + "<button type=\"button\" class=\"btn btn--primary btn--sm\" data-action=\"open-add\">"
          + "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 5v14M5 12h14\"/></svg>"
          + "<span>新增商品</span>"
        + "</button>"
        + C.CsvButton.render({ id: "products", label: "导出 CSV" })
      + "</div>"
    + "</header>";
  }

  function renderStats() {
    var s = Products.stats();
    return "<div class=\"stat-grid\">"
      + "<div class=\"stat-card\"><span class=\"stat-card__label\">商品总数</span>"
        + "<span class=\"stat-card__value\">" + s.total + "<span class=\"stat-card__unit\">款</span></span></div>"
      + "<div class=\"stat-card stat-card--accent\"><span class=\"stat-card__label\">已改价</span>"
        + "<span class=\"stat-card__value\">" + s.modifiedCount + "<span class=\"stat-card__unit\">款</span></span></div>"
      + "<div class=\"stat-card stat-card--success\"><span class=\"stat-card__label\">新增</span>"
        + "<span class=\"stat-card__value\">" + s.addedCount + "<span class=\"stat-card__unit\">款</span></span></div>"
      + "<div class=\"stat-card stat-card--danger\"><span class=\"stat-card__label\">已删除</span>"
        + "<span class=\"stat-card__value\">" + s.removedCount + "<span class=\"stat-card__unit\">款</span></span></div>"
    + "</div>";
  }

  function renderToolbar() {
    return "<div class=\"admin-toolbar\">"
      + "<div class=\"admin-search\">"
        + "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/></svg>"
        + "<input class=\"input\" type=\"search\" placeholder=\"搜索商品名称 / 品牌 / SKU\" value=\"" + escapeAttr(state.q) + "\" data-prod-search>"
      + "</div>"
      + C.MultiSelect.render({ label: "分类", placeholder: "全部分类", options: categoryOptions(), selected: state.catFilter })
      + C.MultiSelect.render({ label: "品牌", placeholder: "全部品牌", options: brandOptions(), selected: state.brandFilter })
      + "</div>";
  }

  function renderTable() {
    var rows = paged();
    if (!rows.length) {
      return C.EmptyState.render({ icon: "box", title: "没有匹配的商品", desc: "试试放宽筛选，或点「新增商品」" });
    }
    var body = rows.map(function (p) { return renderRow(p); }).join("");
    return "<div class=\"admin-table-wrap\">"
      + "<table class=\"admin-table\">"
        + "<thead><tr>"
          + "<th>商品</th>"
          + "<th>分类</th>"
          + "<th>品牌</th>"
          + "<th style=\"text-align:right\">售价</th>"
          + "<th style=\"text-align:right\">划线价</th>"
          + "<th style=\"text-align:right\">库存</th>"
          + "<th>操作</th>"
        + "</tr></thead>"
        + "<tbody>" + body + "</tbody>"
      + "</table></div>";
  }

  function renderRow(p) {
    var stock = Inventory ? Inventory.getStock(p.id) : 0;
    var catName = categoryName(p);
    return "<tr data-pid=\"" + p.id + "\">"
      + "<td><div style=\"font-weight:500\">" + escapeAttr(p.name) + "</div>"
        + "<div class=\"admin-table__sku\">" + p.id + "</div></td>"
      + "<td>" + escapeAttr(catName) + "</td>"
      + "<td>" + escapeAttr(p.brand || "\u2014") + "</td>"
      + "<td class=\"num\" style=\"text-align:right\">¥" + F.formatPrice(p.price || 0) + "</td>"
      + "<td class=\"num\" style=\"text-align:right\">" + (p.originalPrice ? "<span style=\"text-decoration:line-through; color:var(--c-muted)\">¥" + F.formatPrice(p.originalPrice) + "</span>" : "\u2014") + "</td>"
      + "<td class=\"num\" style=\"text-align:right\">" + (stock == null ? "\u2014" : stock) + "</td>"
      + "<td><div style=\"display:flex; gap:var(--sp-2); flex-wrap:wrap\">"
        + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"edit\" data-pid=\"" + p.id + "\">编辑</button>"
        + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" style=\"color: var(--c-danger)\" data-action=\"delete\" data-pid=\"" + p.id + "\">删除</button>"
      + "</div></td>"
    + "</tr>";
  }

  function renderCards() {
    var rows = paged();
    if (!rows.length) return "";
    var items = rows.map(function (p) {
      var stock = Inventory ? Inventory.getStock(p.id) : 0;
      return "<article class=\"admin-card\" data-pid=\"" + p.id + "\">"
        + "<div class=\"admin-card__head\"><div><div class=\"admin-card__name\">" + escapeAttr(p.name) + "</div>"
        + "<div class=\"admin-card__id\">" + p.id + " · " + escapeAttr(p.brand || "") + "</div></div></div>"
        + "<dl class=\"admin-card__meta\">"
          + "<dt>分类</dt><dd>" + escapeAttr(categoryName(p)) + "</dd>"
          + "<dt>售价</dt><dd>¥" + F.formatPrice(p.price || 0) + "</dd>"
          + "<dt>库存</dt><dd>" + (stock == null ? "\u2014" : stock) + "</dd>"
        + "</dl>"
        + "<div class=\"admin-card__actions\">"
          + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-action=\"edit\" data-pid=\"" + p.id + "\">编辑</button>"
          + "<button type=\"button\" class=\"btn btn--ghost btn--sm\" style=\"color: var(--c-danger)\" data-action=\"delete\" data-pid=\"" + p.id + "\">删除</button>"
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

  function renderEditor() {
    // 仅保留编辑弹窗；新增统一跳「商品发布」页
    if (!state.editorOpen || !state.editorId) return "";
    var d = state.draft;
    // 分类下拉绑定分类数据表（DB）：value = 分类 id，显示分类名；接口失败时回退旧静态表
    var catSrc = catList.length ? catList : Data.categories;
    var catOpts = catSrc.map(function (c) {
      return "<option value=\"" + c.id + "\"" + (String(d.categoryId) === String(c.id) ? " selected" : "") + ">" + escapeHtml(c.name) + "</option>";
    }).join("");
    var brandOpts = Data.brandList.map(function (b) {
      return "<option value=\"" + b + "\"" + (d.brand === b ? " selected" : "") + ">" + b + "</option>";
    }).join("");
    return "<div class=\"admin-drawer\" data-editor-overlay>"
      + "<div class=\"admin-drawer__panel\">"
        + "<div class=\"admin-drawer__head\">"
          + "<div><span class=\"eyebrow\">PRODUCT FORM</span>"
            + "<h2 class=\"display-3\" style=\"margin-top:4px\">编辑商品</h2></div>"
          + "<button type=\"button\" class=\"icon-btn\" aria-label=\"关闭\" data-action=\"close-editor\">"
            + "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6 6 18\"/></svg>"
          + "</button>"
        + "</div>"
        + "<div class=\"admin-editor\">"
          + "<div class=\"field\"><label class=\"field__label\">商品名称</label>"
            + "<input class=\"field__input\" type=\"text\" data-field=\"name\" value=\"" + escapeAttr(d.name) + "\" placeholder=\"请输入商品名称\"></div>"
          + "<div class=\"field\"><label class=\"field__label\">分类</label>"
            + "<select class=\"field__select\" data-field=\"categoryId\">" + catOpts + "</select></div>"
          + "<div class=\"field\"><label class=\"field__label\">品牌</label>"
            + "<select class=\"field__select\" data-field=\"brand\"><option value=\"\">请选择</option>" + brandOpts + "</select></div>"
          + "<div class=\"field\"><label class=\"field__label\">售价（元）</label>"
            + "<input class=\"field__input\" type=\"number\" step=\"0.01\" data-field=\"price\" value=\"" + escapeAttr(d.price) + "\" placeholder=\"0.00\"></div>"
          + "<div class=\"field\"><label class=\"field__label\">划线价（元，选填）</label>"
            + "<input class=\"field__input\" type=\"number\" step=\"0.01\" data-field=\"originalPrice\" value=\"" + escapeAttr(d.originalPrice) + "\" placeholder=\"原价\"></div>"
          + "<div class=\"field\"><label class=\"field__label\">商品描述（选填）</label>"
            + "<textarea class=\"field__input\" data-field=\"description\" rows=\"4\">" + escapeAttr(d.description) + "</textarea></div>"
        + "</div>"
        + "<div class=\"admin-editor__actions\">"
          + "<button type=\"button\" class=\"btn btn--primary\" data-action=\"save\">保存修改</button>"
          + "<button type=\"button\" class=\"btn btn--ghost\" data-action=\"close-editor\">取消</button>"
        + "</div>"
      + "</div>"
    + "</div>";
  }

  function renderConfirm() {
    if (!state.confirmId) return "";
    var p = Products.get(state.confirmId);
    if (!p) { state.confirmId = null; return ""; }
    return "<div class=\"confirm-modal\" data-confirm-overlay>"
      + "<div class=\"confirm-modal__card\">"
        + "<div class=\"confirm-modal__title\">删除商品？</div>"
        + "<p class=\"confirm-modal__desc\">即将删除商品「" + escapeAttr(p.name) + "」（" + p.id + "）。删除后在库存管理页仍可查看历史记录。</p>"
        + "<div class=\"confirm-modal__actions\">"
          + "<button type=\"button\" class=\"btn btn--ghost\" data-action=\"cancel-delete\">取消</button>"
          + "<button type=\"button\" class=\"btn\" style=\"background: var(--c-danger); color: #fff; border-color: var(--c-danger)\" data-action=\"confirm-delete\" data-pid=\"" + p.id + "\">确认删除</button>"
        + "</div>"
      + "</div>"
    + "</div>";
  }

  function appendOverlays() { removeOverlays(); $("body").append(renderEditor() + renderConfirm()); }
  function removeOverlays() { $("[data-editor-overlay], [data-confirm-overlay]").remove(); }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) { return escapeHtml(s); }

  var __bound = false;
  function bind($root) {
    // init 里 fetchAll 后会再次调用 bind，事件只绑一次（组件自带 off 防护，原生 on 没有）
    if (__bound) return;
    __bound = true;
    $root.on("input", "[data-prod-search]", function () { state.q = $(this).val(); });
    $root.on("keydown", "[data-prod-search]", function (e) { if (e.key === "Enter") { e.preventDefault(); state.page = 1; render(); } });
    C.MultiSelect.bind($root, function (selected, $wrap, info) {
      if (info.confirm) {
        var label = $wrap.find(".ms__trigger-label").text();
        if (label === "分类") state.catFilter = selected;
        if (label === "品牌") state.brandFilter = selected;
        state.page = 1; render();
      }
    });
    C.Pagination.bind($root, function (p) { state.page = p; render(); });
    C.CsvButton.bind($root, function () {
      var list = filtered(); if (!list.length) return null;
      return {
        filename: "VOLTA商品_" + Volta.AdminCsv.dateStamp() + ".csv",
        header: ["SKU", "名称", "分类", "品牌", "售价", "划线价"],
        rows: list.map(function (p) {
          return [p.id, p.name, categoryName(p), p.brand || "", p.price || 0, p.originalPrice || ""];
        })
      };
    });
    $root.on("click", "[data-action=\"open-add\"]", function (e) {
      // 新增商品 → 直接跳「商品发布」页（表单落库），不再使用弹窗新增
      e.preventDefault(); location.href = "/shuma/admin/products/create";
    });
    $root.on("click", "[data-action=\"edit\"]", function (e) {
      e.preventDefault();
      var pid = $(this).data("pid"); var p = Products.get(pid);
      if (!p) { UI.toast("商品不存在", "error"); return; }
      state.editorOpen = true; state.editorId = pid;
      // 分类绑定分类数据表：回填 categoryId（DB 行）；划线价 DB 字段为 listPrice
      state.draft = { name: p.name, categoryId: p.categoryId, brand: p.brand || "", price: String(p.price == null ? "" : p.price), originalPrice: String(p.listPrice == null ? "" : p.listPrice), description: p.description || "" };
      appendOverlays();
    });
    $root.on("click", "[data-action=\"delete\"]", function (e) {
      e.preventDefault(); state.confirmId = $(this).data("pid"); appendOverlays();
    });
  }

  function bindOverlays() {
    var $doc = $(document);
    $doc.off(".productPage");
    $doc.on("input change.productPage", "[data-field]", function () {
      var k = $(this).data("field"); state.draft[k] = $(this).val();
    });
    $doc.on("click.productPage", "[data-action=\"close-editor\"]", function (e) {
      e.preventDefault(); state.editorOpen = false; state.editorId = null; removeOverlays();
    });
    $doc.on("click.productPage", "[data-action=\"save\"]", function (e) {
      e.preventDefault(); saveProduct();
    });
    $doc.on("click.productPage", "[data-editor-overlay]", function (e) {
      if (e.target === this) { state.editorOpen = false; state.editorId = null; removeOverlays(); }
    });
    $doc.on("click.productPage", "[data-action=\"cancel-delete\"]", function (e) {
      e.preventDefault(); state.confirmId = null; removeOverlays();
    });
    $doc.on("click.productPage", "[data-action=\"confirm-delete\"]", function (e) {
      e.preventDefault();
      var pid = $(this).data("pid"); Products.remove(pid); UI.toast("已删除", "success");
      state.confirmId = null; removeOverlays(); render();
    });
    $doc.on("click.productPage", "[data-confirm-overlay]", function (e) {
      if (e.target === this) { state.confirmId = null; removeOverlays(); }
    });
  }

  function saveProduct() {
    var d = state.draft;
    if (!d.name.trim()) { UI.toast("请输入商品名称", "error"); return; }
    var price = Number(d.price);
    if (!isFinite(price) || price < 0) { UI.toast("售价需为有效数字", "error"); return; }
    if (state.editorId) {
      // 编辑 → PUT /admin/products/{id} 落库；分类以分类数据表的 categoryId 为准
      var cid = Number(d.categoryId);
      if (!cid) { UI.toast("分类未加载，请刷新页面重试", "error"); return; }
      var payload = { name: d.name.trim(), price: price, categoryId: cid };
      if (d.originalPrice !== "" && d.originalPrice != null) {
        var op = Number(d.originalPrice); if (isFinite(op) && op >= 0) payload.listPrice = op;
      }
      if (d.description && d.description.trim()) payload.description = d.description.trim();
      var token = Volta.Admin && Volta.Admin.getToken ? Volta.Admin.getToken() : "";
      fetch("/shuma/api/admin/products/" + state.editorId, {
        method: "PUT",
        headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j.code !== 0) { UI.toast(j.message || "保存失败", "error"); return; }
        UI.toast("已更新", "success");
        state.editorOpen = false; state.editorId = null; removeOverlays();
        return Products.fetchAll().then(render);
      }).catch(function (err) { UI.toast("保存失败：" + (err.message || err), "error"); });
      return;
    }
  }

  $(function () {
    if (!Volta.AdminAuth.requireAdmin("/shuma/admin/login")) return;
    UI.initTheme();
    Volta.AdminLayout.init();
    // 【v3】支持 URL ?page=N / ?page=last（商品发布后跳转直达最后一页看到新商品）
    var urlPage = new URLSearchParams(location.search).get("page");
    if (urlPage === "last") state.page = 9999;
    else if (urlPage && isFinite(Number(urlPage)) && Number(urlPage) > 0) state.page = Number(urlPage);
    render();
    bind($("#page-root"));
    bindOverlays();
    // 【v2】从数据库拉商品表，拉到后用 DB 数据重渲染
    if (typeof Products.fetchAll === "function") {
      Products.fetchAll().then(function () {
        if (urlPage === "last") state.page = pageCount();
        else if (urlPage && isFinite(Number(urlPage)) && Number(urlPage) > 0) state.page = Number(urlPage);
        else state.page = 1;
        render();
        bind($("#page-root"));
        setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
      }).catch(function (e) { console.warn("[products] DB 拉取失败，展示本地数据:", e.message); });
    }
    // 【v4】拉分类数据表，拉到后重渲染（编辑弹窗下拉/筛选使用真实分类名）
    loadCategories().then(function () {
      if (catList.length) render();
    }).catch(function (e) { console.warn("[products] 分类拉取失败，回退静态分类:", e.message); });
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  });
})(window);