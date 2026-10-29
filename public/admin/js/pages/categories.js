/**
 * categories.js —— 分类管理页（jQuery 版）【绑定数据库版】
 *
 * 数据源：GET  /shuma/api/admin/categories   （数据库分类表 ssc_fenlei，含商品计数）
 * 写操作：POST /shuma/api/admin/categories   （新增，编号规则校验在控制器）
 *         PUT  /shuma/api/admin/categories/{dbId}（编辑名称）
 *         DELETE /shuma/api/admin/categories/{dbId}（删除，有商品/子分类时控制器拒绝）
 *
 * 页面展示用分类编号（code，如 P01）作为 id；dbId 为数据库数字主键。
 */
(function (global) {
  'use strict';
  var $ = global.jQuery;
  var Volta = global.Volta;
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

  /** 展平分类树：id=编号(code)，dbId=数据库主键 */
  function flattenCats(nodes) {
    var out = [];
    (nodes || []).forEach(function (n) {
      out.push({
        id: n.code,
        dbId: n.id,
        name: n.name,
        level: n.level,
        status: !!n.status,
        sortOrder: n.sortOrder || 0,
        productCount: n.productCount || 0,
        hasChildren: !!(n.children && n.children.length)
      });
      if (n.children && n.children.length) out = out.concat(flattenCats(n.children));
    });
    return out;
  }

  /** 【绑定数据库】从分类表拉取全部分类（含商品计数） */
  function fetchAll() {
    return apiReq('GET', '/categories').then(function (json) {
      if (json.code === 0 && json.data && Array.isArray(json.data.list)) {
        state.categories = flattenCats(json.data.list);
        render();
        return true;
      }
      return false;
    }).catch(function () { return false; });
  }

  /* ------------------------------ 排序 ------------------------------ */
  /**
   * 自然排序比较器：按"编号"独立排序，规则明确：
   *  1. 把编号拆成 token 数组（连续数字段 / 连续非数字段）
   *  2. 逐 token 比较：数字按数值，字母按字符串
   *  3. 前缀相同则短的在前
   * 例：'1' < '2' < '10' < 'a1' < 'a2' < 'a10' < 'b'
   */
  function naturalCompare(a, b) {
    var ta = tokenize(String(a));
    var tb = tokenize(String(b));
    var len = Math.min(ta.length, tb.length);
    for (var i = 0; i < len; i++) {
      var x = ta[i], y = tb[i];
      if (x.isNum && y.isNum) {
        if (x.num !== y.num) return x.num - y.num;
        if (x.str.length !== y.str.length) return x.str.length - y.str.length;
      } else {
        if (x.isNum !== y.isNum) return x.isNum ? -1 : 1;
        var cmp = x.str.localeCompare(y.str);
        if (cmp !== 0) return cmp;
      }
    }
    return ta.length - tb.length;
  }
  function tokenize(s) {
    var tokens = [];
    var buf = '';
    var isNum = null;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      var curIsNum = ch >= '0' && ch <= '9';
      if (buf.length && curIsNum !== isNum) {
        tokens.push(makeToken(buf, isNum));
        buf = '';
      }
      buf += ch;
      isNum = curIsNum;
    }
    if (buf.length) tokens.push(makeToken(buf, isNum));
    return tokens;
  }
  function makeToken(str, isNum) {
    return { str: str, isNum: !!isNum, num: isNum ? parseInt(str, 10) : 0 };
  }

  /* ------------------------------ 数据层 ------------------------------ */
  /** 全部分类（数据库数据，按编号自然排序） */
  function listAll() {
    var arr = ((state && state.categories) ? state.categories : []).slice();
    arr.sort(function (a, b) { return naturalCompare(a.id, b.id); });
    return arr;
  }

  function nextId() {
    var existing = listAll().map(function (c) { return c.id; });
    var n = 1;
    while (existing.indexOf('c' + n) !== -1) n += 1;
    return 'c' + n;
  }

  /* ------------------------------ 状态 ------------------------------ */
  // 注意：不使用 LS 缓存——页面打开时先渲染空态，fetchAll() 从数据库拉取后刷新。
  // （前台 store-categories 与本页同 origin，避免缓存结构互相污染）
  var state = {
    q: '',
    page: 1,
    pageSize: 10,
    categories: [],
    editorOpen: false,
    editorId: null,    // null = 新增；否则为分类编号(code)
    draft: null,
    confirmId: null,
    touched: false,
    saving: false
  };
  state.draft = emptyDraft();

  function emptyDraft() {
    return { id: nextId(), name: '' };
  }

  function errorIf(cond, msg) { return cond ? '<p class="field__error">' + msg + '</p>' : ''; }

  function validate() {
    var errs = {};
    if (state.touched) {
      // 【分类编号规则】1 位字母（大小写均可）+ 数字 1~99（如 A01、c1、X99）
      var CAT_CODE_RE = /^[A-Za-z](0[1-9]|[1-9]\d?)$/;
      if (!state.editorId) {
        var id = (state.draft.id || '').trim();
        if (!id) errs.id = '分类编号不能为空';
        else if (!CAT_CODE_RE.test(id)) errs.id = '编号格式：1 位字母（大小写均可）+ 数字 1~99（如 A01、c1、X99）';
        else if (listAll().some(function (c) { return c.id === id; })) errs.id = '分类编号已存在';
      }
      if (!state.draft.name.trim()) errs.name = '分类名称不能为空';
    }
    return errs;
  }

  /* ------------------------------ 过滤 ------------------------------ */
  function filtered() {
    var kw = state.q.trim().toLowerCase();
    return listAll().filter(function (c) {
      if (!kw) return true;
      return (c.name + ' ' + c.id).toLowerCase().indexOf(kw) !== -1;
    });
  }

  /* ------------------------------ 渲染 ----------------============== */
  function render() {
    var $root = $('#page-root');
    if (!$root.length) return;
    var all = filtered();
    var pages = Math.max(1, Math.ceil(all.length / state.pageSize));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    var start = (state.page - 1) * state.pageSize;
    var pageRows = all.slice(start, start + state.pageSize);
    $root.html(renderHead() + renderStats() + renderToolbar() + renderTable(pageRows, start) + renderCards(pageRows) + renderPager(pages, all.length));
    bind($root);
  }

  function renderHead() {
    var total = listAll().length;
    return '<header class="admin-head">'
      + '<div class="admin-head__text">'
        + '<span class="eyebrow">CATEGORIES</span>'
        + '<h1 class="display-3">分类管理</h1>'
        + '<p class="lede" style="font-size: var(--fs-sm)">共 ' + total + ' 个分类，数据实时来自数据库分类表（ssc_fenlei）。</p>'
      + '</div>'
      + '<div><button type="button" class="btn btn--primary btn--sm" data-action="open-add">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
        + '<span>新增分类</span></button></div>'
    + '</header>';
  }

  function renderStats() {
    var list = listAll();
    var total = list.length;
    var totalProducts = list.reduce(function (s, c) { return s + (c.productCount || 0); }, 0);
    var active = list.filter(function (c) { return c.status; }).length;
    var inactive = total - active;
    return '<div class="stat-grid">'
      + '<div class="stat-card"><span class="stat-card__label">分类总数</span>'
        + '<span class="stat-card__value">' + total + '<span class="stat-card__unit">个</span></span></div>'
      + '<div class="stat-card stat-card--accent"><span class="stat-card__label">关联商品</span>'
        + '<span class="stat-card__value">' + totalProducts + '<span class="stat-card__unit">款</span></span></div>'
      + '<div class="stat-card stat-card--success"><span class="stat-card__label">启用中</span>'
        + '<span class="stat-card__value">' + active + '<span class="stat-card__unit">个</span></span></div>'
      + '<div class="stat-card stat-card--danger"><span class="stat-card__label">已停用</span>'
        + '<span class="stat-card__value">' + inactive + '<span class="stat-card__unit">个</span></span></div>'
    + '</div>';
  }

  function renderToolbar() {
    return '<div class="admin-toolbar">'
      + '<div class="admin-search">'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
        + '<input class="input" type="search" placeholder="搜索分类名称 / ID" value="' + esc(state.q) + '" data-cat-search>'
      + '</div>'
    + '</div>';
  }

  function renderTable(rows, startIdx) {
    if (!rows.length) {
      return C.EmptyState.render({ icon: 'box', title: '没有匹配的分类', desc: '试试调整搜索词或新增一个分类' });
    }
    var body = rows.map(function (c, i) { return renderRow(c, startIdx + i + 1); }).join('');
    return '<div class="admin-table-wrap">'
      + '<table class="admin-table">'
        + '<thead><tr>'
          + '<th style="width:25%">序号</th>'
          + '<th style="width:25%">编号</th>'
          + '<th style="width:25%">分类名</th>'
          + '<th style="width:25%">操作</th>'
        + '</tr></thead>'
        + '<tbody>' + body + '</tbody>'
      + '</table></div>';
  }

  function renderRow(c, idx) {
    var cnt = c.productCount || 0;
    var delDisabled = cnt > 0 || c.hasChildren;
    var delTitle = cnt > 0 ? '该分类下还有商品' : (c.hasChildren ? '请先删除该分类下的子分类' : '');
    return '<tr data-cid="' + c.id + '">'
      + '<td><span class="mono" style="color: var(--c-muted); font-size: var(--fs-xs)">' + String(idx).padStart(2, '0') + '</span></td>'
      + '<td><span class="mono" style="font-size: var(--fs-xs)">' + c.id + '</span></td>'
      + '<td><div style="font-weight:500">' + esc(c.name) + '</div></td>'
      + '<td><div style="display:flex; gap:var(--sp-2); flex-wrap:wrap">'
        + '<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-cid="' + c.id + '">编辑</button>'
        + '<button type="button" class="btn btn--ghost btn--sm" style="color: var(--c-danger)" data-action="delete" data-cid="' + c.id + '"' + (delDisabled ? ' disabled title="' + delTitle + '"' : '') + '>删除</button>'
      + '</div></td>'
    + '</tr>';
  }

  function renderCards(rows) {
    if (!rows.length) return '';
    var items = rows.map(function (c) {
      return '<article class="member-card" data-cid="' + c.id + '">'
        + '<div class="member-card__head">'
          + '<div class="member-card__name"><span class="mono" style="color: var(--c-muted); margin-right:6px; font-size: var(--fs-xs)">' + c.id + '</span>' + esc(c.name) + '</div>'
        + '</div>'
        + '<div class="member-card__actions">'
          + '<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-cid="' + c.id + '">编辑</button>'
          + '<button type="button" class="btn btn--ghost btn--sm" style="color: var(--c-danger)" data-action="delete" data-cid="' + c.id + '">删除</button>'
        + '</div>'
      + '</article>';
    }).join('');
    return '<div class="member-cards">' + items + '</div>';
  }

  function renderPager(pages, total) {
    return C.Pagination.render({ page: state.page, pageCount: pages, pageSize: state.pageSize, total: total });
  }

  /* ------------------------------ 编辑器 / 删除 ---------------------- */
  function renderEditor() {
    if (!state.editorOpen) return '';
    var d = state.draft;
    var isEdit = !!state.editorId;
    var errs = validate();
    return '<div class="cat-modal" data-editor-overlay>'
      + '<div class="cat-modal__card">'
        + '<div class="cat-modal__head">'
          + '<div><span class="eyebrow">CATEGORY</span>'
            + '<h2 class="cat-modal__title">' + (isEdit ? '编辑分类' : '新增分类') + '</h2></div>'
          + '<button type="button" class="icon-btn" aria-label="关闭" data-action="close-editor">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
          + '</button>'
        + '</div>'
        + '<div class="cat-editor">'
          + '<div class="field"><label class="field__label">分类编号</label>'
            + '<input class="field__input" type="text" data-field="id" value="' + esc(d.id) + '"' + (isEdit ? ' readonly' : '') + ' placeholder="例：A01、c1、X99（1 位字母 + 数字 1~99）">'
            + errorIf(errs.id, errs.id) + '</div>'
          + '<div class="field"><label class="field__label">分类名称</label>'
            + '<input class="field__input" type="text" data-field="name" value="' + esc(d.name) + '" placeholder="例：智能穿戴">'
            + errorIf(errs.name, errs.name) + '</div>'
        + '</div>'
        + '<div class="cat-editor__actions">'
          + '<button type="button" class="btn btn--primary" data-action="save"' + (state.saving ? ' disabled' : '') + '>' + (state.saving ? '保存中…' : (isEdit ? '保存修改' : '创建分类')) + '</button>'
          + '<button type="button" class="btn btn--ghost" data-action="close-editor">取消</button>'
        + '</div>'
        + '<p class="admin-note">分类编号创建后不可修改；数据直接写入数据库分类表，删除不可恢复。</p>'
      + '</div>'
    + '</div>';
  }

  function renderConfirm() {
    if (!state.confirmId) return '';
    var c = listAll().find(function (x) { return x.id === state.confirmId; });
    if (!c) { state.confirmId = null; return ''; }
    return '<div class="confirm-modal" data-confirm-overlay>'
      + '<div class="confirm-modal__card">'
        + '<div class="confirm-modal__title">删除分类？</div>'
        + '<p class="confirm-modal__desc">即将从数据库删除「' + esc(c.name) + '」（' + c.id + '），此操作不可恢复。含商品或子分类的分类无法删除。</p>'
        + '<div class="confirm-modal__actions">'
          + '<button type="button" class="btn btn--ghost" data-action="cancel-delete">取消</button>'
          + '<button type="button" class="btn" style="background: var(--c-danger); color: #fff; border-color: var(--c-danger)" data-action="confirm-delete" data-cid="' + c.id + '">确认删除</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  /* ------------------------------ 事件 ------------------------------ */
  function bind($root) {
    $root.off();
    $(document).off('click.voltaMsClick');
    // 弹窗挂载在 body 上，弹窗内事件需 document 级委托；.catpage 命名空间避免 render 重复绑定
    $(document).off('.catpage');
    $(document).on('input change.catpage', '[data-field]', function () {
      var k = $(this).data('field');
      state.draft[k] = $(this).val();
      state.touched = true;
    });
    $(document).on('click.catpage', '[data-action="save"]', function (e) {
      e.preventDefault();
      if (state.saving) return;
      state.touched = true;
      var errs = validate();
      if (Object.keys(errs).length) { appendOverlays(); UI.toast('请修正表单错误', 'error'); return; }
      saveCategory();
    });
    $(document).on('click.catpage', '[data-action="close-editor"]', function (e) {
      e.preventDefault();
      state.editorOpen = false; state.editorId = null;
      removeOverlays();
    });
    $(document).on('click.catpage', '[data-action="cancel-delete"]', function (e) {
      e.preventDefault();
      state.confirmId = null;
      removeOverlays();
    });
    $(document).on('click.catpage', '[data-action="confirm-delete"]', function (e) {
      e.preventDefault();
      var cid = $(this).data('cid');
      state.confirmId = null;
      removeOverlays();
      deleteCategory(cid);
    });
    $(document).on('click.catpage', '[data-editor-overlay]', function (e) {
      if (e.target === this) { state.editorOpen = false; state.editorId = null; removeOverlays(); }
    });
    $(document).on('click.catpage', '[data-confirm-overlay]', function (e) {
      if (e.target === this) { state.confirmId = null; removeOverlays(); }
    });

    // $root 内事件（工具栏 / 表格行）
    // 搜索：input 只更新 state.q，回车才触发 render
    $root.on('input', '[data-cat-search]', function () {
      state.q = $(this).val();
    });
    $root.on('keydown', '[data-cat-search]', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.page = 1;
        render();
      }
    });
    C.Pagination.bind($root, function (p) {
      state.page = p;
      render();
    });
    $root.on('click', '[data-action="open-add"]', function (e) {
      e.preventDefault();
      state.editorOpen = true; state.editorId = null; state.draft = emptyDraft(); state.touched = false;
      appendOverlays();
    });
    $root.on('click', '[data-action="edit"]', function (e) {
      e.preventDefault();
      var cid = $(this).data('cid');
      var c = listAll().find(function (x) { return x.id === cid; });
      if (!c) { UI.toast('分类不存在', 'error'); return; }
      state.editorOpen = true; state.editorId = cid;
      state.draft = { id: cid, name: c.name };
      state.touched = false;
      appendOverlays();
    });
    $root.on('click', '[data-action="delete"]', function (e) {
      e.preventDefault();
      if (this.disabled) return;
      state.confirmId = $(this).data('cid');
      appendOverlays();
    });
  }

  function appendOverlays() {
    removeOverlays();
    $('body').append(renderEditor() + renderConfirm());
  }
  function removeOverlays() {
    $('[data-editor-overlay]').remove();
    $('[data-confirm-overlay]').remove();
  }

  /* ------------------------- 写操作（走数据库） ------------------------ */
  function saveCategory() {
    var d = state.draft;
    state.saving = true;
    appendOverlays();
    var done = function () { state.saving = false; };
    if (state.editorId) {
      // 编辑：只更新名称（编号不可改）
      var row = listAll().find(function (x) { return x.id === state.editorId; });
      if (!row) { done(); UI.toast('分类不存在', 'error'); return; }
      apiReq('PUT', '/categories/' + row.dbId, { name: d.name.trim() }).then(function (json) {
        done();
        if (json.code === 0) {
          UI.toast('分类 ' + state.editorId + ' 已更新', 'success');
          state.editorOpen = false; state.editorId = null;
          removeOverlays();
          fetchAll();
        } else {
          UI.toast(json.message || '保存失败', 'error');
          appendOverlays();
        }
      });
    } else {
      // 新增：编号 + 名称（编号规则由后端控制器再次校验）
      apiReq('POST', '/categories', { code: d.id.trim(), name: d.name.trim() }).then(function (json) {
        done();
        if (json.code === 0) {
          UI.toast('已新增分类 ' + d.id.trim(), 'success');
          state.editorOpen = false; state.editorId = null;
          removeOverlays();
          fetchAll();
        } else {
          UI.toast(json.message || '创建失败', 'error');
          appendOverlays();
        }
      });
    }
  }

  function deleteCategory(cid) {
    var row = listAll().find(function (x) { return x.id === cid; });
    if (!row) { UI.toast('分类不存在', 'error'); return; }
    apiReq('DELETE', '/categories/' + row.dbId).then(function (json) {
      if (json.code === 0) {
        UI.toast('分类 ' + cid + ' 已删除', 'success');
        fetchAll();
      } else {
        UI.toast(json.message || '删除失败', 'error');
      }
    });
  }

  /* ------------------------------ 工具小函数 ------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ------------------------------ 启动 ------------------------------ */
  $(function () {
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;
    UI.initTheme();
    Volta.AdminLayout.init();
    render();
    fetchAll();
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  });
})(window);
