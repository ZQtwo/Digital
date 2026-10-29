/**
 * settings.js —— 系统设置页（jQuery 版）
 * 分区：站点信息 / 界面偏好 / 通知开关 / 密码修改 / 数据管理 / 关于。
 * 持久化到 volta.settings LS 键，主题+日期格式即时生效。
 */
(function (global) {
  'use strict';
  var $ = global.jQuery;
  var Volta = global.Volta;
  var UI = Volta.UI;
  var Storage = Volta.Storage;
  var SETTINGS_KEY = 'volta.settings';

  var DEFAULTS = {
    siteName: 'VOLTA 数码商城',
    siteSubtitle: '精选数码 · 极速送达',
    defaultTheme: 'dark',
    dateFormat: 'YYYY-MM-DD',
    currency: '¥',
    orderNotify: true,
    alertThreshold: 20,
    updatedAt: null
  };

  var CURRENCY_OPTIONS = [
    { v: '¥', l: '¥ 人民币' },
    { v: '$', l: '$ 美元' },
    { v: '€', l: '€ 欧元' },
    { v: '£', l: '£ 英镑' }
  ];

  var DATE_FORMATS = [
    { v: 'YYYY-MM-DD', l: '2026-10-07', full: '2026-10-07 14:30' },
    { v: 'DD/MM/YYYY', l: '07/10/2026', full: '07/10/2026 14:30' },
    { v: 'MM-DD-YYYY', l: '10-07-2026', full: '10-07-2026 14:30' }
  ];

  var state = {
    siteName: '', siteSubtitle: '', defaultTheme: 'dark',
    dateFormat: 'YYYY-MM-DD', currency: '¥',
    orderNotify: true, alertThreshold: 20,
    touched: false,
    // 密码修改
    pwdCurrent: '', pwdNew: '', pwdConfirm: '',
    // 【需求14】最后一次设置操作（来自管理员数据表）
    lastSettingBy: null, lastSettingAction: null, lastSettingAt: null,
    saving: false
  };

  // —— 懒读 store 引用，避免脚本顺序问题 ——
  function Stores() { return Volta; }

  /** 【需求15】密码复杂度：6~20 字符，含大小写字母 + 数字 + 特殊符号 */
  var PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,20}$/;

  /** 【需求14】从后端 API 拉取系统设置（绑定 ssc_shezhi + 管理员表操作记录） */
  function fetchSettings() {
    var token = Volta.Admin && Volta.Admin.getToken();
    if (!token) return Promise.resolve();
    return fetch('/shuma/api/admin/settings', {
      headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token }
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (json.code === 0 && json.data) applyData(json.data);
    }).catch(function () {});
  }

  /** 用 API 数据覆盖 state */
  function applyData(d) {
    state.siteName = d.siteName != null ? d.siteName : DEFAULTS.siteName;
    state.siteSubtitle = d.siteSubtitle != null ? d.siteSubtitle : DEFAULTS.siteSubtitle;
    state.defaultTheme = d.defaultTheme != null ? d.defaultTheme : DEFAULTS.defaultTheme;
    state.dateFormat = d.dateFormat != null ? d.dateFormat : DEFAULTS.dateFormat;
    state.currency = d.currency != null ? d.currency : DEFAULTS.currency;
    state.orderNotify = d.orderNotify != null ? !!d.orderNotify : DEFAULTS.orderNotify;
    state.alertThreshold = d.alertThreshold != null ? Number(d.alertThreshold) : DEFAULTS.alertThreshold;
    state.lastSettingBy = d.lastSettingBy || null;
    state.lastSettingAction = d.lastSettingAction || null;
    state.lastSettingAt = d.lastSettingAt || null;
    state.touched = false;
    state.pwdCurrent = ''; state.pwdNew = ''; state.pwdConfirm = '';
  }

  function loadFromStore() {
    var s = Storage.readLS(SETTINGS_KEY, null) || {};
    state.siteName = s.siteName != null ? s.siteName : DEFAULTS.siteName;
    state.siteSubtitle = s.siteSubtitle != null ? s.siteSubtitle : DEFAULTS.siteSubtitle;
    state.defaultTheme = s.defaultTheme != null ? s.defaultTheme : DEFAULTS.defaultTheme;
    state.dateFormat = s.dateFormat != null ? s.dateFormat : DEFAULTS.dateFormat;
    state.currency = s.currency != null ? s.currency : DEFAULTS.currency;
    state.orderNotify = s.orderNotify != null ? s.orderNotify : DEFAULTS.orderNotify;
    state.alertThreshold = s.alertThreshold != null ? Number(s.alertThreshold) : DEFAULTS.alertThreshold;
    state.touched = false;
    state.pwdCurrent = ''; state.pwdNew = ''; state.pwdConfirm = '';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function errorIf(cond, msg) { return cond ? '<p class="field__error">' + msg + '</p>' : ''; }

  function validate() {
    var errs = {};
    if (state.touched) {
      if (!state.siteName.trim()) errs.siteName = '站点名不能为空';
      var t = Number(state.alertThreshold);
      if (!isFinite(t) || t < 1 || t > 1000) errs.alertThreshold = '阈值需为 1–1000';
    }
    return errs;
  }

  function validatePassword() {
    var errs = {};
    if (!state.pwdCurrent) errs.pwdCurrent = '请输入当前密码';
    // 【需求15】6~20 字符，必须含大小写字母、数字、特殊符号
    if (!state.pwdNew) errs.pwdNew = '请输入新密码';
    else if (!PWD_RE.test(state.pwdNew)) errs.pwdNew = '密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号';
    if (state.pwdNew !== state.pwdConfirm) errs.pwdConfirm = '两次输入的新密码不一致';
    if (state.pwdCurrent && state.pwdNew && state.pwdCurrent === state.pwdNew) errs.pwdNew = '新密码不能与当前密码相同';
    return errs;
  }

  /* ------------------------------ 渲染 ------------------------------ */
  function render() {
    var errs = validate();
    var lastInfo = state.lastSettingBy
      ? '<p class="lede" style="font-size: var(--fs-xs); color: var(--c-muted); margin-top: 2px">最近设置：'
        + esc(state.lastSettingBy)
        + (state.lastSettingAction ? ' · ' + esc(state.lastSettingAction) : '')
        + (state.lastSettingAt ? ' · ' + esc(state.lastSettingAt) : '')
      + '</p>'
      : '<p class="lede" style="font-size: var(--fs-xs); color: var(--c-muted); margin-top: 2px">最近设置：暂无记录（保存后写入管理员数据表）</p>';
    var html = '<div class="admin-head"><div class="admin-head__text">'
      + '<span class="eyebrow">SYSTEM</span>'
      + '<h1 class="display-3">系统设置</h1>'
      + '<p class="lede" style="font-size: var(--fs-sm)">配置站点基础信息、运营参数与安全设置。</p>'
      + lastInfo
    + '</div></div>';

    html += '<div class="settings-form">'

      // ===== 1. 站点信息 =====
      + '<section class="chart-card">'
        + '<div class="chart-card__head"><div><span class="eyebrow">SITE</span>'
          + '<h2 class="display-3" style="margin-top:4px">站点信息</h2></div></div>'
        + '<div class="settings-form__grid">'
          + '<div class="field"><label class="field__label">站点名称</label>'
            + '<input class="field__input" type="text" data-field="siteName" value="' + esc(state.siteName) + '">'
            + errorIf(errs.siteName, errs.siteName) + '</div>'
          + '<div class="field"><label class="field__label">副标题</label>'
            + '<input class="field__input" type="text" data-field="siteSubtitle" value="' + esc(state.siteSubtitle) + '"></div>'
        + '</div>'
      + '</section>'

      // ===== 2. 界面偏好 =====
      + '<section class="chart-card">'
        + '<div class="chart-card__head"><div><span class="eyebrow">APPEARANCE</span>'
          + '<h2 class="display-3" style="margin-top:4px">界面偏好</h2></div></div>'
        + '<div class="settings-form__grid">'

          // 默认主题（即时预览）
          + '<div class="field"><label class="field__label">默认主题</label>'
            + '<div class="radio-row">'
              + '<label class="radio-card' + (state.defaultTheme === 'dark' ? ' is-active' : '') + '">'
                + '<input type="radio" name="setting-theme" value="dark"' + (state.defaultTheme === 'dark' ? ' checked' : '') + ' data-field="defaultTheme" data-theme-radio>'
                + '<span>深色</span></label>'
              + '<label class="radio-card' + (state.defaultTheme === 'light' ? ' is-active' : '') + '">'
                + '<input type="radio" name="setting-theme" value="light"' + (state.defaultTheme === 'light' ? ' checked' : '') + ' data-field="defaultTheme" data-theme-radio>'
                + '<span>浅色</span></label>'
            + '</div>'
            + '<p class="admin-note" style="margin-top: var(--sp-2)">选择可即时预览，设置保存后新浏览器打开时生效。</p></div>'

          // 日期格式（即时预览）
          + '<div class="field"><label class="field__label">日期格式</label>'
            + '<div class="radio-row">'
              + DATE_FORMATS.map(function (f) {
                  return '<label class="radio-card' + (state.dateFormat === f.v ? ' is-active' : '') + '">'
                    + '<input type="radio" name="setting-datefmt" value="' + f.v + '"' + (state.dateFormat === f.v ? ' checked' : '') + ' data-field="dateFormat" data-datefmt-radio>'
                    + '<span>' + f.l + '</span></label>';
                }).join('')
            + '</div>'
            + '<p class="admin-note" style="margin-top: var(--sp-2)">选择后可即时预览。全局日期/时间显示将使用此格式。</p></div>'

          // 货币符号
          + '<div class="field"><label class="field__label">货币符号</label>'
            + '<select class="field__select" data-field="currency">'
              + CURRENCY_OPTIONS.map(function (c) {
                  return '<option value="' + c.v + '"' + (state.currency === c.v ? ' selected' : '') + '>' + c.l + '</option>';
                }).join('')
            + '</select></div>'

          // 库存预警阈值
          + '<div class="field"><label class="field__label">库存预警阈值</label>'
            + '<input class="field__input" type="number" min="1" max="1000" step="1" data-field="alertThreshold" value="' + esc(String(state.alertThreshold)) + '">'
            + errorIf(errs.alertThreshold, errs.alertThreshold)
            + '<p class="admin-note" style="margin-top: var(--sp-2)">低于此件数的商品会在主面板标红。</p></div>'
        + '</div>'
      + '</section>'

      // ===== 3. 通知开关 =====
      + '<section class="chart-card">'
        + '<div class="chart-card__head"><div><span class="eyebrow">NOTIFY</span>'
          + '<h2 class="display-3" style="margin-top:4px">通知开关</h2></div></div>'
        + '<div class="settings-form__toggleRow">'
          + '<div><div class="settings-form__toggleTitle">新订单通知</div>'
            + '<div class="admin-table__sku">有新订单时在主面板顶部弹出提示</div></div>'
          + '<label class="switch">'
            + '<input type="checkbox" data-field="orderNotify"' + (state.orderNotify ? ' checked' : '') + '>'
            + '<span class="switch__track" aria-hidden="true"></span>'
          + '</label>'
        + '</div>'
      + '</section>'

      // ===== 4. 密码修改 =====
      + renderPasswordSection()

      // ===== 5. 数据管理 =====
      + renderDataSection()

      // ===== 6. 关于 =====
      + renderAboutSection()

      // 主保存按钮
      + '<div class="settings-form__actions">'
        + '<button type="button" class="btn btn--primary" data-action="save">保存设置</button>'
        + '<button type="button" class="btn btn--ghost" data-action="reset">恢复默认</button>'
      + '</div>'
    + '</div>';

    $('#page-root').html(html);
    bind($('#page-root'));
  }

  function renderPasswordSection() {
    var admin = Volta.Admin || {};
    var isMock = admin.currentPassword && admin.currentPassword() === 'admin';
    var pwdErr = validatePassword();
    return '<section class="chart-card">'
      + '<div class="chart-card__head"><div><span class="eyebrow">SECURITY</span>'
        + '<h2 class="display-3" style="margin-top:4px">修改密码</h2></div></div>'
      + '<div class="settings-password">'
        + '<div class="settings-form__grid">'
          + '<div class="field"><label class="field__label">当前密码</label>'
            + '<input class="field__input" type="password" data-field="pwdCurrent" placeholder="请输入当前密码">'
            + errorIf(pwdErr.pwdCurrent, pwdErr.pwdCurrent) + '</div>'
          + '<div class="field"><label class="field__label">新密码</label>'
            + '<input class="field__input" type="password" data-field="pwdNew" placeholder="6~20 位，含大小写字母、数字、特殊符号">'
            + errorIf(pwdErr.pwdNew, pwdErr.pwdNew) + '</div>'
          + '<div class="field"><label class="field__label">确认新密码</label>'
            + '<input class="field__input" type="password" data-field="pwdConfirm" placeholder="再次输入新密码">'
            + errorIf(pwdErr.pwdConfirm, pwdErr.pwdConfirm) + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:var(--sp-2);align-items:center">'
          + '<button type="button" class="btn btn--primary btn--sm" data-action="save-password">更新密码</button>'
          + (isMock ? '<span class="admin-note">当前使用默认密码 <code>admin</code></span>' : '')
        + '</div>'
      + '</div>'
    + '</section>';
  }

  function renderDataSection() {
    var V = Volta;
    var products = V.Products && V.Products.list ? V.Products.list().length : 0;
    var orders = V.Orders && V.Orders.list ? V.Orders.list().length : 0;
    var members = V.Members && V.Members.list ? V.Members.list().length : 0;
    var logs = V.Inventory && V.Inventory.rows ? V.Inventory.rows().length : 0;
    return '<section class="chart-card">'
      + '<div class="chart-card__head"><div><span class="eyebrow">DATA</span>'
        + '<h2 class="display-3" style="margin-top:4px">数据管理</h2></div></div>'
      + '<div class="settings-dangerRow">'
        + '<div class="settings-dangerRow__info"><div class="settings-dangerRow__title">导出全部数据</div>'
          + '<div class="settings-dangerRow__desc">将商品、订单、会员、库存流水打包成 JSON 下载，作为备份</div></div>'
        + '<button type="button" class="btn btn--sm" data-action="export-all">导出 JSON</button>'
      + '</div>'
      + '<div class="settings-dangerRow">'
        + '<div class="settings-dangerRow__info"><div class="settings-dangerRow__title">清空搜索历史</div>'
          + '<div class="settings-dangerRow__desc">清除所有页面顶部搜索框的历史关键词</div></div>'
        + '<button type="button" class="btn btn--ghost btn--sm" data-action="clear-search">清空历史</button>'
      + '</div>'
      + '<div class="settings-dangerRow">'
        + '<div class="settings-dangerRow__info"><div class="settings-dangerRow__title">清空库存流水</div>'
          + '<div class="settings-dangerRow__desc">删除全部 ' + logs + ' 条库存变更记录（不影响当前库存数）</div></div>'
        + '<button type="button" class="btn btn--ghost btn--sm" data-action="clear-logs">清空流水</button>'
      + '</div>'
      + '<div class="settings-dangerRow">'
        + '<div class="settings-dangerRow__info"><div class="settings-dangerRow__title">重置所有 Mock 数据</div>'
          + '<div class="settings-dangerRow__desc">恢复商品/订单/会员/库存到演示初始数据（共 '
            + products + '/' + orders + '/' + members + ' 条），设置项不会被改动</div></div>'
        + '<button type="button" class="btn btn--danger btn--sm" data-action="reset-all" style="background:var(--c-danger);color:#fff;border-color:var(--c-danger)">重置数据</button>'
      + '</div>'
    + '</section>';
  }

  function renderAboutSection() {
    try {
      var keys = Object.keys(localStorage);
      var totalBytes = 0;
      for (var i = 0; i < keys.length; i++) {
        totalBytes += (localStorage.getItem(keys[i]) || '').length * 2 + keys[i].length * 2;
      }
      var sizeKB = (totalBytes / 1024).toFixed(1);
    } catch (e) { sizeKB = '—'; }
    var V = Volta;
    var products = V.Products && V.Products.list ? V.Products.list().length : 0;
    var orders = V.Orders && V.Orders.list ? V.Orders.list().length : 0;
    var members = V.Members && V.Members.list ? V.Members.list().length : 0;
    var logs = V.Inventory && V.Inventory.rows ? V.Inventory.rows().length : 0;
    return '<section class="chart-card">'
      + '<div class="chart-card__head"><div><span class="eyebrow">ABOUT</span>'
        + '<h2 class="display-3" style="margin-top:4px">关于</h2></div></div>'
      + '<div class="settings-about">'
        + '<div class="settings-about__item"><div class="settings-about__num">' + products + '</div><div class="settings-about__label">商品</div></div>'
        + '<div class="settings-about__item"><div class="settings-about__num">' + orders + '</div><div class="settings-about__label">订单</div></div>'
        + '<div class="settings-about__item"><div class="settings-about__num">' + members + '</div><div class="settings-about__label">会员</div></div>'
        + '<div class="settings-about__item"><div class="settings-about__num">' + logs + '</div><div class="settings-about__label">库存流水</div></div>'
      + '</div>'
      + '<div style="margin-top:var(--sp-3);font-size:var(--fs-xs);color:var(--c-muted);font-family:var(--font-mono);line-height:1.6">'
        + 'VOLTA 数码商城 · 库存管理控制台 v1.0.0<br>'
        + 'localStorage 占用：' + sizeKB + ' KB'
      + '</div>'
    + '</section>';
  }

  /* ------------------------------ 事件 ------------------------------ */
  function bind($root) {
    $root.off();
    $(document).off('click.voltaMsClick');

    // 通用 input → state
    $root.on('input', '[data-field]', function () {
      var k = $(this).data('field');
      var v = $(this).val();
      // 密码字段在独立分区，不影响 touched 校验
      if (k === 'pwdCurrent' || k === 'pwdNew' || k === 'pwdConfirm') {
        state[k] = v;
        return;
      }
      state[k] = v;
      state.touched = true;
    });

    // checkbox
    $root.on('change', '[data-field="orderNotify"]', function () {
      state.orderNotify = this.checked;
      state.touched = true;
    });

    // 主题即时预览
    $root.on('change', '[data-theme-radio]', function () {
      state.defaultTheme = $(this).val();
      state.touched = true;
      document.documentElement.dataset.theme = state.defaultTheme;
      Storage.writeLS('volta.theme', state.defaultTheme);
    });

    // 日期格式即时预览（写入 LS 让 Format.readDateFormat 读到）
    $root.on('change', '[data-datefmt-radio]', function () {
      state.dateFormat = $(this).val();
      state.touched = true;
      // 立即写 LS，但不完整保存（currency/threshold 还没合并）
      var cur = Storage.readLS(SETTINGS_KEY, null) || {};
      cur.dateFormat = state.dateFormat;
      Storage.writeLS(SETTINGS_KEY, cur);
    });

    // 主保存（【需求14】保存到 ssc_shezhi 设置表 + 当前管理员记录写操作日志）
    $root.on('click', '[data-action="save"]', function (e) {
      e.preventDefault();
      if (state.saving) return;
      state.touched = true;
      var errs = validate();
      if (Object.keys(errs).length) { render(); UI.toast('请修正表单错误', 'error'); return; }
      var payload = {
        siteName: state.siteName.trim(),
        siteSubtitle: state.siteSubtitle.trim(),
        defaultTheme: state.defaultTheme,
        dateFormat: state.dateFormat,
        currency: state.currency,
        orderNotify: state.orderNotify,
        alertThreshold: Number(state.alertThreshold)
      };
      var token = Volta.Admin && Volta.Admin.getToken();
      if (!token) { UI.toast('登录已过期，请重新登录', 'error'); return; }
      state.saving = true;
      fetch('/shuma/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json(); }).then(function (json) {
        state.saving = false;
        if (json.code === 0 && json.data) {
          applyData(json.data);
          UI.toast('系统设置已保存' + (state.lastSettingBy ? '（记录到管理员：' + state.lastSettingBy + '）' : ''), 'success');
          render();
          setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
        } else {
          UI.toast(json.message || '保存失败', 'error');
        }
      }).catch(function (err) {
        state.saving = false;
        UI.toast('网络错误：' + (err.message || err), 'error');
      });
    });

    // 恢复默认
    $root.on('click', '[data-action="reset"]', function (e) {
      e.preventDefault();
      if (!confirm('确认恢复所有设置到默认值？')) return;
      Storage.writeLS(SETTINGS_KEY, Object.assign({}, DEFAULTS, { updatedAt: Date.now() }));
      loadFromStore();
      // 主题也要同步恢复
      document.documentElement.dataset.theme = DEFAULTS.defaultTheme;
      Storage.writeLS('volta.theme', DEFAULTS.defaultTheme);
      UI.toast('已恢复默认设置', 'info');
      render();
    });

    // 密码修改（changePassword 返回 Promise，走后端复杂度校验）
    $root.on('click', '[data-action="save-password"]', function (e) {
      e.preventDefault();
      var errs = validatePassword();
      if (Object.keys(errs).length) {
        render();
        UI.toast('请修正密码错误', 'error');
        return;
      }
      Volta.Admin.changePassword(state.pwdCurrent, state.pwdNew).then(function (result) {
        if (result && result.ok === false) { UI.toast(result.message || '密码修改失败', 'error'); return; }
        UI.toast(result && result.message ? result.message : '密码已更新', 'success');
        state.pwdCurrent = ''; state.pwdNew = ''; state.pwdConfirm = '';
        render();
      });
    });

    // 清空搜索历史
    $root.on('click', '[data-action="clear-search"]', function () {
      if (!confirm('确认清空搜索历史？')) return;
      if (Volta.UI && Volta.UI.clearSearchHistory) Volta.UI.clearSearchHistory();
      UI.toast('搜索历史已清空', 'info');
      render();
    });

    // 清空库存流水
    $root.on('click', '[data-action="clear-logs"]', function () {
      if (!confirm('确认清空全部库存流水？当前库存数不会被改动。')) return;
      if (Volta.Inventory && Volta.Inventory.clearLogs) Volta.Inventory.clearLogs();
      UI.toast('库存流水已清空', 'info');
      render();
    });

    // 导出全部数据
    $root.on('click', '[data-action="export-all"]', function () {
      var data = {
        exportAt: new Date().toISOString(),
        settings: Storage.readLS(SETTINGS_KEY, null),
        products: safeGet('Products', 'list'),
        orders: safeGet('Orders', 'list'),
        members: safeGet('Members', 'list'),
        inventory: {
          overrides: Volta.Inventory && Volta.Inventory.overrides || null,
          thresholds: Volta.Inventory && Volta.Inventory.thresholds || null,
          logs: safeGet('Inventory', 'rows')
        }
      };
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url; a.download = 'volta-backup-' + ts + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
      UI.toast('数据已导出', 'success');
    });

    // 重置所有 Mock 数据（危险，仅 super）
    $root.on('click', '[data-action="reset-all"]', function () {
      if (Volta.Admin && Volta.Admin.role() !== 'super') { UI.toast('无此权限，需要超级管理员', 'error'); return; }
      if (!confirm('⚠️ 确认重置全部 Mock 数据？')) return;
      if (!confirm('这将恢复商品、订单、会员、库存到演示初始状态，且不可恢复！')) return;
      try {
        if (Volta.Products && Volta.Products.resetAll) Volta.Products.resetAll();
        if (Volta.Members && Volta.Members.resetAll) Volta.Members.resetAll();
        if (Volta.User && Volta.User.resetAll) Volta.User.resetAll();
        if (Volta.Inventory && Volta.Inventory.resetAll) Volta.Inventory.resetAll();
        if (Volta.Admins && Volta.Admins.resetAll) Volta.Admins.resetAll();
        // 清 LOGGED_OUT_KEY —— 重置后让 file:// 自动登录恢复
        try { localStorage.removeItem('volta.admin.loggedOut'); } catch (e) {}
        UI.toast('Mock 数据已重置', 'success');
        render();
      } catch (err) {
        UI.toast('重置失败：' + (err.message || err), 'error');
      }
    });
  }

  function safeGet(storeName, fnName) {
    try {
      var s = Volta[storeName];
      if (s && typeof s[fnName] === 'function') return s[fnName]();
    } catch (e) {}
    return null;
  }

  /* ------------------------------ 启动 ------------------------------ */
  $(function () {
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;
    UI.initTheme();
    Volta.AdminLayout.init();
    loadFromStore();
    render();
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
    // 【需求14】从后端拉取系统设置 + 最后设置操作记录，拉到后重渲染
    fetchSettings().then(function () {
      render();
      setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
    });
  });
})(window);