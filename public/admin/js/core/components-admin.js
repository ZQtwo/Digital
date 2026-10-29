/**
 * components-admin.js —— 后台公共组件 + CSV 导出（jQuery 版）
 * 参考 Vue 版：
 *   - utils/csv.js            → Volta.AdminCsv
 *   - components/PaginationBar.vue  → AdminPagination
 *   - components/EmptyState.vue     → AdminEmptyState
 *   - components/MultiSelect.vue    → AdminMultiSelect
 *   - components/ToastHost.vue      → 由 admin-layout.js 渲染，本文件不重复
 * 后台专用：库存表格行 / 状态徽章 / 批次撤销卡片 / CSV 导出按钮。
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;

  /* ============================== AdminCsv ============================== */
  // 移植自 Vue 版 utils/csv.js，使用 Blob + <a download> 触发下载。
  function escapeCell(cell) {
    return '"' + String(cell === undefined || cell === null ? '' : cell).replace(/"/g, '""') + '"';
  }
  function buildCsv(header, rows) {
    return [header].concat(rows).map(function (row) {
      return row.map(escapeCell).join(',');
    }).join('\r\n');
  }
  function dateStamp() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + m + day;
  }
  function formatStamp(ts) {
    var d = new Date(ts);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function downloadCsv(filename, csv) {
    try {
      var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 及时回收，避免占用内存
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (err) {
      return false;
    }
  }
  /**
   * 导出 CSV 文件
   * @param {Object} spec  { header: string[], rows: (string|number)[][] }
   * @param {string} filename  不传则按日期自动生成
   * @returns {boolean} 是否成功发起下载
   */
  function exportCsv(spec, filename) {
    var header = (spec && spec.header) || [];
    var rows = (spec && spec.rows) || [];
    var csv = buildCsv(header, rows);
    var name = filename || ('volta-export-' + dateStamp() + '.csv');
    return downloadCsv(name, csv);
  }

  global.Volta = global.Volta || {};
  global.Volta.AdminCsv = {
    buildCsv: buildCsv,
    dateStamp: dateStamp,
    formatStamp: formatStamp,
    downloadCsv: downloadCsv,
    export: exportCsv
  };

  /* ============================ 状态徽章 ============================ */
  // 统一映射：inventory 状态、order 状态、member 等级
  var STATUS_MAP = {
    // 库存
    ok: { label: '充足', tone: 'success' },
    low: { label: '偏低', tone: 'warn' },
    out: { label: '缺货', tone: 'danger' },
    // 订单
    pending_pay: { label: '待付款', tone: 'accent' },
    pending_ship: { label: '待发货', tone: 'accent' },
    shipped: { label: '已发货', tone: 'info' },
    completed: { label: '已完成', tone: 'success' },
    cancelled: { label: '已取消', tone: 'muted' },
    // 会员等级
    normal: { label: '普通会员', tone: 'muted' },
    silver: { label: '银卡会员', tone: 'info' },
    gold: { label: '金卡会员', tone: 'accent' },
    platinum: { label: '铂金会员', tone: 'success' }
  };
  function statusMeta(code) { return STATUS_MAP[code] || { label: code || '—', tone: 'muted' }; }

  var StatusBadge = {
    render: function (code, opts) {
      opts = opts || {};
      var m = statusMeta(code);
      var size = opts.size || 'sm';
      return '<span class="badge badge--' + m.tone + ' badge--' + size + '"' + (opts.title ? ' title="' + opts.title + '"' : '') + '>' + m.label + '</span>';
    },
    meta: statusMeta,
    MAP: STATUS_MAP
  };

  /* ============================ 库存表格行 ============================ */
  // 接收 Volta.Inventory.rows() 的一项，渲染 <tr>。
  var InventoryRow = {
    render: function (row, opts) {
      opts = opts || {};
      var checked = opts.checked ? ' checked' : '';
      var stock = Number(row.stock) || 0;
      var threshold = Number(row.threshold) || 0;
      var ratio = threshold ? Math.min(1, stock / (threshold * 2)) : 1;
      var barTone = row.status === 'out' ? 'danger' : (row.status === 'low' ? 'warn' : 'success');
      var art = Volta.ProductArt ? Volta.ProductArt.render(row.art, row.artSeed, row.name + ' 示意图') : '';
      var catName = Volta.Data ? (Volta.Data.categories.find(function (c) { return c.id === row.category; }) || {}).name || row.category : row.category;

      return '<tr class="inv-row" data-pid="' + row.id + '">'
        + '<td class="inv-row__cell inv-row__cell--check"><label class="check"><input type="checkbox" class="inv-row__check" data-pid="' + row.id + '"' + checked + '><span class="check__box" aria-hidden="true"></span></label></td>'
        + '<td class="inv-row__cell inv-row__cell--product">'
          + '<div class="inv-row__product">'
            + '<span class="inv-row__art">' + art + '</span>'
            + '<div class="inv-row__meta"><a href="#" class="inv-row__name" data-action="view-product" data-pid="' + row.id + '">' + row.name + '</a>'
            + '<span class="inv-row__brand mono">' + row.brand + ' · ' + catName + '</span></div>'
          + '</div>'
        + '</td>'
        + '<td class="inv-row__cell mono">' + stock + '</td>'
        + '<td class="inv-row__cell">'
          + '<div class="stock-bar"><span class="stock-bar__fill stock-bar__fill--' + barTone + '" style="width:' + Math.round(ratio * 100) + '%"></span></div>'
          + '<span class="inv-row__threshold mono">阈值 ' + threshold + '</span>'
        + '</td>'
        + '<td class="inv-row__cell">' + StatusBadge.render(row.status) + '</td>'
        + '<td class="inv-row__cell mono">¥' + F.formatPrice(row.value) + '</td>'
        + '<td class="inv-row__cell inv-row__cell--actions">'
          + '<button type="button" class="btn btn--sm btn--ghost" data-action="adjust-stock" data-pid="' + row.id + '" data-mode="in">入库</button>'
          + '<button type="button" class="btn btn--sm btn--ghost" data-action="adjust-stock" data-pid="' + row.id + '" data-mode="out">出库</button>'
          + '<button type="button" class="btn btn--sm btn--ghost" data-action="set-stock" data-pid="' + row.id + '">设定</button>'
          + (row.overridden ? '<button type="button" class="btn btn--sm btn--ghost" data-action="reset-stock" data-pid="' + row.id + '">还原</button>' : '')
        + '</td>'
      + '</tr>';
    },
    bind: function ($container, handlers) {
      // handlers: { onAdjust(pid, mode), onSet(pid), onReset(pid), onView(pid), onCheck(pid, checked) }
      $container.on('click', '[data-action="adjust-stock"]', function (e) {
        e.preventDefault();
        var pid = $(this).data('pid'); var mode = $(this).data('mode');
        if (handlers.onAdjust) handlers.onAdjust(pid, mode);
      });
      $container.on('click', '[data-action="set-stock"]', function (e) {
        e.preventDefault();
        if (handlers.onSet) handlers.onSet($(this).data('pid'));
      });
      $container.on('click', '[data-action="reset-stock"]', function (e) {
        e.preventDefault();
        if (handlers.onReset) handlers.onReset($(this).data('pid'));
      });
      $container.on('click', '[data-action="view-product"]', function (e) {
        e.preventDefault();
        if (handlers.onView) handlers.onView($(this).data('pid'));
      });
      $container.on('change', '.inv-row__check', function () {
        if (handlers.onCheck) handlers.onCheck($(this).data('pid'), this.checked);
      });
    }
  };

  /* ============================ 批次撤销卡片 ============================ */
  // 接收同 groupId 的若干日志条目，渲染一张撤销卡片。
  var UndoCard = {
    render: function (groupId, entries, opts) {
      opts = opts || {};
      if (!entries || !entries.length) return '';
      var head = entries[0];
      var items = entries.map(function (e) {
        var sign = e.delta > 0 ? '+' : (e.delta < 0 ? '−' : '');
        return '<li class="undo-card__item"><span class="undo-card__name">' + e.name + '</span>'
          + '<span class="mono undo-card__delta ' + (e.delta > 0 ? 'is-in' : (e.delta < 0 ? 'is-out' : '')) + '">' + sign + Math.abs(e.delta) + '</span>'
          + '<span class="mono undo-card__time">' + F.formatDateTime(e.at) + '</span></li>';
      }).join('');
      var tone = head.delta > 0 ? 'in' : (head.delta < 0 ? 'out' : 'neutral');
      return '<article class="undo-card undo-card--' + tone + '" data-group="' + groupId + '">'
        + '<header class="undo-card__head">'
          + '<span class="eyebrow">GROUP ' + groupId.slice(-6).toUpperCase() + '</span>'
          + '<span class="undo-card__reason">' + head.reason + '</span>'
          + '<button type="button" class="btn btn--sm btn--outline-accent" data-action="undo-group" data-group="' + groupId + '">撤销此批次</button>'
        + '</header>'
        + '<ul class="undo-card__list">' + items + '</ul>'
        + '</article>';
    },
    bind: function ($container, onUndo) {
      $container.on('click', '[data-action="undo-group"]', function (e) {
        e.preventDefault();
        if (onUndo) onUndo($(this).data('group'));
      });
    }
  };

  /* ============================ CSV 导出按钮 ============================ */
  var CsvButton = {
    render: function (opts) {
      opts = opts || {};
      var label = opts.label || '导出 CSV';
      var size = opts.size ? ' btn--' + opts.size : ' btn--sm';
      var styleCls = opts.style === 'primary' ? ' btn--primary' : ' btn--ghost';
      return '<button type="button" class="btn' + styleCls + size + '" data-action="export-csv" data-export-id="' + (opts.id || 'default') + '">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'
        + '<span>' + label + '</span>'
      + '</button>';
    },
    bind: function ($container, onExport) {
      // onExport(button) 应返回 { header, rows } 或 null
      $container.on('click', '[data-action="export-csv"]', function (e) {
        e.preventDefault();
        var spec = onExport ? onExport(this) : null;
        if (!spec) { Volta.UI.toast('暂无可导出的数据', 'info'); return; }
        var filename = spec.filename || ('volta-export-' + Volta.AdminCsv.dateStamp() + '.csv');
        var ok = Volta.AdminCsv.export(spec, filename);
        Volta.UI.toast(ok ? '已开始下载 ' + filename : '下载失败，请检查浏览器权限', ok ? 'success' : 'error');
      });
    }
  };

  /* ============================ AdminPagination ============================ */
  // 移植自 PaginationBar.vue：页码窗口 5 个，两端省略号。
  var Pagination = {
    render: function (opts) {
      var page = Number(opts.page) || 1;
      var pageCount = Math.max(1, Number(opts.pageCount) || 1);
      var total = Number(opts.total) || 0;
      var pageSize = Number(opts.pageSize) || 12;

      // 计算可见页码序列
      var pages = [];
      if (pageCount <= 7) {
        for (var i = 1; i <= pageCount; i += 1) pages.push(i);
      } else {
        pages.push(1);
        var start = Math.max(2, page - 1);
        var end = Math.min(pageCount - 1, page + 1);
        if (start > 2) pages.push('...');
        for (var j = start; j <= end; j += 1) pages.push(j);
        if (end < pageCount - 1) pages.push('...');
        pages.push(pageCount);
      }

      var html = '<nav class="pager" aria-label="分页导航">';
      html += '<button type="button" class="pager__btn"' + (page <= 1 ? ' disabled' : '') + ' data-action="page-go" data-page="' + (page - 1) + '" aria-label="上一页">'
        + '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2 L3.5 6 L7.5 10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        + '</button>';
      pages.forEach(function (p, idx) {
        if (p === '...') {
          html += '<span class="pager__info">···</span>';
        } else {
          var active = p === page;
          html += '<button type="button" class="pager__btn' + (active ? ' is-active' : '') + '" data-action="page-go" data-page="' + p + '"'
            + (active ? ' aria-current="page"' : '') + '>' + p + '</button>';
        }
      });
      html += '<button type="button" class="pager__btn"' + (page >= pageCount ? ' disabled' : '') + ' data-action="page-go" data-page="' + (page + 1) + '" aria-label="下一页">'
        + '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2 L8.5 6 L4.5 10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        + '</button>';
      html += '<span class="pager__info">共 ' + total + ' 件 / 每页 ' + pageSize + '</span>';
      html += '</nav>';
      return html;
    },
    bind: function ($container, onGo) {
      $container.on('click', '[data-action="page-go"]', function (e) {
        e.preventDefault();
        if (this.disabled) return;
        var p = Number($(this).data('page'));
        if (onGo) onGo(p);
      });
    }
  };

  /* ============================ AdminEmptyState ============================ */
  // 移植自 EmptyState.vue：内联 SVG，icon 取值 box/cart/search/heart/order。
  var EmptyState = {
    render: function (opts) {
      opts = opts || {};
      var icon = opts.icon || 'box';
      var svgBody;
      if (icon === 'cart') svgBody = '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.2l2.2 11.2h11.4l2.2-8.2H6"/>';
      else if (icon === 'search') svgBody = '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L21 21"/>';
      else if (icon === 'heart') svgBody = '<path d="M12 20.3l-6.6-6.5a4.2 4.2 0 1 1 6-5.9l.6.6.6-.6a4.2 4.2 0 1 1 6 5.9z"/>';
      else if (icon === 'order') svgBody = '<path d="M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.3 1.6L7.3 19 5 20.5z"/><path d="M9 8.5h6M9 12.5h4"/>';
      else svgBody = '<path d="M3.5 7.5 L12 3 L20.5 7.5 V16.5 L12 21 L3.5 16.5 Z"/><path d="M3.5 7.5 L12 12 L20.5 7.5 M12 12 V21"/>';
      var svg = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + svgBody + '</svg>';
      return '<div class="empty"><span class="empty__icon">' + svg + '</span>'
        + '<p class="empty__title">' + (opts.title || '这里什么都没有') + '</p>'
        + (opts.desc ? '<p class="empty__desc">' + opts.desc + '</p>' : '')
        + (opts.action ? '<div class="empty__action"><a href="' + (opts.actionHref || '#') + '" class="btn btn--outline-accent">' + opts.action + '</a></div>' : '')
        + '</div>';
    }
  };

  /* ============================ AdminMultiSelect ============================ */
  // 移植自 MultiSelect.vue：点击展开下拉，原生 checkbox 视觉隐藏。
  var MultiSelect = {
    render: function (opts) {
      opts = opts || {};
      var label = opts.label || '多选';
      var placeholder = opts.placeholder || '全部';
      var selected = opts.selected || [];
      var options = opts.options || [];
      var align = opts.align || 'left';

      var items = options.map(function (opt) {
        var v = opt.value !== undefined ? opt.value : opt;
        var l = opt.label !== undefined ? opt.label : opt;
        var on = selected.indexOf(v) !== -1;
        return '<li><label class="ms__option' + (on ? ' is-on' : '') + '">'
          + '<input type="checkbox" value="' + v + '"' + (on ? ' checked' : '') + ' data-ms-input>'
          + '<span class="ms__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6"/></svg></span>'
          + '<span class="ms__option-text">' + l + '</span>'
          + (opt.count !== undefined ? '<span class="ms__option-count">' + opt.count + '</span>' : '')
          + '</label></li>';
      }).join('');

      var summary = selected.length
        ? selected.map(function (v) {
            var hit = options.find(function (o) { return (o.value !== undefined ? o.value : o) === v; });
            return hit ? (hit.label !== undefined ? hit.label : hit) : v;
          }).join(' · ')
        : placeholder;

      return '<div class="ms" data-ms>'
        + '<button type="button" class="ms__trigger" aria-expanded="false" aria-haspopup="listbox" data-ms-trigger>'
          + '<span class="ms__trigger-label">' + label + '</span>'
          + '<span class="ms__trigger-value' + (selected.length ? '' : ' is-empty') + '">' + summary + '</span>'
          + '<svg class="ms__caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5 L6 8 L9.5 4.5"/></svg>'
        + '</button>'
        + '<div class="ms__panel" hidden style="' + (align === 'right' ? 'left:auto;right:0;' : '') + '">'
          + '<ul class="ms__options" role="listbox" aria-multiselectable="true" aria-label="' + label + '">' + items + '</ul>'
          + '<div class="ms__foot"><span class="ms__foot-count">已选 ' + selected.length + ' 项</span>'
            + '<div class="ms__foot-actions">'
              + '<button type="button" class="ms__clear" data-ms-clear>清空</button>'
              + '<button type="button" class="btn btn--sm btn--primary" data-ms-confirm>确定</button>'
            + '</div></div>'
        + '</div>'
      + '</div>';
    },
    bind: function ($container, onChange) {
      // 关键：每次 bind() 开始时先清理 document 上残留的旧 click-outside handler。
      // 场景：render() 重建 DOM 后旧 MultiSelect 实例被移除，但 setTimeout 绑的 handler 留在 document 上。
      // 这些死 handler 的 $wrap 指向已移除的 DOM，任何点击都会误触发。
      $(document).off('click.voltaMsClick');

      // 展开 / 收起
      $container.on('click', '[data-ms-trigger]', function (e) {
        e.preventDefault();
        var $wrap = $(this).closest('[data-ms]');
        var $panel = $wrap.find('.ms__panel');
        var open = !$panel.is(':visible');
        $('.ms__panel').not($panel).slideUp(140).parent().find('[data-ms-trigger]').attr('aria-expanded', 'false');
        $panel.slideToggle(140);
        $(this).attr('aria-expanded', String(open));
        if (open) {
          var $trig = $(this);
          var handler = function (ev) {
            // 用最新的 $wrap/$panel 引用，因为 render() 后 DOM 可能已重建
            var $w = $('[data-ms]').filter(function () { return $(this).find($trig).length || $(this).find('.ms__panel:visible').length; }).first();
            var $p = $w.find('.ms__panel');
            if (!$(ev.target).closest($w).length) {
              $p.slideUp(140);
              $w.find('[data-ms-trigger]').attr('aria-expanded', 'false');
              $(document).off('click.voltaMsClick');
            }
          };
          setTimeout(function () { $(document).on('click.voltaMsClick', handler); }, 0);
        }
      });
      // 勾选切换
      $container.on('change', '[data-ms-input]', function () {
        var $wrap = $(this).closest('[data-ms]');
        var $label = $(this).closest('.ms__option');
        $label.toggleClass('is-on', this.checked);
        var selected = [];
        $wrap.find('[data-ms-input]:checked').each(function () { selected.push($(this).val()); });
        $wrap.find('.ms__foot-count').text('已选 ' + selected.length + ' 项');
        if (onChange) onChange(selected, $wrap, { confirm: false });
      });
      // 清空
      $container.on('click', '[data-ms-clear]', function (e) {
        e.preventDefault();
        var $wrap = $(this).closest('[data-ms]');
        $wrap.find('[data-ms-input]').prop('checked', false);
        $wrap.find('.ms__option').removeClass('is-on');
        $wrap.find('.ms__foot-count').text('已选 0 项');
        $wrap.find('.ms__trigger-value').addClass('is-empty').text('全部');
        if (onChange) onChange([], $wrap, { confirm: false });
      });
      // 确定
      $container.on('click', '[data-ms-confirm]', function (e) {
        e.preventDefault();
        var $wrap = $(this).closest('[data-ms]');
        var $panel = $wrap.find('.ms__panel');
        var selected = [];
        $wrap.find('[data-ms-input]:checked').each(function () { selected.push($(this).val()); });
        $panel.slideUp(140);
        $wrap.find('[data-ms-trigger]').attr('aria-expanded', 'false');
        // 更新摘要
        var opts = $wrap.find('[data-ms-input]').map(function () {
          var v = $(this).val();
          var $label = $(this).closest('.ms__option').find('.ms__option-text').text();
          return { value: v, label: $label };
        }).get();
        var summary = selected.length
          ? selected.map(function (v) {
              var hit = opts.find(function (o) { return o.value === v; });
              return hit ? hit.label : v;
            }).join(' · ')
          : '全部';
        $wrap.find('.ms__trigger-value').toggleClass('is-empty', !selected.length).text(summary);
        if (onChange) onChange(selected, $wrap, { confirm: true });
      });
    }
  };

  global.Volta.AdminComponents = {
    StatusBadge: StatusBadge,
    InventoryRow: InventoryRow,
    UndoCard: UndoCard,
    CsvButton: CsvButton,
    Pagination: Pagination,
    EmptyState: EmptyState,
    MultiSelect: MultiSelect
  };
})(window);
