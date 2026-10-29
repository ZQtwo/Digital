/**
 * inventory.js —— 库存管理（jQuery 版）
 * 功能：
 *   - 搜索框、品类多选、状态筛选（全部/正常/低库存/缺货）、CSV 导出
 *   - 表格行：商品、品类、当前库存、阈值、状态徽章、操作（增/减/重置/调整阈值）
 *   - 批量勾选 + 批量调整弹层（设定/入库/出库/阈值）
 *   - 单行：调整库存（弹层）、重置默认、设阈值
 *   - 撤销：每条记录可撤销最近 set/in/out 操作（Volta.Inventory.undoGroup）
 *   - 移动端：表格变卡片视图
 * 数据：Volta.Inventory.rows / setStock / adjustStock / batchApply / setThreshold /
 *       batchSetThreshold / resetProduct / undoneGroups / undoGroup
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var Inv = Volta.Inventory;
  var F = Volta.Format;
  var Data = Volta.Data;
  var UI = Volta.UI;
  var C = Volta.AdminComponents;

  /* ------------------------------ 常量与状态 ------------------------------ */
  var PAGE_SIZE = 10;
  var STATUS_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'ok', label: '正常' },
    { value: 'low', label: '低库存' },
    { value: 'out', label: '缺货' }
  ];
  var SORT_OPTIONS = [
    { value: 'default', label: '默认' },
    { value: 'stock-asc', label: '库存最少' },
    { value: 'stock-desc', label: '库存最多' },
    { value: 'value-desc', label: '货值最高' }
  ];
  var BATCH_MODES = [
    { value: 'set', label: '设定为' },
    { value: 'in', label: '批量入库' },
    { value: 'out', label: '批量出库' },
    { value: 'threshold', label: '设为预警线' }
  ];

  var state = {
    q: '',
    catFilter: [],
    brandFilter: [],
    statusFilter: 'all',
    sortKey: 'default',
    page: 1,
    checkedIds: [],
    batchOpen: false,
    batchMode: 'set',
    batchValue: '',
    // 单行调整弹层
    adjustOpen: false,
    adjustRow: null,
    adjustMode: 'in',   // in / out / set
    adjustValue: '',
    adjustThresholdOpen: false,
    adjustThresholdRow: null,
    adjustThresholdValue: ''
  };

  /* ------------------------------ 工具 ------------------------------ */
  function categoryName(id) {
    // 优先用 API 返回的 categoryName（已存在 row 上）
    var row = Inv.rows().find(function (r) { return r.id === id; });
    if (row && row.categoryName) return row.categoryName;
    var hit = Data.categories.find(function (c) { return c.id === id; });
    return hit ? hit.name : id;
  }
  function statusText(s) {
    return ({ ok: '充足', low: '偏低', out: '缺货' })[s] || s;
  }
  function statusTagCls(s) {
    return s === 'out' ? 'tag--danger' : (s === 'low' ? 'tag--accent' : 'tag--success');
  }

  function categoryOptions() {
    // 从 API 返回的 rows 动态生成，不依赖 data.js mock
    var rows = Inv.rows();
    var map = {};
    rows.forEach(function (r) {
      var key = r.categoryCode || r.categoryName || r.category || '';
      if (!key) return;
      if (!map[key]) map[key] = { value: key, label: r.categoryName || r.category || key, count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort(function (a, b) { return a.label.localeCompare(b.label); });
  }
  function brandOptions() {
    var rows = Inv.rows();
    var map = {};
    rows.forEach(function (r) {
      if (!r.brand) return;
      if (!map[r.brand]) map[r.brand] = { value: r.brand, label: r.brand, count: 0 };
      map[r.brand].count++;
    });
    return Object.values(map).sort(function (a, b) { return a.label.localeCompare(b.label); });
  }

  /* ------------------------------ 过滤 / 排序 / 分页 ------------------------------ */
  function filtered() {
    var kw = state.q.trim().toLowerCase();
    var status = state.statusFilter;
    return Inv.rows().filter(function (row) {
      if (kw) {
        var hay = (row.name + ' ' + row.brand + ' ' + row.id).toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      if (state.catFilter.length) {
        // catFilter 存的是 categoryCode 或 categoryName
        var rowCat = row.categoryCode || row.categoryName || row.category || '';
        var rowCatName = row.categoryName || row.category || '';
        if (state.catFilter.indexOf(rowCat) === -1 && state.catFilter.indexOf(rowCatName) === -1) return false;
      }
      if (state.brandFilter.length && state.brandFilter.indexOf(row.brand) === -1) return false;
      if (status === 'alert') {
        if (row.status === 'ok') return false;
      } else if (status !== 'all' && row.status !== status) {
        return false;
      }
      return true;
    });
  }
  function sorted() {
    var list = filtered().slice();
    switch (state.sortKey) {
      case 'stock-asc': return list.sort(function (a, b) { return a.stock - b.stock; });
      case 'stock-desc': return list.sort(function (a, b) { return b.stock - a.stock; });
      case 'value-desc': return list.sort(function (a, b) { return b.value - a.value; });
      default:
        return list.sort(function (a, b) {
          var rank = { out: 0, low: 1, ok: 2 };
          if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
          return a.stock - b.stock;
        });
    }
  }
  function pageCount() { return Math.max(1, Math.ceil(sorted().length / PAGE_SIZE)); }
  function paged() {
    var start = (state.page - 1) * PAGE_SIZE;
    return sorted().slice(start, start + PAGE_SIZE);
  }
  function filterCount() {
    return (state.q.trim() ? 1 : 0)
      + state.catFilter.length + state.brandFilter.length
      + (state.statusFilter !== 'all' ? 1 : 0);
  }

  /* ------------------------------ 头部 ------------------------------ */
  function renderHead() {
    var stats = Inv.stats();
    return '<header class="admin-head">'
      + '<div class="admin-head__text">'
        + '<span class="eyebrow">INVENTORY</span>'
        + '<h1 class="display-3">库存管理</h1>'
        + '<p class="admin-head__lede">共 <span data-stat="sku-count">' + stats.skuCount + '</span> 个 SKU。改动会实时同步到前台商城，'
        + '并记录到出入库流水。</p>'
      + '</div>'
      + '<div class="admin-head__actions">'
        + C.CsvButton.render({ label: '导出 CSV', id: 'inv-export' })
      + '</div>'
    + '</header>';
  }

  /* ------------------------------ 工具条 ------------------------------ */
  function renderToolbar() {
    var catSel = C.MultiSelect.render({
      label: '品类', placeholder: '全部品类',
      options: categoryOptions(), selected: state.catFilter
    });
    var brandSel = C.MultiSelect.render({
      label: '品牌', placeholder: '全部品牌',
      options: brandOptions(), selected: state.brandFilter
    });
    var statusSeg = '<div class="seg">'
      + STATUS_OPTIONS.map(function (opt) {
        return '<button type="button" class="seg__btn' + (state.statusFilter === opt.value ? ' is-active' : '') + '"'
          + ' data-action="status-filter" data-value="' + opt.value + '">' + opt.label + '</button>';
      }).join('')
    + '</div>';
    var sortSeg = '<div class="seg">'
      + SORT_OPTIONS.map(function (opt) {
        return '<button type="button" class="seg__btn' + (state.sortKey === opt.value ? ' is-active' : '') + '"'
          + ' data-action="sort-key" data-value="' + opt.value + '">' + opt.label + '</button>';
      }).join('')
    + '</div>';
    var clearBtn = filterCount()
      ? '<button type="button" class="btn btn--ghost btn--sm" data-action="reset-filters">全部清除（' + filterCount() + '）</button>'
      : '';

    return '<div class="admin-toolbar">'
      + '<div class="admin-search">'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>'
        + '<input class="input" type="search" placeholder="搜索商品名称 / 品牌 / SKU" '
          + 'data-input="q" value="' + state.q.replace(/"/g, '&quot;') + '" />'
      + '</div>'
      + catSel + brandSel + statusSeg + clearBtn
      + '<span class="admin-toolbar__spacer"></span>'
      + sortSeg
    + '</div>';
  }

  /* ------------------------------ 批量操作条 ------------------------------ */
  function renderBatchBar() {
    if (!state.checkedIds.length) return '';
    return '<div class="admin-toolbar" data-batch-bar>'
      + '<span class="mono" style="font-size:var(--fs-sm)">已选 <strong>' + state.checkedIds.length + '</strong> 款商品</span>'
      + '<span class="admin-toolbar__spacer"></span>'
      + '<button type="button" class="btn btn--primary btn--sm" data-action="open-batch">批量调整库存</button>'
      + '<button type="button" class="btn btn--ghost btn--sm" data-action="clear-checked">取消选择</button>'
    + '</div>';
  }

  /* ------------------------------ 桌面表格 ------------------------------ */
  function renderTable() {
    var list = paged();
    if (!list.length) {
      return C.EmptyState.render({
        icon: 'search', title: '没有匹配的商品',
        desc: filterCount() ? '试试放宽筛选条件，或点「全部清除」' : '暂无库存数据'
      });
    }

    var allChecked = list.length > 0 && list.every(function (r) { return state.checkedIds.indexOf(r.id) !== -1; });
    var thead =+ '<thead><tr>'
      + '<th class="col-check"><label class="check-line check-line--only">'
        + '<input type="checkbox" data-action="toggle-all"' + (allChecked ? ' checked' : '') + ' aria-label="全选当前页" />'
        + '<span class="check-line__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>'
      + '</label></th>'
      + '<th>商品</th><th>分类</th>'
      + '<th style="text-align:right">售价</th>'
      + '<th style="text-align:right">当前库存</th>'
      + '<th>库存水位</th>'
      + '<th style="text-align:right">预警线</th>'
      + '<th>状态</th>'
      + '<th>操作</th>'
    + '</tr></thead>';

    var tbody = '<tbody>' + list.map(function (row) {
      var checked = state.checkedIds.indexOf(row.id) !== -1;
      var art = Volta.ProductArt.render(row.art, row.artSeed, row.name + ' 示意图');
      var ratio = row.stock <= 0 ? 100 : Math.min(100, (row.stock / Math.max(1, row.threshold * 4)) * 100);
      var fillCls = row.status === 'out' ? 'is-out' : (row.status === 'low' ? 'is-low' : '');
      var overriddenMark = row.overridden ? ' · 已调整' : '';
      return '<tr data-pid="' + row.id + '"' + (checked ? ' class="is-checked"' : '') + '>'
        + '<td class="col-check"><label class="check-line check-line--only">'
          + '<input type="checkbox" data-action="toggle-row" data-pid="' + row.id + '"' + (checked ? ' checked' : '') + ' aria-label="选择 ' + row.name + '" />'
          + '<span class="check-line__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>'
        + '</label></td>'
        + '<td><div class="admin-table__name">'
          + '<span class="admin-table__art">' + art + '</span>'
          + '<span class="admin-table__name-text">'
            + '<span class="admin-table__name-link">' + row.name + '</span>'
            + '<span class="admin-table__sku">' + row.id + ' · ' + row.brand + overriddenMark + '</span>'
          + '</span>'
        + '</div></td>'
        + '<td>' + categoryName(row.category) + '</td>'
        + '<td class="num">¥' + F.formatPrice(row.price) + '</td>'
        + '<td><div class="stock-cell">'
          + '<div class="stock-cell__quick">'
            + '<button type="button" data-action="quick" data-pid="' + row.id + '" data-delta="-10" aria-label="' + row.name + ' 出库 10 件">-10</button>'
            + '<button type="button" data-action="quick" data-pid="' + row.id + '" data-delta="10" aria-label="' + row.name + ' 入库 10 件">+10</button>'
            + '<button type="button" data-action="quick" data-pid="' + row.id + '" data-delta="50" aria-label="' + row.name + ' 入库 50 件">+50</button>'
          + '</div>'
          + '<input class="stock-cell__input" type="number" min="0" step="1" value="' + row.stock + '" '
            + 'data-action="set-stock-input" data-pid="' + row.id + '" aria-label="' + row.name + ' 的库存数量" />'
        + '</div></td>'
        + '<td><div class="stock-bar"><div class="stock-bar__track">'
          + '<div class="stock-bar__fill ' + fillCls + '" style="width:' + ratio + '%"></div>'
        + '</div></div></td>'
        + '<td><input class="stock-cell__input" type="number" min="0" step="1" value="' + row.threshold + '" '
          + 'data-action="set-threshold-input" data-pid="' + row.id + '" aria-label="' + row.name + ' 的预警线" /></td>'
        + '<td><span class="tag ' + statusTagCls(row.status) + '">' + statusText(row.status) + '</span></td>'
        + '<td>'
          + '<button type="button" class="btn btn--ghost btn--sm" data-action="adjust-dialog" data-pid="' + row.id + '">调整</button>'
          + '<button type="button" class="btn btn--ghost btn--sm" data-action="reset-row" data-pid="' + row.id + '">重置</button>'
        + '</td>'
      + '</tr>';
    }).join('') + '</tbody>';

    return '<div class="admin-table-wrap inv-desktop"><table class="admin-table">' + thead + tbody + '</table></div>';
  }

  /* ------------------------------ 移动端卡片 ------------------------------ */
  function renderMobile() {
    var list = paged();
    if (!list.length) return '';
    var cards = list.map(function (row) {
      var checked = state.checkedIds.indexOf(row.id) !== -1;
      var art = Volta.ProductArt.render(row.art, row.artSeed, row.name + ' 示意图');
      return '<div class="inv-mobile-card' + (checked ? ' is-checked' : '') + '" data-pid="' + row.id + '">'
        + '<label class="check-line check-line--only inv-mobile-card__head">'
          + '<input type="checkbox" data-action="toggle-row" data-pid="' + row.id + '"' + (checked ? ' checked' : '') + ' aria-label="选择 ' + row.name + '" />'
          + '<span class="check-line__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>'
        + '</label>'
        + '<div style="display:flex;gap:var(--sp-3);align-items:center">'
          + '<span style="width:48px;aspect-ratio:4/3;flex:none;border:1px solid var(--c-border);border-radius:var(--r-xs);overflow:hidden;background:var(--c-surface-2)">' + art + '</span>'
          + '<div style="flex:1;min-width:0">'
            + '<div class="admin-table__name-link">' + row.name + '</div>'
            + '<div class="admin-table__sku">' + row.id + ' · ' + row.brand + '</div>'
          + '</div>'
          + '<span class="tag ' + statusTagCls(row.status) + '">' + statusText(row.status) + '</span>'
        + '</div>'
        + '<div class="inv-mobile-card__body">'
          + '<div><div class="inv-mobile-card__label">分类</div><div class="inv-mobile-card__value">' + categoryName(row.category) + '</div></div>'
          + '<div><div class="inv-mobile-card__label">售价</div><div class="inv-mobile-card__value">¥' + F.formatPrice(row.price) + '</div></div>'
          + '<div><div class="inv-mobile-card__label">当前库存</div><div class="inv-mobile-card__value">' + row.stock + ' 件</div></div>'
          + '<div><div class="inv-mobile-card__label">预警线</div><div class="inv-mobile-card__value">' + row.threshold + ' 件</div></div>'
        + '</div>'
        + '<div class="inv-mobile-card__actions">'
          + '<button type="button" class="btn btn--sm btn--ghost" data-action="quick" data-pid="' + row.id + '" data-delta="10">+10</button>'
          + '<button type="button" class="btn btn--sm btn--ghost" data-action="quick" data-pid="' + row.id + '" data-delta="-10">-10</button>'
          + '<button type="button" class="btn btn--sm btn--ghost" data-action="adjust-dialog" data-pid="' + row.id + '">调整</button>'
          + '<button type="button" class="btn btn--sm btn--ghost" data-action="reset-row" data-pid="' + row.id + '">重置</button>'
        + '</div>'
      + '</div>';
    }).join('');
    return '<div class="inv-mobile">' + cards + '</div>';
  }

  /* ------------------------------ 表格页脚 / 分页 ------------------------------ */
  function renderFooter() {
    var list = sorted();
    if (!list.length) return '';
    var info = '<span class="admin-table-foot__info">共 ' + list.length + ' 条 · 第 ' + state.page + ' / ' + pageCount() + ' 页'
      + (filterCount() ? '（已筛选，共 ' + Inv.stats().skuCount + ' 个 SKU）' : '') + '</span>';
    var pager = C.Pagination.render({
      page: state.page, pageCount: pageCount(),
      total: list.length, pageSize: PAGE_SIZE
    });
    return '<div class="admin-table-foot">' + info + pager + '</div>';
  }

  /* ------------------------------ 批量抽屉 ------------------------------ */
  function renderBatchDrawer() {
    if (!state.batchOpen) return '';
    var modeSeg = '<div class="seg">'
      + BATCH_MODES.map(function (m) {
        return '<button type="button" class="seg__btn' + (state.batchMode === m.value ? ' is-active' : '') + '"'
          + ' data-action="batch-mode" data-value="' + m.value + '">' + m.label + '</button>';
      }).join('')
    + '</div>';
    var valueLabel = state.batchMode === 'threshold' ? '预警线数值' : '数量';
    return '<div class="admin-drawer" data-action="close-batch-bg">'
      + '<div class="admin-drawer__panel">'
        + '<div class="admin-drawer__head">'
          + '<div><span class="eyebrow">BATCH</span><h2 class="display-3">批量调整库存</h2></div>'
          + '<button type="button" class="icon-btn" aria-label="关闭" data-action="close-batch">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>'
          + '</button>'
        + '</div>'
        + '<p class="batch-drawer__hint">将对已勾选的 <strong>' + state.checkedIds.length + '</strong> 款商品生效。'
          + '批量出库时，库存不足的商品会停在 0，不会出现负数。</p>'
        + '<div class="field"><span class="field__label">操作类型</span>' + modeSeg + '</div>'
        + '<div class="field">'
          + '<label class="field__label" for="batch-value">' + valueLabel + '</label>'
          + '<input id="batch-value" class="input mono" type="number" min="0" step="1" '
            + 'placeholder="请输入不小于 0 的整数" data-input="batch-value" value="' + state.batchValue + '" />'
          + (state.batchMode === 'threshold'
            ? '<p class="field__hint">默认预警线为 ' + Inv.DEFAULT_THRESHOLD + ' 件，设为该值即恢复默认。</p>'
            : '')
        + '</div>'
        + '<div style="display:flex;gap:var(--sp-2)">'
          + '<button type="button" class="btn btn--primary" style="flex:1" data-action="confirm-batch">确认执行</button>'
          + '<button type="button" class="btn btn--ghost" style="flex:1" data-action="close-batch">取消</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  /* ------------------------------ 单行调整弹层 ------------------------------ */
  function renderAdjustDialog() {
    if (!state.adjustOpen || !state.adjustRow) return '';
    var row = state.adjustRow;
    var modeSeg = '<div class="seg">'
      + [{ v: 'in', l: '入库' }, { v: 'out', l: '出库' }, { v: 'set', l: '设定为' }].map(function (m) {
        return '<button type="button" class="seg__btn' + (state.adjustMode === m.v ? ' is-active' : '') + '"'
          + ' data-action="adjust-mode" data-value="' + m.v + '">' + m.l + '</button>';
      }).join('')
    + '</div>';
    return '<div class="admin-drawer" data-action="close-adjust-bg">'
      + '<div class="admin-drawer__panel">'
        + '<div class="admin-drawer__head">'
          + '<div><span class="eyebrow">ADJUST</span><h2 class="display-3">调整库存</h2></div>'
          + '<button type="button" class="icon-btn" aria-label="关闭" data-action="close-adjust">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>'
          + '</button>'
        + '</div>'
        + '<p class="batch-drawer__hint">商品：<strong>' + row.name + '</strong>（' + row.id + '）<br>'
          + '当前库存：<strong>' + row.stock + '</strong> 件 · 预警线：' + row.threshold + ' 件</p>'
        + '<div class="field"><span class="field__label">操作类型</span>' + modeSeg + '</div>'
        + '<div class="field">'
          + '<label class="field__label" for="adjust-value">数量</label>'
          + '<input id="adjust-value" class="input mono" type="number" min="0" step="1" '
            + 'placeholder="请输入不小于 0 的整数" data-input="adjust-value" value="' + state.adjustValue + '" />'
        + '</div>'
        + '<div style="display:flex;gap:var(--sp-2)">'
          + '<button type="button" class="btn btn--primary" style="flex:1" data-action="confirm-adjust">确认执行</button>'
          + '<button type="button" class="btn btn--ghost" style="flex:1" data-action="close-adjust">取消</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  /* ------------------------------ 整体渲染 ------------------------------ */
  function render() {
    // 【需求8修复】页码收敛：筛选/删除导致当前页超出范围时，
    // 不显示「没有匹配的商品」+ 分页器的组合，而是自动回到最后一页
    var pc = pageCount();
    if (state.page > pc) state.page = pc;
    var html = '<div class="admin-stack">'
      + renderHead()
      + renderToolbar()
      + renderBatchBar()
      + renderTable()
      + renderMobile()
      + renderFooter()
    + '</div>';
    $('#page-root').html(html);
  }

  /* ------------------------------ 定向更新辅助 ------------------------------ */
  // 只更新列表区域（批量条 + 表格 + 移动卡片 + 分页），不重建 head/toolbar
  // 用于筛选/排序/分页等需要换一批行的场景
  function refreshList() {
    // 【需求8修复】与 render() 相同的页码收敛
    var pc = pageCount();
    if (state.page > pc) state.page = pc;
    var $root = $('#page-root');
    // 找到 admin-stack 容器
    var $stack = $root.find('.admin-stack');
    if (!$stack.length) return render();
    // 清空旧列表区域，重新拼（保留 head 和 toolbar）
    // 【修复】同时清掉历史残留的 .empty 空态节点（旧版残留累积 46 个的根源之一）
    $stack.find('[data-batch-bar], .admin-table-wrap.inv-desktop, .inv-mobile, .admin-table-foot, .empty').remove();
    var html = renderBatchBar() + renderTable() + renderMobile() + renderFooter();
    // 插入到 toolbar 后面
    $stack.find('.admin-toolbar:last').after(html);
  }

  // 只更新单行 DOM：库存数字、水位条、状态徽章、输入框值
  function updateRowDOM(pid) {
    var row = Inv.rows().find(function (r) { return r.id === pid; });
    if (!row) return;
    // 桌面端行
    var $tr = $('#page-root tr[data-pid="' + pid + '"]');
    if ($tr.length) {
      $tr.find('.stock-cell__quick').next('.stock-cell__input').val(row.stock);
      var ratio = row.stock <= 0 ? 100 : Math.min(100, (row.stock / Math.max(1, row.threshold * 4)) * 100);
      var fillCls = row.status === 'out' ? 'is-out' : (row.status === 'low' ? 'is-low' : '');
      $tr.find('.stock-bar__fill').css('width', ratio + '%').removeClass('is-out is-low').addClass(fillCls);
      $tr.find('.tag').removeClass('tag--success tag--accent tag--danger').addClass(statusTagCls(row.status)).text(statusText(row.status));
      $tr.find('[data-action="set-threshold-input"]').val(row.threshold);
    }
    // 移动端卡片
    var $card = $('#page-root .inv-mobile-card[data-pid="' + pid + '"]');
    if ($card.length) {
      $card.find('.tag').removeClass('tag--success tag--accent tag--danger').addClass(statusTagCls(row.status)).text(statusText(row.status));
      var $vals = $card.find('.inv-mobile-card__value');
      if ($vals.length >= 3) {
        $vals.eq(2).text(row.stock + ' 件');
        $vals.eq(3).text(row.threshold + ' 件');
      }
    }
  }

  // 更新 header 统计（SKU 数、低库存/缺货计数）
  function refreshStats() {
    var stats = Inv.stats();
    // header 里的数字通过 data-stat 锚点定位
    $('#page-root [data-stat="sku-count"]').text(stats.skuCount);
    $('#page-root [data-stat="low-count"]').text(stats.lowCount + stats.outCount);
  }

  // 更新批量条的显示/隐藏
  function refreshBatchBar() {
    var $root = $('#page-root');
    var $existing = $root.find('[data-batch-bar]');
    if (state.checkedIds.length > 0) {
      var html = renderBatchBar();
      if ($existing.length) {
        $existing.replaceWith(html);
      } else {
        $root.find('.admin-stack .admin-toolbar:last').after(html);
      }
    } else {
      $existing.remove();
    }
  }

  // 打开单行调整弹层（append 到 body）
  function openAdjustDialog() {
    closeAdjustDialog();
    state.adjustOpen = true;
    $('body').append(renderAdjustDialog());
  }
  function closeAdjustDialog() {
    state.adjustOpen = false;
    $('[data-action="close-adjust-bg"]').remove();
  }

  // 打开批量抽屉
  function openBatchDrawer() {
    closeBatchDrawer();
    state.batchOpen = true;
    $('body').append(renderBatchDrawer());
  }
  function closeBatchDrawer() {
    state.batchOpen = false;
    $('[data-action="close-batch-bg"]').remove();
  }

  /* ------------------------------ 事件绑定 ------------------------------ */
  function bindAll() {
    var $root = $('#page-root');
    var $doc = $(document);

    // 搜索：input 只更新 state.q，回车才触发 render
    $root.on('input', '[data-input="q"]', function () {
      state.q = $(this).val();
    });
    $root.on('keydown', '[data-input="q"]', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.page = 1;
        render();
      }
    });

    // 状态筛选 seg —— 定向更新 seg 高亮 + 列表
    $root.on('click', '[data-action="status-filter"]', function () {
      state.statusFilter = $(this).data('value');
      state.page = 1;
      // 只更新 seg 高亮
      $root.find('[data-action="status-filter"]').each(function () {
        $(this).toggleClass('is-active', $(this).data('value') === state.statusFilter);
      });
      refreshList();
    });

    // 排序 seg —— 同上
    $root.on('click', '[data-action="sort-key"]', function () {
      state.sortKey = $(this).data('value');
      state.page = 1;
      $root.find('[data-action="sort-key"]').each(function () {
        $(this).toggleClass('is-active', $(this).data('value') === state.sortKey);
      });
      refreshList();
    });

    // 全部清除 —— render（重置所有筛选，包括 toolbar 里的 seg 状态）
    $root.on('click', '[data-action="reset-filters"]', function () {
      state.q = '';
      state.catFilter = [];
      state.brandFilter = [];
      state.statusFilter = 'all';
      state.sortKey = 'default';
      state.page = 1;
      render();
    });

    // 品类 / 品牌 MultiSelect —— refreshList
    C.MultiSelect.bind($root, function (selected, $wrap, ev) {
      var label = $wrap.find('.ms__trigger-label').text();
      if (label.indexOf('品类') !== -1) state.catFilter = selected;
      else if (label.indexOf('品牌') !== -1) state.brandFilter = selected;
      if (ev && ev.confirm) { state.page = 1; refreshList(); }
    });

    // CSV 导出
    C.CsvButton.bind($root, function () {
      var list = sorted();
      if (!list.length) return null;
      return {
        filename: 'VOLTA库存_' + Volta.AdminCsv.dateStamp() + '.csv',
        header: ['SKU', '商品名称', '品牌', '分类', '售价', '当前库存', '预警线', '状态', '库存货值'],
        rows: list.map(function (r) {
          return [r.id, r.name, r.brand, categoryName(r.category), r.price, r.stock, r.threshold, statusText(r.status), r.value];
        })
      };
    });

    // 分页 —— refreshList
    C.Pagination.bind($root, function (p) {
      state.page = p;
      refreshList();
    });

    /* ----- 勾选 —— 定向更新 checkbox + 行 class + 批量条 ----- */
    $root.on('change', '[data-action="toggle-row"]', function () {
      var pid = $(this).data('pid');
      var idx = state.checkedIds.indexOf(pid);
      if (this.checked) { if (idx === -1) state.checkedIds.push(pid); }
      else { if (idx !== -1) state.checkedIds.splice(idx, 1); }
      // 定向更新行 class
      $(this).closest('tr, .inv-mobile-card').toggleClass('is-checked', this.checked);
      // 批量条
      refreshBatchBar();
      // 更新全选 checkbox 状态
      updateToggleAllState();
    });
    $root.on('change', '[data-action="toggle-all"]', function () {
      var ids = paged().map(function (r) { return r.id; });
      var checked = this.checked;
      if (checked) {
        ids.forEach(function (id) { if (state.checkedIds.indexOf(id) === -1) state.checkedIds.push(id); });
      } else {
        state.checkedIds = state.checkedIds.filter(function (id) { return ids.indexOf(id) === -1; });
      }
      // 定向更新所有 checkbox + 行 class
      $root.find('[data-action="toggle-row"][data-pid]').each(function () {
        var pid = $(this).data('pid');
        var isChecked = state.checkedIds.indexOf(pid) !== -1;
        this.checked = isChecked;
        $(this).closest('tr, .inv-mobile-card').toggleClass('is-checked', isChecked);
      });
      refreshBatchBar();
    });

    function updateToggleAllState() {
      var $all = $root.find('[data-action="toggle-all"]');
      if (!$all.length) return;
      var ids = paged().map(function (r) { return r.id; });
      $all.prop('checked', ids.length > 0 && ids.every(function (id) { return state.checkedIds.indexOf(id) !== -1; }));
    }

    /* ----- 快速加减 —— async Inv.adjustStock ----- */
    $root.on('click', '[data-action="quick"]', function () {
      var pid = $(this).data('pid');
      var delta = Number($(this).data('delta'));
      var row = Inv.rows().find(function (r) { return r.id === pid; });
      if (!row) return;
      Inv.adjustStock(pid, delta, { reason: delta > 0 ? '后台补货入库' : '后台出库调整' }).then(function (res) {
        if (res.ok) {
          UI.toast(row.name + ' ' + (delta > 0 ? '入库' : '出库') + ' ' + Math.abs(delta) + ' 件', 'success');
        } else {
          UI.toast(res.message || '库存已是 0，无法继续出库', 'error');
        }
        Inv.refresh().then(function () { updateRowDOM(pid); refreshStats(); });
      });
    });

    /* ----- 直接修改库存输入 —— async Inv.setStock ----- */
    $root.on('change', '[data-action="set-stock-input"]', function () {
      var pid = $(this).data('pid');
      var $input = $(this);
      var val = Number($input.val());
      if (!Number.isFinite(val) || val < 0) {
        UI.toast('库存必须是不小于 0 的数字', 'error');
        Inv.rows(); // 触发加载
        Inv.refresh().then(function () { updateRowDOM(pid); });
        return;
      }
      var next = Math.floor(val);
      var row = Inv.rows().find(function (r) { return r.id === pid; });
      if (!row) return;
      if (next === row.stock) { $input.val(row.stock); return; }
      Inv.setStock(pid, next, { reason: '后台手动设定' }).then(function (res) {
        UI.toast(res.ok ? (row.name + ' 库存已设为 ' + next) : (res.message || '保存失败'), res.ok ? 'success' : 'error');
        Inv.refresh().then(function () { updateRowDOM(pid); refreshStats(); });
      });
    });

    /* ----- 修改预警线输入 —— async Inv.setThreshold ----- */
    $root.on('change', '[data-action="set-threshold-input"]', function () {
      var pid = $(this).data('pid');
      var val = Number($(this).val());
      if (!Number.isFinite(val) || val < 0) {
        UI.toast('预警线必须是不小于 0 的数字', 'error');
        Inv.refresh().then(function () { updateRowDOM(pid); });
        return;
      }
      var next = Math.floor(val);
      var row = Inv.rows().find(function (r) { return r.id === pid; });
      if (!row) return;
      Inv.setThreshold(pid, next).then(function () {
        UI.toast(row.name + ' 预警线已设为 ' + next, 'success');
        Inv.refresh().then(function () { updateRowDOM(pid); });
      });
    });

    /* ----- 重置默认 —— async ----- */
    $root.on('click', '[data-action="reset-row"]', function () {
      var pid = $(this).data('pid');
      var row = Inv.rows().find(function (r) { return r.id === pid; });
      if (!row) return;
      Inv.resetProduct(pid).then(function (res) {
        UI.toast(res.ok ? (row.name + ' 已恢复初始库存') : (res.message || '库存与初始值一致，无需恢复'), res.ok ? 'success' : 'info');
        Inv.refresh().then(function () { updateRowDOM(pid); refreshStats(); });
      });
    });

    /* ==================== 单行调整弹层（append 到 body，事件委托到 document）==================== */
    $root.on('click', '[data-action="adjust-dialog"]', function () {
      var pid = $(this).data('pid');
      var row = Inv.rows().find(function (r) { return r.id === pid; });
      if (!row) return;
      state.adjustRow = row;
      state.adjustMode = 'in';
      state.adjustValue = '';
      openAdjustDialog();
    });

    // 弹层内 seg 切换 —— 定向更新
    $doc.on('click', '[data-action="adjust-mode"]', function () {
      state.adjustMode = $(this).data('value');
      $('[data-action="adjust-mode"]').each(function () {
        $(this).toggleClass('is-active', $(this).data('value') === state.adjustMode);
      });
    });

    // 弹层内输入
    $doc.on('input', '[data-input="adjust-value"]', function () {
      state.adjustValue = $(this).val();
    });

    // 关闭弹层：点遮罩外部才关；点 Drawer 内部元素不关；点 close-adjust 按钮直接关
    $doc.on('click', '[data-action="close-adjust"], [data-action="close-adjust-bg"]', function (e) {
      if ($(this).data('action') === 'close-adjust-bg' && e.target !== this) return;
      state.adjustRow = null;
      closeAdjustDialog();
    });

    // 弹层确认 —— async + refresh
    $doc.on('click', '[data-action="confirm-adjust"]', function () {
      var row = state.adjustRow;
      if (!row) return;
      var val = Number(state.adjustValue);
      if (!Number.isFinite(val) || val < 0) {
        UI.toast('请输入不小于 0 的数字', 'error');
        return;
      }
      var next = Math.floor(val);
      var promise;
      if (state.adjustMode === 'set') {
        if (next === row.stock) { UI.toast('库存无变化', 'info'); return; }
        promise = Inv.setStock(row.id, next, { reason: '后台手动设定' }).then(function (res) {
          UI.toast(res.ok ? (row.name + ' 库存已设为 ' + next) : (res.message || '设定失败'), res.ok ? 'success' : 'error');
        });
      } else if (state.adjustMode === 'in') {
        promise = Inv.adjustStock(row.id, next, { reason: '后台补货入库' }).then(function (res) {
          UI.toast(res.ok ? (row.name + ' 入库 ' + next + ' 件') : (res.message || '库存无变化'), res.ok ? 'success' : 'info');
        });
      } else {
        promise = Inv.adjustStock(row.id, -next, { reason: '后台出库调整' }).then(function (res) {
          UI.toast(res.ok ? (row.name + ' 出库 ' + next + ' 件') : (res.message || '库存已是 0，无法继续出库'), res.ok ? 'success' : 'error');
        });
      }
      promise.then(function () {
        state.adjustRow = null;
        closeAdjustDialog();
        Inv.refresh().then(function () { updateRowDOM(row.id); refreshStats(); });
      });
    });

    /* ==================== 批量抽屉（同上，事件委托到 document）==================== */
    $root.on('click', '[data-action="open-batch"]', function () {
      state.batchMode = 'set';
      state.batchValue = '';
      openBatchDrawer();
    });

    // 批量 Drawer 关闭：同样的逻辑——点遮罩内部不关；点 close-batch 按钮或遮罩空白才关
    $doc.on('click', '[data-action="close-batch"], [data-action="close-batch-bg"]', function (e) {
      if ($(this).data('action') === 'close-batch-bg' && e.target !== this) return;
      closeBatchDrawer();
    });

    // 抽屉内 seg 切换 —— 定向更新
    $doc.on('click', '[data-action="batch-mode"]', function () {
      state.batchMode = $(this).data('value');
      $('[data-action="batch-mode"]').each(function () {
        $(this).toggleClass('is-active', $(this).data('value') === state.batchMode);
      });
      // 定向更新 label
      var label = state.batchMode === 'threshold' ? '预警线数值' : '数量';
      $('label[for="batch-value"]').text(label);
    });

    $doc.on('input', '[data-input="batch-value"]', function () {
      state.batchValue = $(this).val();
    });

    // 抽屉确认 —— async + refreshList
    $doc.on('click', '[data-action="confirm-batch"]', function () {
      var val = Number(state.batchValue);
      if (!Number.isFinite(val) || val < 0) {
        UI.toast('请输入不小于 0 的数字', 'error');
        return;
      }
      var ids = state.checkedIds.slice();
      var next = Math.floor(val);
      var promise;
      if (state.batchMode === 'threshold') {
        promise = Inv.batchSetThreshold(ids, next).then(function (changed) {
          UI.toast('已将 ' + changed + ' 款商品的预警线设为 ' + next, changed ? 'success' : 'info');
        });
      } else {
        var verb = { set: '设定', in: '入库', out: '出库' }[state.batchMode];
        promise = Inv.batchApply(ids, { mode: state.batchMode, value: next }).then(function (res) {
          UI.toast(res.changed ? (ids.length + ' 款商品批量' + verb + '完成，实际变动 ' + res.changed + ' 项') : '所选商品库存无变化', res.changed ? 'success' : 'info');
        });
      }
      promise.then(function () {
        state.batchValue = '';
        closeBatchDrawer();
        Inv.refresh().then(function () { refreshList(); refreshStats(); });
      });
    });

    /* ----- 取消选择 —— 定向清除 checkbox + 批量条 ----- */
    $root.on('click', '[data-action="clear-checked"]', function () {
      state.checkedIds = [];
      $root.find('[data-action="toggle-row"][data-pid], [data-action="toggle-all"]').each(function () {
        this.checked = false;
        $(this).closest('tr, .inv-mobile-card').removeClass('is-checked');
      });
      refreshBatchBar();
    });
  }

  /* ------------------------------ 初始化 ------------------------------ */
  function applyQueryParams() {
    var q = new URLSearchParams(location.search);
    if (q.get('q')) state.q = q.get('q');
    if (q.get('status') === 'alert') state.statusFilter = 'low';
    if (q.get('status') === 'out') state.statusFilter = 'out';
    if (q.get('status') === 'low') state.statusFilter = 'low';
    if (q.get('sort') === 'stock-desc') state.sortKey = 'stock-desc';
    if (q.get('sort') === 'stock-asc') state.sortKey = 'stock-asc';
  }

  $(function () {
    // 守卫：未登录跳登录页
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;

    // 初始化主题
    UI.initTheme();

    // 渲染外壳
    Volta.AdminLayout.init();

    // 应用 URL 参数
    applyQueryParams();

    // 先显示 loading 占位
    $('#page-root').html('<div class="admin-stack"><div class="admin-head"><h1 class="display-3">库存管理</h1><p class="admin-head__lede">加载中...</p></div></div>');

    // 从后端 API 加载数据 → 渲染页面
    Inv.refresh().then(function () {
      render();
      bindAll();
      setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
    });

    // 监听数据变化自动刷新
    Inv.onChange(function () {
      // 只更新列表区域，不重建整个页面
      refreshList();
    });

    // 【需求11】实时显示库存：5 秒轮询后端商品表（force=true 跳过缓存），
    // 前台下单扣减 / 后台其他页面调整库存后，本页自动同步（无需手动刷新页面）
    var lastSig = '';
    function invSig() {
      return Inv.rows().map(function (r) { return r.id + ':' + r.stock + ':' + r.threshold; }).join('|');
    }
    Inv.refresh(true).then(function () { lastSig = invSig(); });
    setInterval(function () {
      if (document.hidden) return;                                   // 页面不可见时跳过
      if (state.adjustOpen || state.batchOpen) return;               // 弹层打开时跳过，防打断
      if (document.activeElement && $(document.activeElement).is('[data-action="set-stock-input"], [data-action="set-threshold-input"], [data-input="q"]')) return; // 输入中跳过
      Inv.refresh(true).then(function () {
        var sig = invSig();
        if (sig !== lastSig) { lastSig = sig; refreshList(); refreshStats(); }
      }).catch(function () {});
    }, 5000);
  });
})(window);
