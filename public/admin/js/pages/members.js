/**
 * members.js - User management (jQuery)
 */
(function (global) {
  'use strict';
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var Members = Volta.Members;
  var C = Volta.AdminComponents;
  var LEVELS = Members.MEMBER_LEVELS;
  var LEVEL_ORDER = Members.LEVEL_ORDER;

  var state = {
    q: '',
    levelFilter: [],
    page: 1,
    pageSize: 20,
    editorOpen: false,
    editorId: null,
    draft: emptyDraft(),
    confirmId: null,
    confirmAction: null,
    alert: null
  };

  function emptyDraft() {
    return { nickname: '', phone: '', level: 'auto', status: 'normal', registerType: 'admin', channel: 'H5', balance: 0, points: 0, verifiedPhone: false };
  }

  function levelLabel(code) { return LEVELS[code] ? LEVELS[code].label : code; }
  function levelTone(code) { return LEVELS[code] ? LEVELS[code].tone : 'muted'; }
  function levelBadge(code) {
    return '<span class="badge badge--' + levelTone(code) + ' badge--sm">' + levelLabel(code) + '</span>';
  }
  function statusLabel(code) {
    if (code === 'frozen') return '冻结';
    if (code === 'blacklist') return '黑名单';
    return '正常';
  }
  function statusTone(code) {
    if (code === 'frozen') return 'danger';
    if (code === 'blacklist') return 'muted';
    return 'success';
  }

  function filtered() {
    var kw = state.q.trim().toLowerCase();
    return Members.list().filter(function (m) {
      if (kw) {
        var hay = ((m.name || '') + ' ' + (m.phone || '') + ' ' + (m.id || '')).toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      if (state.levelFilter.length && state.levelFilter.indexOf(m.level) === -1) return false;
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
    var $root = $('#page-root');
    $root.html(renderHead() + renderStats() + renderToolbar() + renderTable() + renderCards() + renderFoot());
  }

  function renderHead() {
    var s = Members.stats();
    return '<header class="admin-head">'
      + '<div class="admin-head__text">'
        + '<span class="eyebrow">USERS</span>'
        + '<h1 class="display-3">用户管理</h1>'
        + '<p class="lede" style="font-size: var(--fs-sm)">原会员管理，已升级为完整 C 端用户管理。共 ' + s.total + ' 位用户。</p>'
      + '</div>'
      + '<div>' + C.CsvButton.render({ id: 'members', label: '导出 CSV' }) + '</div>'
    + '</header>';
  }

  function renderStats() {
    var s = Members.stats();
    return '<div class="stat-grid">'
      + '<div class="stat-card"><span class="stat-card__label">用户总数</span>'
        + '<span class="stat-card__value">' + s.total + '<span class="stat-card__unit">人</span></span></div>'
      + '<div class="stat-card stat-card--success"><span class="stat-card__label">已验证手机</span>'
        + '<span class="stat-card__value">' + s.verifiedPhoneCount + '<span class="stat-card__unit">人</span></span></div>'
      + '<div class="stat-card"><span class="stat-card__label">累计消费</span>'
        + '<span class="stat-card__value">¥' + F.formatPrice(s.totalSpent) + '</span></div>'
      + '<div class="stat-card stat-card--accent"><span class="stat-card__label">总订单</span>'
        + '<span class="stat-card__value">' + s.totalOrders + '<span class="stat-card__unit">单</span></span></div>'
    + '</div>';
  }

  function renderToolbar() {
    var levelOpts = LEVEL_ORDER.map(function (code) {
      return { value: code, label: levelLabel(code), count: Members.stats().byLevel[code] || 0 };
    });
    return '<div class="admin-toolbar">'
      + '<div class="admin-search">'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
        + '<input class="input" type="search" placeholder="搜索昵称 手机号 用户ID" value="' + esc(state.q) + '" data-member-search>'
      + '</div>'
      + C.MultiSelect.render({ label: '等级', placeholder: '全部等级', options: levelOpts, selected: state.levelFilter })
    + '</div>';
  }

  function renderTable() {
    var rows = paged();
    if (!rows.length) {
      return C.EmptyState.render({ icon: 'heart', title: '没有匹配的用户', desc: '试试放宽筛选条件' });
    }
    var body = rows.map(function (m) { return renderRow(m); }).join('');
    return '<div class="admin-table-wrap">'
      + '<table class="admin-table">'
        + '<thead><tr>'
          + '<th>用户</th>'
          + '<th>手机号</th>'
          + '<th>等级</th>'
          + '<th>状态</th>'
          + '<th style="text-align:right">消费</th>'
          + '<th style="text-align:right">订单</th>'
          + '<th>操作</th>'
        + '</tr></thead>'
        + '<tbody>' + body + '</tbody>'
      + '</table></div>';
  }

  function renderRow(m) {
    var name = m.name || m.nickname || '匿名';
    return '<tr data-mid="' + m.id + '">'
      + '<td><div style="font-weight:500">' + esc(name) + '</div>'
        + '<div class="admin-table__sku">' + m.id + '</div></td>'
      + '<td>' + (m.phone ? '<span class="mono">' + F.maskPhone(m.phone) + '</span>' : '\u2014') + '</td>'
      + '<td>' + levelBadge(m.level) + '</td>'
      + '<td><span class="badge badge--' + statusTone(m.status || 'normal') + ' badge--sm">' + statusLabel(m.status) + '</span></td>'
      + '<td class="num" style="text-align:right">¥' + F.formatPrice(m.totalSpent || 0) + '</td>'
      + '<td class="num" style="text-align:right">' + (m.totalOrders || 0) + '</td>'
      + '<td><div style="display:flex; gap:var(--sp-2); flex-wrap:wrap">'
        + '<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-mid="' + m.id + '">编辑</button>'
        + (m.status === 'normal'
          ? '<button type="button" class="btn btn--ghost btn--sm" data-action="freeze" data-mid="' + m.id + '">冻结</button>'
          : '<button type="button" class="btn btn--ghost btn--sm" data-action="unfreeze" data-mid="' + m.id + '">恢复</button>')
        + '<button type="button" class="btn btn--ghost btn--sm" style="color: var(--c-danger)" data-action="delete" data-mid="' + m.id + '">删除</button>'
      + '</div></td>'
    + '</tr>';
  }

  function renderCards() {
    var rows = paged();
    if (!rows.length) return '';
    var items = rows.map(function (m) {
      var name = m.name || m.nickname || '匿名';
      return '<article class="admin-card" data-mid="' + m.id + '">'
        + '<div class="admin-card__head"><div><div class="admin-card__name">' + esc(name) + '</div>'
        + '<div class="admin-card__id">' + m.id + '</div></div>'
        + levelBadge(m.level) + '</div>'
        + '<dl class="admin-card__meta">'
          + '<dt>手机</dt><dd>' + (m.phone ? F.maskPhone(m.phone) : '\u2014') + '</dd>'
          + '<dt>消费</dt><dd>¥' + F.formatPrice(m.totalSpent || 0) + '</dd>'
          + '<dt>订单</dt><dd>' + (m.totalOrders || 0) + '</dd>'
        + '</dl>'
        + '<div class="admin-card__actions">'
          + '<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-mid="' + m.id + '">编辑</button>'
          + (m.status === 'normal'
            ? '<button type="button" class="btn btn--ghost btn--sm" data-action="freeze" data-mid="' + m.id + '">冻结</button>'
            : '<button type="button" class="btn btn--ghost btn--sm" data-action="unfreeze" data-mid="' + m.id + '">恢复</button>')
        + '</div>'
      + '</article>';
    }).join('');
    return '<div class="admin-cards">' + items + '</div>';
  }

  function renderFoot() {
    var list = filtered();
    if (!list.length) return '';
    return '<div class="admin-table-foot">'
      + '<span class="admin-table-foot__info">共 ' + list.length + ' 条 - 第 ' + state.page + ' / ' + pageCount() + ' 页</span>'
      + C.Pagination.render({ page: state.page, pageCount: pageCount(), total: list.length, pageSize: state.pageSize })
    + '</div>';
  }

  function renderEditor() {
    if (!state.editorOpen) return '';
    var d = state.draft;
    var isEdit = !!state.editorId;
    var levelRadios = LEVEL_ORDER.map(function (code) {
      return '<label class="radio-card' + (d.level === code ? ' is-active' : '') + '">'
        + '<input type="radio" name="member-level" value="' + code + '"' + (d.level === code ? ' checked' : '') + ' data-member-level>'
        + '<span>' + levelLabel(code) + '</span></label>';
    }).join('')
      + '<label class="radio-card' + (d.level === 'auto' ? ' is-active' : '') + '">'
        + '<input type="radio" name="member-level" value="auto"' + (d.level === 'auto' ? ' checked' : '') + ' data-member-level>'
        + '<span>自动定级</span></label>';
    return '<div class="admin-drawer" data-editor-overlay>'
      + '<div class="admin-drawer__panel">'
        + '<div class="admin-drawer__head">'
          + '<div><span class="eyebrow">MEMBER FORM</span>'
            + '<h2 class="display-3" style="margin-top:4px">' + (isEdit ? '编辑用户' : '新增用户') + '</h2></div>'
          + '<button type="button" class="icon-btn" aria-label="关闭" data-action="close-editor">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
          + '</button>'
        + '</div>'
        + '<div class="admin-editor">'
          + '<div class="field"><label class="field__label">昵称</label>'
            + '<input class="field__input" type="text" data-field="nickname" value="' + esc(d.nickname) + '"></div>'
          + '<div class="field"><label class="field__label">手机号</label>'
            + '<input class="field__input" type="tel" data-field="phone" value="' + esc(d.phone) + '" maxlength="11"></div>'
          + '<div class="field"><label class="field__label">等级</label>'
            + '<div class="radio-row">' + levelRadios + '</div></div>'
          + '<div class="field"><label class="field__label">余额(元)</label>'
            + '<input class="field__input" type="number" step="0.01" data-field="balance" value="' + esc(d.balance) + '"></div>'
          + '<div class="field"><label class="field__label">积分</label>'
            + '<input class="field__input" type="number" data-field="points" value="' + esc(d.points) + '"></div>'
          + '<label class="field field--inline"><input type="checkbox" data-field="verifiedPhone"' + (d.verifiedPhone ? ' checked' : '') + '> 已验证手机</label>'
        + '</div>'
        + '<div class="admin-editor__actions">'
          + '<button type="button" class="btn btn--primary" data-action="save">' + (isEdit ? '保存' : '创建') + '</button>'
          + '<button type="button" class="btn btn--ghost" data-action="close-editor">取消</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  function renderConfirm() {
    if (!state.confirmId) return '';
    var m = Members.get(state.confirmId);
    if (!m) { state.confirmId = null; return ''; }
    var name = m.name || m.nickname || m.id;
    var act = state.confirmAction;
    var title = act === 'delete' ? '删除用户?' : act === 'freeze' ? '冻结账号?' : act === 'unfreeze' ? '恢复账号?' : '加入黑名单?';
    var desc = act === 'delete'
      ? '即将删除用户 ' + name + '. 此操作不可撤销.'
      : act === 'freeze'
        ? '即将冻结用户 ' + name + ', 对方将无法登录.'
        : act === 'unfreeze'
          ? '即将恢复用户 ' + name + ' 的正常使用.'
          : '即将把 ' + name + ' 加入黑名单.';
    var danger = (act === 'delete' || act === 'blacklist');
    return '<div class="confirm-modal" data-confirm-overlay>'
      + '<div class="confirm-modal__card">'
        + '<div class="confirm-modal__title">' + title + '</div>'
        + '<p class="confirm-modal__desc">' + desc + '</p>'
        + '<div class="confirm-modal__actions">'
          + '<button type="button" class="btn btn--ghost" data-action="cancel-confirm">取消</button>'
          + '<button type="button" class="btn"' + (danger ? ' style="background: var(--c-danger); color: #fff; border-color: var(--c-danger)"' : '') + ' data-action="confirm-confirm" data-mid="' + m.id + '">确认</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  function appendOverlays() { removeOverlays(); $('body').append(renderEditor() + renderConfirm()); }
  function removeOverlays() { $('[data-editor-overlay], [data-confirm-overlay]').remove(); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function bind($root) {
    $root.on('input', '[data-member-search]', function () { state.q = $(this).val(); });
    $root.on('keydown', '[data-member-search]', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); state.page = 1; render(); }
    });
    C.MultiSelect.bind($root, function (selected, $wrap, info) {
      if (info.confirm) {
        var label = $wrap.find('.ms__trigger-label').text();
        if (label === '等级') state.levelFilter = selected;
        state.page = 1; render();
      }
    });
    C.Pagination.bind($root, function (p) { state.page = p; render(); });
    C.CsvButton.bind($root, function () {
      var list = filtered(); if (!list.length) return null;
      return {
        filename: 'VOLTA用户_' + Volta.AdminCsv.dateStamp() + '.csv',
        header: ['用户ID', '昵称', '手机', '等级', '消费', '订单数'],
        rows: list.map(function (m) {
          return [m.id, m.name || m.nickname || '', m.phone || '', levelLabel(m.level), m.totalSpent || 0, m.totalOrders || 0];
        })
      };
    });
    $root.on('click', '[data-action="edit"]', function (e) {
      e.preventDefault();
      var mid = $(this).data('mid'); var m = Members.get(mid);
      if (!m) { UI.toast('用户不存在', 'error'); return; }
      state.editorOpen = true; state.editorId = mid;
      state.draft = { nickname: m.name || m.nickname || '', phone: m.phone || '', level: m.level, status: m.status || 'normal', registerType: m.registerType || 'self', channel: m.channel || 'H5', balance: m.balance || 0, points: m.points || 0, verifiedPhone: !!m.verifiedPhone };
      appendOverlays();
    });
    $root.on('click', '[data-action="freeze"]', function (e) {
      e.preventDefault(); state.confirmId = $(this).data('mid'); state.confirmAction = 'freeze'; appendOverlays();
    });
    $root.on('click', '[data-action="unfreeze"]', function (e) {
      e.preventDefault();
      Members.setStatus($(this).data('mid'), 'normal').then(function () {
        UI.toast('已恢复', 'success'); render();
      }).catch(function (e) { UI.toast(e.message || '操作失败', 'error'); });
    });
    $root.on('click', '[data-action="delete"]', function (e) {
      e.preventDefault(); state.confirmId = $(this).data('mid'); state.confirmAction = 'delete'; appendOverlays();
    });
  }

  function bindOverlays() {
    var $doc = $(document);
    $doc.off('.memberPage');
    $doc.on('input change.memberPage', '[data-field]', function () {
      var k = $(this).data('field');
      var v = k === 'verifiedPhone' ? this.checked : $(this).val();
      state.draft[k] = v;
    });
    $doc.on('change.memberPage', '[data-member-level]', function () {
      state.draft.level = $(this).val();
      $('[data-member-level]').each(function () {
        $(this).closest('.radio-card').toggleClass('is-active', this.checked);
      });
    });
    $doc.on('click.memberPage', '[data-action="close-editor"]', function (e) {
      e.preventDefault(); state.editorOpen = false; state.editorId = null; removeOverlays();
    });
    $doc.on('click.memberPage', '[data-action="save"]', function (e) {
      e.preventDefault(); saveMember();
    });
    $doc.on('click.memberPage', '[data-editor-overlay]', function (e) {
      if (e.target === this) { state.editorOpen = false; state.editorId = null; removeOverlays(); }
    });
    $doc.on('click.memberPage', '[data-action="cancel-confirm"]', function (e) {
      e.preventDefault(); state.confirmId = null; state.confirmAction = null; removeOverlays();
    });
    $doc.on('click.memberPage', '[data-action="confirm-confirm"]', function (e) {
      e.preventDefault();
      var mid = $(this).data('mid');
      var act = state.confirmAction;
      var promise;
      if (act === 'delete') promise = Members.remove(mid).then(function () { UI.toast('已删除', 'success'); });
      else if (act === 'freeze') promise = Members.setStatus(mid, 'frozen').then(function () { UI.toast('已冻结', 'success'); });
      else if (act === 'unfreeze') promise = Members.setStatus(mid, 'normal').then(function () { UI.toast('已恢复', 'success'); });
      else if (act === 'blacklist') promise = Members.setStatus(mid, 'blacklist').then(function () { UI.toast('已拉黑', 'success'); });
      else promise = Promise.resolve();
      promise.then(function () {
        state.confirmId = null; state.confirmAction = null; removeOverlays();
        // 操作后重新 ensure 拉最新全量
        Members.ensure(true).then(function () { render(); });
      }).catch(function (err) { UI.toast(err.message || '操作失败', 'error'); });
    });
    $doc.on('click.memberPage', '[data-confirm-overlay]', function (e) {
      if (e.target === this) { state.confirmId = null; state.confirmAction = null; removeOverlays(); }
    });
  }

  function saveMember() {
    var d = state.draft;
    if (!d.nickname.trim()) { UI.toast('请输入昵称', 'error'); return; }
    var payload = { name: d.nickname.trim(), nickname: d.nickname.trim(), phone: d.phone || '', verifiedPhone: !!d.verifiedPhone, balance: Number(d.balance) || 0, points: Number(d.points) || 0 };
    var promise;
    if (state.editorId) {
      promise = Members.update(state.editorId, payload).then(function () {
        if (d.level !== 'auto') return Members.setLevel(state.editorId, d.level);
      }).then(function () { UI.toast('已更新', 'success'); });
    } else {
      promise = Members.add(Object.assign({ status: d.status, registerType: d.registerType, channel: d.channel }, payload)).then(function () {
        UI.toast('已新增', 'success');
      });
    }
    promise.then(function () {
      state.editorOpen = false; state.editorId = null; removeOverlays();
      Members.ensure(true).then(function () { render(); });
    }).catch(function (e) { UI.toast(e.message || '保存失败', 'error'); });
  }

  $(function () {
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;
    UI.initTheme();
    Volta.AdminLayout.init();

    // 先从后端 API 拉会员数据（替换原来的 localStorage mock）
    Members.ensure().then(function () {
      render();
      bind($('#page-root'));
      bindOverlays();
    }).catch(function (e) {
      UI.toast('加载会员失败: ' + (e.message || e), 'error');
      render();  // 仍然渲染（空状态）
      bind($('#page-root'));
      bindOverlays();
    });
  });
})(window);