/**
 * logs.js —— 出入库流水（jQuery 版）
 * 功能：
 *   - 筛选条：日期范围、操作类型（set/in/out/order/restore/undo）、商品搜索
 *   - 表格：时间、商品、操作类型徽章、变动数量、备注、操作（撤销批次）
 *   - 撤销批次：把同 undoGroup 的多条记录一起撤销
 *   - 分页（每页 20 条）
 * 数据：Volta.Inventory.logs / undoneGroups / undoGroup / removeLog / clearLogs
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var Inv = Volta.Inventory;
  var F = Volta.Format;
  var UI = Volta.UI;
  var C = Volta.AdminComponents;

  /* ------------------------------ 常量与状态 ------------------------------ */
  var PAGE_SIZE = 20;
  var TYPE_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'in', label: '入库' },
    { value: 'out', label: '出库' },
    { value: 'set', label: '手动设定' },
    { value: 'order', label: '订单扣减' },
    { value: 'restore', label: '订单回补' },
    { value: 'undo', label: '撤销回滚' }
  ];

  var state = {
    q: '',
    typeFilter: 'all',
    dateFrom: '',  // YYYY-MM-DD
    dateTo: '',
    page: 1
  };

  /* ------------------------------ 工具 ------------------------------ */
  function formatStamp(ts) {
    return Volta.AdminCsv.formatStamp(ts);
  }
  function toneOf(type) {
    var m = Inv.LOG_TYPES[type];
    return m ? m.tone : 'neutral';
  }
  function labelOf(type) {
    var m = Inv.LOG_TYPES[type];
    return m ? m.label : type;
  }
  function tagClsOf(type) {
    var t = toneOf(type);
    return t === 'in' ? 'tag--success' : (t === 'out' ? 'tag--danger' : '');
  }

  /** 把 YYYY-MM-DD 转为当日 0 点时间戳 */
  function dateToTs(str, end) {
    if (!str) return null;
    var parts = String(str).split('-');
    if (parts.length !== 3) return null;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (end) d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  /** 类型匹配：订单回补算入库、订单扣减算出库 */
  function matchType(log) {
    switch (state.typeFilter) {
      case 'all': return true;
      case 'in': return log.type === 'in' || log.type === 'restore';
      case 'out': return log.type === 'out' || log.type === 'order';
      default: return log.type === state.typeFilter;
    }
  }

  /* ------------------------------ 过滤 / 分页 ------------------------------ */
  function filtered() {
    var kw = state.q.trim().toLowerCase();
    var tsFrom = dateToTs(state.dateFrom, false);
    var tsTo = dateToTs(state.dateTo, true);
    return (Inv.logs || []).filter(function (log) {
      if (!matchType(log)) return false;
      if (kw && (log.name + ' ' + log.productId + ' ' + log.reason).toLowerCase().indexOf(kw) === -1) return false;
      if (tsFrom !== null && log.at < tsFrom) return false;
      if (tsTo !== null && log.at > tsTo) return false;
      return true;
    });
  }
  function pageCount() { return Math.max(1, Math.ceil(filtered().length / PAGE_SIZE)); }
  function paged() {
    var start = (state.page - 1) * PAGE_SIZE;
    return filtered().slice(start, start + PAGE_SIZE);
  }
  function filterCount() {
    return (state.q.trim() ? 1 : 0)
      + (state.typeFilter !== 'all' ? 1 : 0)
      + (state.dateFrom ? 1 : 0)
      + (state.dateTo ? 1 : 0);
  }

  /** 仍在可撤销状态（未被撤销过）的批次号集合 */
  function undoableGroups() {
    var done = Inv.undoneGroups();
    var set = {};
    (Inv.logs || []).forEach(function (log) {
      if (Inv.UNDOABLE_TYPES.indexOf(log.type) !== -1 && !done.has(log.groupId)) {
        set[log.groupId] = true;
      }
    });
    return set;
  }

  /** 同一批次只在首次出现的那一行给撤销按钮 */
  function isFirstOfGroup(log, list) {
    var idx = list.findIndex(function (l) { return l.id === log.id; });
    if (idx <= 0) return true;
    return list[idx - 1].groupId !== log.groupId;
  }

  /* ------------------------------ 头部 ------------------------------ */
  function renderHead() {
    var logsCount = (Inv.logs || []).length;
    return '<header class="admin-head">'
      + '<div class="admin-head__text">'
        + '<span class="eyebrow">STOCK LOG</span>'
        + '<h1 class="display-3">出入库流水</h1>'
        + '<p class="admin-head__lede">记录每一次库存变动的前后值，便于核对与追溯。共 ' + logsCount + ' 条流水。'
        + '撤销只作用于后台的「手动设定 / 入库 / 出库」，订单扣减不参与（避免与订单状态不一致）。</p>'
      + '</div>'
      + '<div class="admin-head__actions">'
        + C.CsvButton.render({ label: '导出 CSV', id: 'logs-export' })
        + '<button type="button" class="btn btn--danger btn--sm" data-action="clear-logs">清空流水</button>'
      + '</div>'
    + '</header>';
  }

  /* ------------------------------ 最近可撤销 ------------------------------ */
  function renderLastUndoable() {
    var last = Inv.lastUndoableGroup();
    if (!last) return '';
    return '<div class="admin-toolbar">'
      + '<div style="display:flex;flex-direction:column;gap:2px">'
        + '<span class="mono" style="font-size:var(--fs-sm)">最近一次调整：' + last.name + ' · ' + last.reason + '</span>'
        + '<span class="admin-table-foot__info">' + formatStamp(last.at) + ' · ' + last.before + ' → ' + last.after + '</span>'
      + '</div>'
      + '<span class="admin-toolbar__spacer"></span>'
      + '<button type="button" class="btn btn--primary btn--sm" data-action="undo-last" data-group="' + last.groupId + '">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h11a6 6 0 0 1 0 12H7M3 8l4-4M3 8l4 4" /></svg>'
        + '撤销这一次</button>'
    + '</div>';
  }

  /* ------------------------------ 工具条 ------------------------------ */
  function renderToolbar() {
    var typeSeg = '<div class="seg">'
      + TYPE_OPTIONS.map(function (opt) {
        return '<button type="button" class="seg__btn' + (state.typeFilter === opt.value ? ' is-active' : '') + '"'
          + ' data-action="type-filter" data-value="' + opt.value + '">' + opt.label + '</button>';
      }).join('')
    + '</div>';
    var clearBtn = filterCount()
      ? '<button type="button" class="btn btn--ghost btn--sm" data-action="reset-filters">全部清除（' + filterCount() + '）</button>'
      : '';
    return '<div class="admin-toolbar">'
      + '<div class="admin-search">'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>'
        + '<input class="input" type="search" placeholder="搜索商品 / SKU / 变动原因" '
          + 'data-input="q" value="' + state.q.replace(/"/g, '&quot;') + '" />'
      + '</div>'
      + '<div class="admin-daterange">'
        + '<input type="date" data-input="date-from" value="' + state.dateFrom + '" aria-label="起始日期" />'
        + '<span class="admin-daterange__sep">→</span>'
        + '<input type="date" data-input="date-to" value="' + state.dateTo + '" aria-label="结束日期" />'
      + '</div>'
      + typeSeg + clearBtn
    + '</div>';
  }

  /* ------------------------------ 桌面表格 ------------------------------ */
  function renderTable() {
    var list = paged();
    if (!list.length) {
      return C.EmptyState.render({
        icon: 'order', title: '没有匹配的流水',
        desc: filterCount() ? '试试放宽筛选条件' : '调整一次库存后再回来看看'
      });
    }
    var undoable = undoableGroups();

    var thead =+ '<thead><tr>'
      + '<th>时间</th><th>商品</th><th>类型</th>'
      + '<th style="text-align:right">变动</th>'
      + '<th style="text-align:right">变动前 → 后</th>'
      + '<th>原因</th><th>操作人</th><th>操作</th>'
    + '</tr></thead>';

    var tbody = '<tbody>' + list.map(function (log) {
      var isUndoable = Inv.UNDOABLE_TYPES.indexOf(log.type) !== -1 && undoable[log.groupId];
      var isFirst = isFirstOfGroup(log, list);
      var actionCell = '';
      if (isUndoable && isFirst) {
        actionCell = '<button type="button" class="btn btn--ghost btn--sm" data-action="undo-group" data-group="' + log.groupId + '" data-label="' + log.reason.replace(/"/g, '&quot;') + '">撤销本批</button>';
      } else if (Inv.UNDOABLE_TYPES.indexOf(log.type) !== -1 && !undoable[log.groupId]) {
        actionCell = '<span class="admin-table-foot__info">已撤销</span>';
      }
      var deltaColor = log.delta > 0 ? 'var(--c-success)' : (log.delta < 0 ? 'var(--c-danger)' : 'inherit');
      var deltaText = (log.delta > 0 ? '+' : '') + log.delta;
      return '<tr data-id="' + log.id + '">'
        + '<td class="mono" style="white-space:nowrap;font-size:var(--fs-xs)">' + formatStamp(log.at) + '</td>'
        + '<td><div class="admin-table__name-text">'
          + '<span class="admin-table__name-link">' + log.name + '</span>'
          + '<span class="admin-table__sku">' + log.productId + '</span>'
        + '</div></td>'
        + '<td><span class="tag ' + tagClsOf(log.type) + '">' + labelOf(log.type) + '</span></td>'
        + '<td class="num" style="color:' + deltaColor + '">' + deltaText + '</td>'
        + '<td class="num">' + log.before + ' → ' + log.after + '</td>'
        + '<td style="font-size:var(--fs-xs);color:var(--c-text-2)">' + log.reason + '</td>'
        + '<td style="font-size:var(--fs-xs);color:var(--c-muted)">' + (log.operator || '—') + '</td>'
        + '<td>' + actionCell + '</td>'
      + '</tr>';
    }).join('') + '</tbody>';

    return '<div class="admin-table-wrap log-desktop"><table class="admin-table" style="min-width:900px">' + thead + tbody + '</table></div>';
  }

  /* ------------------------------ 移动端卡片 ------------------------------ */
  function renderMobile() {
    var list = paged();
    if (!list.length) return '';
    var undoable = undoableGroups();
    var cards = list.map(function (log) {
      var isUndoable = Inv.UNDOABLE_TYPES.indexOf(log.type) !== -1 && undoable[log.groupId];
      var isFirst = isFirstOfGroup(log, list);
      var deltaColor = log.delta > 0 ? 'var(--c-success)' : (log.delta < 0 ? 'var(--c-danger)' : 'inherit');
      var deltaText = (log.delta > 0 ? '+' : '') + log.delta;
      var action = '';
      if (isUndoable && isFirst) {
        action = '<button type="button" class="btn btn--ghost btn--sm" data-action="undo-group" data-group="' + log.groupId + '" data-label="' + log.reason.replace(/"/g, '&quot;') + '">撤销本批</button>';
      } else if (Inv.UNDOABLE_TYPES.indexOf(log.type) !== -1 && !undoable[log.groupId]) {
        action = '<span class="admin-table-foot__info">已撤销</span>';
      }
      return '<div class="log-mobile-card">'
        + '<div class="log-mobile-card__head">'
          + '<span class="log-mobile-card__time">' + formatStamp(log.at) + '</span>'
          + '<span class="tag ' + tagClsOf(log.type) + '">' + labelOf(log.type) + '</span>'
        + '</div>'
        + '<div class="log-mobile-card__name">' + log.name + ' <span class="admin-table__sku">' + log.productId + '</span></div>'
        + '<div class="log-mobile-card__row"><span class="log-mobile-card__label">变动</span>'
          + '<span class="log-mobile-card__value" style="color:' + deltaColor + '">' + deltaText + '</span></div>'
        + '<div class="log-mobile-card__row"><span class="log-mobile-card__label">前 → 后</span>'
          + '<span class="log-mobile-card__value">' + log.before + ' → ' + log.after + '</span></div>'
        + '<div class="log-mobile-card__row"><span class="log-mobile-card__label">原因</span>'
          + '<span style="font-size:var(--fs-xs);color:var(--c-text-2);text-align:right">' + log.reason + '</span></div>'
        + (action ? '<div class="log-mobile-card__action">' + action + '</div>' : '')
      + '</div>';
    }).join('');
    return '<div class="log-mobile">' + cards + '</div>';
  }

  /* ------------------------------ 表格页脚 / 分页 ------------------------------ */
  function renderFooter() {
    var list = filtered();
    if (!list.length) return '';
    var info = '<span class="admin-table-foot__info">共 ' + list.length + ' 条 · 第 ' + state.page + ' / ' + pageCount() + ' 页</span>';
    var pager = C.Pagination.render({
      page: state.page, pageCount: pageCount(),
      total: list.length, pageSize: PAGE_SIZE
    });
    return '<div class="admin-table-foot">' + info + pager + '</div>';
  }

  /* ------------------------------ 整体渲染 ------------------------------ */
  function render() {
    var html = '<div class="admin-stack">'
      + renderHead()
      + renderLastUndoable()
      + renderToolbar()
      + renderTable()
      + renderMobile()
      + renderFooter()
    + '</div>';
    $('#page-root').html(html);
  }

  /* ------------------------------ 事件绑定 ------------------------------ */
  function bindAll() {
    var $root = $('#page-root');

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

    // 日期范围
    $root.on('change', '[data-input="date-from"]', function () {
      state.dateFrom = $(this).val();
      state.page = 1;
      render();
    });
    $root.on('change', '[data-input="date-to"]', function () {
      state.dateTo = $(this).val();
      state.page = 1;
      render();
    });

    // 类型筛选
    $root.on('click', '[data-action="type-filter"]', function () {
      state.typeFilter = $(this).data('value');
      state.page = 1;
      render();
    });

    // 重置筛选
    $root.on('click', '[data-action="reset-filters"]', function () {
      state.q = '';
      state.typeFilter = 'all';
      state.dateFrom = '';
      state.dateTo = '';
      state.page = 1;
      render();
    });

    // 撤销最后一次
    $root.on('click', '[data-action="undo-last"]', function () {
      var group = $(this).data('group');
      doUndo(group, '最近一次调整');
    });

    // 撤销批次
    $root.on('click', '[data-action="undo-group"]', function () {
      var group = $(this).data('group');
      var label = String($(this).data('label') || '本批次');
      doUndo(group, label);
    });

    // 清空流水（仅 super）
    $root.on('click', '[data-action="clear-logs"]', function () {
      if (Volta.Admin && Volta.Admin.role() !== 'super') { UI.toast('无此权限，需要超级管理员', 'error'); return; }
      if (!(Inv.logs || []).length) {
        UI.toast('当前没有流水可清空', 'info');
        return;
      }
      if (!global.confirm('确认清空全部流水？此操作不可恢复，库存数据不受影响。')) return;
      Inv.clearLogs();
      state.page = 1;
      UI.toast('流水已清空（库存数据不受影响）', 'success');
      render();
    });

    // CSV 导出
    C.CsvButton.bind($root, function () {
      var list = filtered();
      if (!list.length) return null;
      return {
        filename: 'VOLTA出入库流水_' + Volta.AdminCsv.dateStamp() + '.csv',
        header: ['时间', '商品', 'SKU', '类型', '变动量', '变动前', '变动后', '原因', '操作人'],
        rows: list.map(function (log) {
          return [formatStamp(log.at), log.name, log.productId, labelOf(log.type),
            log.delta, log.before, log.after, log.reason, log.operator || ''];
        })
      };
    });

    // 分页
    C.Pagination.bind($root, function (p) {
      state.page = p;
      render();
    });
  }

  /* ------------------------------ 撤销逻辑 ------------------------------ */
  function doUndo(groupId, label) {
    var n = Inv.undoGroup(groupId);
    UI.toast(n ? '已撤销「' + label + '」，回滚 ' + n + ' 项' : '该批次已撤销过', n ? 'success' : 'info');
    render();
  }

  /* ------------------------------ 启动 ------------------------------ */
  $(function () {
    // 守卫：未登录跳登录页
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;

    // 初始化主题
    UI.initTheme();

    // 渲染外壳
    Volta.AdminLayout.init();

    // 渲染
    render();

    // 绑定事件（仅一次：用事件委托，重渲后仍生效）
    bindAll();

    // 入场动画
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  });
})(window);
