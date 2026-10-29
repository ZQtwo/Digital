/**
 * admins.js —— 管理员账号管理页（jQuery 版）
 * 仅 super 角色可访问。
 */
(function (global) {
  'use strict';
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var Admin = Volta.Admin;
  var Admins = Volta.Admins;
  var C = Volta.AdminComponents;

  var SELF_ID = null;

  var state = {
    q: '',
    roleFilter: [],
    statusFilter: [],
    page: 1,
    pageSize: 20,
    editorOpen: false,
    editorId: null,
    draft: emptyDraft(),
    dirty: false,
    resetPwdId: null,
    resetPwdDraft: { newPwd: '', confirmPwd: '' },
    confirmId: null,
    confirmAction: null,
    alert: null
  };

  function emptyDraft() {
    return { username: '', realname: '', phone: '', role: 'admin', status: 'active', password: '', confirmPwd: '' };
  }

  function roleLabel(code) { return Admins.ROLES[code] ? Admins.ROLES[code].label : code; }
  function roleTone(code) { return Admins.ROLES[code] ? Admins.ROLES[code].tone : 'muted'; }
  function roleBadgeHtml(code) {
    return '<span class="badge badge--' + roleTone(code) + ' badge--sm">' + roleLabel(code) + '</span>';
  }
  function statusLabel(code) { return Admins.STATUS[code] ? Admins.STATUS[code].label : code; }
  function statusTone(code) { return code === 'active' ? 'success' : 'muted'; }
  function statusBadgeHtml(code) {
    return '<span class="badge badge--' + statusTone(code) + ' badge--sm">' + statusLabel(code) + '</span>';
  }

  function filtered() {
    var kw = state.q.trim().toLowerCase();
    return Admins.list().filter(function (a) {
      if (kw) {
        var hay = (a.username + ' ' + (a.realname || '') + ' ' + (a.phone || '')).toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      if (state.roleFilter.length && state.roleFilter.indexOf(a.role) === -1) return false;
      if (state.statusFilter.length && state.statusFilter.indexOf(a.status) === -1) return false;
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
    var s = Admins.stats();
    return '<header class="admin-head">'
      + '<div class="admin-head__text">'
        + '<span class="eyebrow">ADMINS</span>'
        + '<h1 class="display-3">管理员账号</h1>'
        + '<p class="lede" style="font-size: var(--fs-sm)">共 ' + s.total + ' 个账号。'
        + ' 超级管理员拥有全部权限，普通管理员负责日常运营。</p>'
      + '</div>'
      + '<div>' + C.CsvButton.render({ id: 'admins', label: '导出 CSV' }) + '</div>'
    + '</header>';
  }

  function renderStats() {
    var s = Admins.stats();
    return '<div class="stat-grid">'
      + '<div class="stat-card"><span class="stat-card__label">账号总数</span>'
        + '<span class="stat-card__value">' + s.total + '<span class="stat-card__unit">个</span></span></div>'
      + '<div class="stat-card stat-card--accent"><span class="stat-card__label">超级管理员</span>'
        + '<span class="stat-card__value">' + s.superCount + '<span class="stat-card__unit">人</span></span></div>'
      + '<div class="stat-card stat-card--info"><span class="stat-card__label">普通管理员</span>'
        + '<span class="stat-card__value">' + s.adminCount + '<span class="stat-card__unit">人</span></span></div>'
      + '<div class="stat-card stat-card--danger"><span class="stat-card__label">已禁用</span>'
        + '<span class="stat-card__value">' + s.disabledCount + '<span class="stat-card__unit">个</span></span></div>'
    + '</div>';
  }

  function renderToolbar() {
    var roleOpts = Object.keys(Admins.ROLES).map(function (code) {
      return { value: code, label: roleLabel(code), count: Admins.stats()[code === 'super' ? 'superCount' : 'adminCount'] || 0 };
    });
    var statusOpts = Object.keys(Admins.STATUS).map(function (code) {
      return { value: code, label: statusLabel(code) };
    });
    return '<div class="admin-toolbar">'
      + '<div class="admin-search">'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
        + '<input class="input" type="search" placeholder="搜索用户名 / 姓名 / 手机号" value="' + escapeAttr(state.q) + '" data-admin-search>'
      + '</div>'
      + C.MultiSelect.render({ label: '角色', placeholder: '全部角色', options: roleOpts, selected: state.roleFilter })
      + C.MultiSelect.render({ label: '状态', placeholder: '全部状态', options: statusOpts, selected: state.statusFilter })
      + '<button type="button" class="btn btn--primary btn--sm" data-action="new-admin" style="display:inline-flex;align-items:center;gap:6px">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
        + '新增管理员'
      + '</button>'
    + '</div>';
  }

  function renderTable() {
    var rows = paged();
    if (!rows.length) {
      return C.EmptyState.render({ icon: 'user', title: '没有匹配的账号', desc: '试试放宽筛选条件' });
    }
    var body = rows.map(function (a) { return renderRow(a); }).join('');
    return '<div class="admin-table-wrap">'
      + '<table class="admin-table">'
        + '<thead><tr>'
          + '<th>管理员</th>'
          + '<th>角色</th>'
          + '<th>状态</th>'
          + '<th style="text-align:right">登录次数</th>'
          + '<th>最后登录</th>'
          + '<th>创建时间</th>'
          + '<th>操作</th>'
        + '</tr></thead>'
        + '<tbody>' + body + '</tbody>'
      + '</table></div>';
  }

  function renderRow(a) {
    var isSelf = a.id === SELF_ID;
    var isSuper = a.role === 'super';
    var canDisable = !isSelf && !isSuper;
    var canDelete = !isSelf && !isSuper;
    var canDowngrade = !(isSelf && a.role === 'super');
    return '<tr data-aid="' + a.id + '">'
      + '<td>'
        + '<div style="font-weight:500">' + escapeHtml(a.realname || a.username) + '</div>'
        + '<div class="admin-table__sku">' + a.username + ' · ' + a.id + '</div>'
      + '</td>'
      + '<td>' + roleBadgeHtml(a.role) + (isSelf ? ' <span class="admin-table__sku">当前</span>' : '') + '</td>'
      + '<td>' + statusBadgeHtml(a.status) + '</td>'
      + '<td class="num">' + a.loginCount + '</td>'
      + '<td><span class="mono" style="font-size: var(--fs-xs)">' + (a.lastLoginAt ? F.formatDateTime(a.lastLoginAt) : '\u2014') + '</span></td>'
      + '<td><span class="mono" style="font-size: var(--fs-xs)">' + F.formatDateTime(a.createdAt) + '</span></td>'
      + '<td><div style="display:flex; gap:var(--sp-2); flex-wrap:wrap">'
        + '<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-aid="' + a.id + '">编辑</button>'
        + '<button type="button" class="btn btn--ghost btn--sm" data-action="reset-pwd" data-aid="' + a.id + '">重置密码</button>'
        + (canDisable
          ? '<button type="button" class="btn btn--ghost btn--sm" data-action="' + (a.status === 'active' ? 'disable' : 'enable') + '" data-aid="' + a.id + '">' + (a.status === 'active' ? '禁用' : '启用') + '</button>'
          : '')
        + (canDelete
          ? '<button type="button" class="btn btn--ghost btn--sm" style="color: var(--c-danger)" data-action="delete" data-aid="' + a.id + '">删除</button>'
          : '')
      + '</div></td>'
    + '</tr>';
  }

  function renderCards() {
    var rows = paged();
    if (!rows.length) return '';
    var items = rows.map(function (a) {
      var isSelf = a.id === SELF_ID;
      var isSuper = a.role === 'super';
      var canDisable = !isSelf && !isSuper;
      var canDelete = !isSelf && !isSuper;
      return '<article class="admin-card" data-aid="' + a.id + '">'
        + '<div class="admin-card__head">'
          + '<div>'
            + '<div class="admin-card__name">' + escapeHtml(a.realname || a.username) + '</div>'
            + '<div class="admin-card__id">' + a.username + ' · ' + a.id + (isSelf ? ' · 当前' : '') + '</div>'
          + '</div>'
          + roleBadgeHtml(a.role)
        + '</div>'
        + '<dl class="admin-card__meta">'
          + '<dt>状态</dt><dd>' + statusBadgeHtml(a.status) + '</dd>'
          + '<dt>登录次数</dt><dd>' + a.loginCount + '</dd>'
          + '<dt>最后登录</dt><dd>' + (a.lastLoginAt ? F.formatDate(a.lastLoginAt) : '\u2014') + '</dd>'
          + '<dt>创建</dt><dd>' + F.formatDate(a.createdAt) + '</dd>'
        + '</dl>'
        + '<div class="admin-card__actions">'
          + '<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-aid="' + a.id + '">编辑</button>'
          + '<button type="button" class="btn btn--ghost btn--sm" data-action="reset-pwd" data-aid="' + a.id + '">重置密码</button>'
          + (canDisable
            ? '<button type="button" class="btn btn--ghost btn--sm" data-action="' + (a.status === 'active' ? 'disable' : 'enable') + '" data-aid="' + a.id + '">' + (a.status === 'active' ? '禁用' : '启用') + '</button>'
            : '')
          + (canDelete
            ? '<button type="button" class="btn btn--ghost btn--sm" style="color: var(--c-danger)" data-action="delete" data-aid="' + a.id + '">删除</button>'
            : '')
        + '</div>'
      + '</article>';
    }).join('');
    return '<div class="admin-cards">' + items + '</div>';
  }

  function renderFoot() {
    var list = filtered();
    if (!list.length) return '';
    return '<div class="admin-table-foot">'
      + '<span class="admin-table-foot__info">共 ' + list.length + ' 条 · 第 ' + state.page + ' / ' + pageCount() + ' 页</span>'
      + C.Pagination.render({ page: state.page, pageCount: pageCount(), total: list.length, pageSize: state.pageSize })
    + '</div>';
  }

  function renderEditor() {
    if (!state.editorOpen) return '';
    var d = state.draft;
    var isEdit = !!state.editorId;
    var a = isEdit ? Admins.get(state.editorId) : null;
    var title = isEdit ? '编辑账号 ' + (a ? (a.realname || a.username) : state.editorId) : '新建管理员';
    var submitText = isEdit ? '保存' : '创建';
    var isSelfEdit = isEdit && state.editorId === SELF_ID;
    var roleOptions = Object.keys(Admins.ROLES).map(function (code) {
      var meta = Admins.ROLES[code];
      var disabledAttr = (isSelfEdit && code === 'super' && a.role !== 'super') ? ' disabled' : '';
      return '<label class="radio-card' + (d.role === code ? ' is-active' : '') + '">'
        + '<input type="radio" name="admin-role" value="' + code + '"' + (d.role === code ? ' checked' : '') + ' data-field="role" data-role-radio"' + disabledAttr + '>'
        + '<span>' + meta.label + '</span>'
      + '</label>';
    }).join('');

    var statusOptions = Object.keys(Admins.STATUS).map(function (code) {
      return '<option value="' + code + '"' + (d.status === code ? ' selected' : '') + '>' + Admins.STATUS[code].label + '</option>';
    }).join('');

    var newPwdField = !isEdit
      ? '<div class="field"><label class="field__label">初始密码</label>'
          + '<input class="field__input" type="password" data-field="password" value="' + escapeAttr(d.password) + '" placeholder="6~20 位，含大小写字母、数字、特殊符号">'
          + '<p class="admin-editor__hint">密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号（如 Zxy@13182796613）。</p></div>'
      : '';

    return '<div class="admin-drawer" data-editor-overlay>'
      + '<div class="admin-drawer__panel">'
        + '<div class="admin-drawer__head">'
          + '<div><span class="eyebrow">ADMIN FORM</span>'
            + '<h2 class="display-3" style="margin-top:4px">' + title + '</h2></div>'
          + '<button type="button" class="icon-btn" aria-label="关闭" data-action="close-editor">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
          + '</button>'
        + '</div>'
        + '<div class="admin-editor">'
          + '<div class="field"><label class="field__label">用户名</label>'
            + '<input class="field__input" type="text" data-field="username" value="' + escapeAttr(d.username) + '" placeholder="字母数字下划线，2-20 位"'
            + (isEdit ? ' disabled' : '') + '></div>'
          + '<div class="field"><label class="field__label">真实姓名</label>'
            + '<input class="field__input" type="text" data-field="realname" value="' + escapeAttr(d.realname) + '" placeholder="姓名或昵称"></div>'
          + '<div class="field"><label class="field__label">手机号</label>'
            + '<input class="field__input" type="tel" data-field="phone" value="' + escapeAttr(d.phone) + '" placeholder="11 位手机号（必填）" maxlength="11"></div>'
          + '<div class="field"><label class="field__label">角色</label>'
            + '<div class="radio-row">' + roleOptions + '</div>'
            + '<p class="admin-editor__hint">超级管理员可管理所有账号；普通管理员负责日常运营。</p></div>'
          + '<div class="field"><label class="field__label">状态</label>'
            + '<select class="field__select" data-field="status">' + statusOptions + '</select></div>'
          + newPwdField
        + '</div>'
        + '<div class="admin-editor__actions">'
          + '<button type="button" class="btn btn--primary" data-action="save-admin">' + submitText + '</button>'
          + '<button type="button" class="btn btn--ghost" data-action="close-editor">取消</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  function renderResetPwd() {
    if (!state.resetPwdId) return '';
    var a = Admins.get(state.resetPwdId);
    if (!a) { state.resetPwdId = null; return ''; }
    return '<div class="admin-drawer" data-resetpwd-overlay>'
      + '<div class="admin-drawer__panel">'
        + '<div class="admin-drawer__head">'
          + '<div><span class="eyebrow">RESET PASSWORD</span>'
            + '<h2 class="display-3" style="margin-top:4px">重置密码 · ' + escapeHtml(a.realname || a.username) + '</h2></div>'
          + '<button type="button" class="icon-btn" aria-label="关闭" data-action="close-resetpwd">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
          + '</button>'
        + '</div>'
        + '<div class="admin-editor">'
          + '<div class="field"><label class="field__label">新密码（至少 6 位）</label>'
            + '<input class="field__input" type="password" data-rp="newPwd" value="' + escapeAttr(state.resetPwdDraft.newPwd) + '" placeholder="输入新密码"></div>'
          + '<div class="field"><label class="field__label">确认新密码</label>'
            + '<input class="field__input" type="password" data-rp="confirmPwd" value="' + escapeAttr(state.resetPwdDraft.confirmPwd) + '" placeholder="再次输入"></div>'
        + '</div>'
        + '<div class="admin-editor__actions">'
          + '<button type="button" class="btn btn--primary" data-action="confirm-resetpwd">确认重置</button>'
          + '<button type="button" class="btn btn--ghost" data-action="close-resetpwd">取消</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  function renderConfirm() {
    if (!state.confirmId) return '';
    var a = Admins.get(state.confirmId);
    if (!a) { state.confirmId = null; return ''; }
    var isDelete = state.confirmAction === 'delete';
    var title = isDelete ? '删除账号？' : '禁用账号？';
    var desc = isDelete
      ? '即将删除账号「' + escapeHtml(a.username) + '」（' + escapeHtml(a.realname || a.username) + '）。此操作不可撤销。'
      : '即将禁用账号「' + escapeHtml(a.username) + '」，对方将无法登录后台。可随时重新启用。';
    var btnHtml = isDelete
      ? '<button type="button" class="btn" style="background: var(--c-danger); color: #fff; border-color: var(--c-danger)" data-action="confirm-confirm" data-aid="' + a.id + '">确认' + (isDelete ? '删除' : '禁用') + '</button>'
      : '<button type="button" class="btn btn--primary" data-action="confirm-confirm" data-aid="' + a.id + '">确认' + (isDelete ? '删除' : '禁用') + '</button>';
    return '<div class="confirm-modal" data-confirm-overlay>'
      + '<div class="confirm-modal__card">'
        + '<div class="confirm-modal__title">' + title + '</div>'
        + '<p class="confirm-modal__desc">' + desc + '</p>'
        + '<div class="confirm-modal__actions">'
          + '<button type="button" class="btn btn--ghost" data-action="cancel-confirm">取消</button>'
          + btnHtml
        + '</div>'
      + '</div>'
    + '</div>';
  }

  function renderAlert() {
    if (!state.alert) return '';
    return '<div class="confirm-modal" data-alert-overlay>'
      + '<div class="confirm-modal__card">'
        + '<div class="confirm-modal__title">' + escapeHtml(state.alert.title || '提示') + '</div>'
        + '<p class="confirm-modal__desc">' + escapeHtml(state.alert.message || '') + '</p>'
        + '<div class="confirm-modal__actions">'
          + '<button type="button" class="btn btn--primary" data-action="close-alert">知道了</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  function appendOverlays() {
    removeOverlays();
    $('body').append(renderEditor() + renderResetPwd() + renderConfirm() + renderAlert());
  }

  function removeOverlays() {
    $('[data-editor-overlay], [data-resetpwd-overlay], [data-confirm-overlay], [data-alert-overlay]').remove();
  }

  function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function bind($root) {
    $root.on('input', '[data-admin-search]', function () {
      state.q = $(this).val();
    });
    $root.on('keydown', '[data-admin-search]', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.page = 1;
        render();
      }
    });

    C.MultiSelect.bind($root, function (selected, $wrap, info) {
      if (info.confirm) {
        var label = $wrap.find('.ms__trigger-label').text();
        if (label === '角色') state.roleFilter = selected;
        if (label === '状态') state.statusFilter = selected;
        state.page = 1;
        render();
      }
    });

    C.CsvButton.bind($root, function () {
      var list = filtered();
      if (!list.length) return null;
      return {
        filename: 'VOLTA管理员_' + Volta.AdminCsv.dateStamp() + '.csv',
        header: ['管理员ID', '用户名', '真实姓名', '角色', '状态', '手机号', '登录次数', '最后登录', '创建时间'],
        rows: list.map(function (a) {
          return [a.id, a.username, a.realname || '', roleLabel(a.role), statusLabel(a.status), a.phone || '',
            a.loginCount || 0,
            a.lastLoginAt ? Volta.AdminCsv.formatStamp(a.lastLoginAt) : '',
            Volta.AdminCsv.formatStamp(a.createdAt)];
        })
      };
    });

    C.Pagination.bind($root, function (p) {
      state.page = p;
      render();
    });

    $root.on('click', '[data-action="new-admin"]', function (e) {
      e.preventDefault();
      state.editorOpen = true;
      state.editorId = null;
      state.draft = emptyDraft();
      state.dirty = false;
      appendOverlays();
    });

    $root.on('click', '[data-action="edit"]', function (e) {
      e.preventDefault();
      var aid = $(this).data('aid');
      var a = Admins.get(aid);
      if (!a) { UI.toast('账号不存在', 'error'); return; }
      state.editorOpen = true;
      state.editorId = aid;
      state.draft = {
        username: a.username, realname: a.realname || '', phone: a.phone || '',
        role: a.role, status: a.status, password: '', confirmPwd: ''
      };
      state.dirty = false;
      appendOverlays();
    });

    $root.on('click', '[data-action="reset-pwd"]', function (e) {
      e.preventDefault();
      var aid = $(this).data('aid');
      var a = Admins.get(aid);
      if (!a) { UI.toast('账号不存在', 'error'); return; }
      state.resetPwdId = aid;
      state.resetPwdDraft = { newPwd: '', confirmPwd: '' };
      appendOverlays();
    });

    $root.on('click', '[data-action="disable"], [data-action="enable"]', function (e) {
      e.preventDefault();
      var aid = $(this).data('aid');
      state.confirmId = aid;
      state.confirmAction = $(this).data('action') === 'disable' ? 'disable' : 'enable';
      appendOverlays();
    });

    $root.on('click', '[data-action="delete"]', function (e) {
      e.preventDefault();
      var aid = $(this).data('aid');
      state.confirmId = aid;
      state.confirmAction = 'delete';
      appendOverlays();
    });
  }

  function bindOverlays() {
    var $doc = $(document);

    $doc.on('click.voltaAdminOverlay', '[data-action="close-editor"]', function (e) {
      e.preventDefault();
      state.editorOpen = false;
      removeOverlays();
    });
    $doc.on('click.voltaAdminOverlay', '[data-action="save-admin"]', function (e) {
      e.preventDefault();
      saveAdmin();
    });
    $doc.on('click.voltaAdminOverlay', '[data-editor-overlay]', function (e) {
      if (e.target === this) { state.editorOpen = false; removeOverlays(); }
    });

    $doc.on('input change.voltaAdminOverlay', '[data-field="username"], [data-field="realname"], [data-field="phone"], [data-field="password"], [data-field="confirmPwd"]', function () {
      var key = $(this).data('field');
      state.draft[key] = $(this).val();
      state.dirty = true;
    });
    $doc.on('change.voltaAdminOverlay', '[data-field="status"]', function () {
      state.draft.status = $(this).val();
      state.dirty = true;
    });
    $doc.on('change.voltaAdminOverlay', '[data-role-radio]', function () {
      state.draft.role = $(this).val();
      state.dirty = true;
      $('[data-role-radio]').each(function () {
        var $label = $(this).closest('.radio-card');
        $label.toggleClass('is-active', this.checked);
      });
    });

    $doc.on('input change.voltaAdminOverlay', '[data-rp]', function () {
      state.resetPwdDraft[$(this).data('rp')] = $(this).val();
    });
    $doc.on('click.voltaAdminOverlay', '[data-action="close-resetpwd"]', function (e) {
      e.preventDefault();
      state.resetPwdId = null;
      removeOverlays();
    });
    $doc.on('click.voltaAdminOverlay', '[data-action="confirm-resetpwd"]', function (e) {
      e.preventDefault();
      var d = state.resetPwdDraft;
      // 【需求15】密码复杂度：6~20 字符，含大小写字母 + 数字 + 特殊符号（后端同样校验）
      var PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,20}$/;
      if (!PWD_RE.test(d.newPwd)) { UI.toast('密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号', 'error', 3500); return; }
      if (d.newPwd !== d.confirmPwd) { UI.toast('两次密码不一致', 'error', 2000); return; }
      Admins.resetPwdViaApi(state.resetPwdId, d.newPwd).then(function (res) {
        if (!res.ok) { UI.toast(res.message || '重置失败', 'error', 2500); return; }
        UI.toast('密码已重置', 'success');
        state.resetPwdId = null;
        removeOverlays();
      });
    });
    $doc.on('click.voltaAdminOverlay', '[data-resetpwd-overlay]', function (e) {
      if (e.target === this) { state.resetPwdId = null; removeOverlays(); }
    });

    $doc.on('click.voltaAdminOverlay', '[data-action="cancel-confirm"]', function (e) {
      e.preventDefault();
      state.confirmId = null;
      state.confirmAction = null;
      removeOverlays();
    });
    $doc.on('click.voltaAdminOverlay', '[data-action="confirm-confirm"]', function (e) {
      e.preventDefault();
      var aid = $(this).data('aid');
      var a = Admins.get(aid);
      if (!a) { state.confirmId = null; removeOverlays(); return; }
      if (state.confirmAction === 'delete') {
        if (aid === SELF_ID) { UI.toast('不能删除自己', 'error'); return; }
        Admins.removeViaApi(aid, SELF_ID).then(function (res) {
          if (!res.ok) { UI.toast(res.message || '删除失败', 'error'); return; }
          UI.toast('账号已删除', 'success');
          render();
        });
      } else if (state.confirmAction === 'disable') {
        Admins.setStatusViaApi(aid, 'disabled').then(function (res) {
          if (!res.ok) { UI.toast(res.message || '操作失败', 'error'); return; }
          UI.toast('账号已禁用', 'success');
          render();
        });
      } else if (state.confirmAction === 'enable') {
        Admins.setStatusViaApi(aid, 'active').then(function (res) {
          if (!res.ok) { UI.toast(res.message || '操作失败', 'error'); return; }
          UI.toast('账号已启用', 'success');
          render();
        });
      }
      state.confirmId = null;
      state.confirmAction = null;
      removeOverlays();
    });
    $doc.on('click.voltaAdminOverlay', '[data-confirm-overlay]', function (e) {
      if (e.target === this) { state.confirmId = null; removeOverlays(); }
    });

    $doc.on('click.voltaAdminOverlay', '[data-action="close-alert"]', function (e) {
      e.preventDefault();
      state.alert = null;
      removeOverlays();
    });
    $doc.on('click.voltaAdminOverlay', '[data-alert-overlay]', function (e) {
      if (e.target === this) { state.alert = null; removeOverlays(); }
    });
  }

  function saveAdmin() {
    var d = state.draft;
    var username = String(d.username || '').trim();
    var realname = String(d.realname || '').trim();
    var phone = String(d.phone || '').trim();
    if (!username) { UI.toast('请输入用户名', 'error', 2000); return; }
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]{2,20}$/.test(username)) { UI.toast('用户名 2-20 位中/英/数字/下划线', 'error', 2500); return; }
    // 【需求16】手机号格式统一：1 开头第二位 3-9 共 11 位
    if (!/^1[3-9]\d{9}$/.test(phone)) { UI.toast('手机号格式不正确（1 开头 11 位数字）', 'error', 2500); return; }

    if (state.editorId) {
      Admins.updateViaApi(state.editorId, {
        realname: realname, phone: phone, role: d.role
      }).then(function (res) {
        if (!res.ok) { UI.toast(res.message || '更新失败', 'error', 2500); return; }
        UI.toast('账号已更新', 'success', 2000);
        state.editorOpen = false;
        state.editorId = null;
        state.dirty = false;
        removeOverlays();
        render();
      });
    } else {
      // 【需求15】初始密码复杂度：6~20 字符，含大小写字母 + 数字 + 特殊符号（后端同样校验）
      var PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,20}$/;
      if (!PWD_RE.test(d.password)) { UI.toast('密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号', 'error', 3500); return; }
      Admins.addViaApi({
        username: username, password: d.password,
        realname: realname || username, phone: phone, role: d.role
      }).then(function (res) {
        if (!res.ok) { UI.toast(res.message || '创建失败', 'error', 2500); return; }
        UI.toast('新账号已创建（ID: ' + (res.id || '?') + '）', 'success', 2000);
        state.editorOpen = false;
        state.editorId = null;
        state.dirty = false;
        removeOverlays();
        render();
      });
    }
  }

  $(function () {
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;
    if (!Volta.AdminAuth.requireSuper()) return;
    SELF_ID = Admin.currentId();
    UI.initTheme();
    Volta.AdminLayout.init();
    render();
    bind($('#page-root'));
    bindOverlays();
    // 【需求17】绑定管理员数据表（ssc_guanliyuan）：拉取 DB 数据后重渲染
    Admins.fetchAll().then(function () {
      render();
      setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
    }).catch(function (e) { console.warn('[admins] DB 拉取失败，展示本地数据:', e.message); });
  });
})(window);
