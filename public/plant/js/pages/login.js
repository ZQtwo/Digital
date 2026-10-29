/**
 * login.js —— 前端登录页（jQuery 版）
 * 真实后端登录：数据库存在才允许登录
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var UI = Volta.UI;
  var F = Volta.Format;

  var mode = 'password';
  var pwdForm = { phone: '', password: '', nick: '', agreed: true, errors: {} };
  var smsForm = { phone: '', code: '', nick: '', agreed: true, errors: {} };
  var countdown = 0;
  var timer = null;
  var submitting = false;

  function current() { return mode === 'password' ? pwdForm : smsForm; }

  function validatePhone(form) {
    var v = (form.phone || '').trim();
    if (!v) form.errors.phone = '请填写手机号';
    else if (!/^1[3-9]\d{9}$/.test(v)) form.errors.phone = '手机号格式不正确';
    else form.errors.phone = '';
    return !form.errors.phone;
  }
  function validatePassword() {
    var v = (pwdForm.password || '').trim();
    if (!v) pwdForm.errors.password = '请填写密码';
    else if (v.length < 6) pwdForm.errors.password = '密码至少 6 位';
    else pwdForm.errors.password = '';
    return !pwdForm.errors.password;
  }
  function validateCode() {
    var v = (smsForm.code || '').trim();
    if (!v) smsForm.errors.code = '请填写验证码';
    else if (!/^\d{6}$/.test(v)) smsForm.errors.code = '验证码为 6 位数字';
    else smsForm.errors.code = '';
    return !smsForm.errors.code;
  }

  function startCountdown() {
    countdown = 60;
    UI.toast('演示环境：任意 6 位数字均可通过', 'success');
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(function () {
      countdown -= 1;
      if (countdown <= 0) { countdown = 0; window.clearInterval(timer); }
      renderForm();
    }, 1000);
  }
  function sendCode() {
    if (!validatePhone(smsForm)) { renderForm(); return; }
    if (countdown > 0) return;
    startCountdown();
    renderForm();
  }

  function submit() {
    var form = current();
    var ok;
    if (mode === 'password') {
      ok = [validatePhone(pwdForm), validatePassword()].every(Boolean);
    } else {
      ok = [validatePhone(smsForm), validateCode()].every(Boolean);
    }
    renderForm();
    if (!ok) return;
    if (!form.agreed) { UI.toast('请先同意用户协议与隐私说明', 'error'); return; }

    submitting = true;
    renderForm();

    var phone = form.phone.trim();
    var password = mode === 'password' ? pwdForm.password.trim() : smsForm.code.trim();
    Volta.User.login(phone, password).then(function (res) {
      submitting = false;
      if (res.ok) {
        UI.toast('欢迎回来，' + Volta.User.nickname(), 'success');
        Volta.Auth.redirectAfterLogin('/shuma/index');
      } else {
        renderForm();
        UI.toast(res.error || '登录失败', 'error');
      }
    });
  }

  function logout() {
    Volta.User.logout();
    UI.toast('已退出登录');
    render();
  }

  /* ---------------------------- 已登录视图 ---------------------------- */
  function renderSignedIn() {
    var u = Volta.User;
    var html = '<div class="login container"><div class="login__grid">'
      + '<section class="login__intro">'
        + '<span class="eyebrow">ACCOUNT</span>'
        + '<h1 class="display-2 login__title">你已登录</h1>'
        + '<p class="lede">收藏与订单已同步到你的账号。</p>'
      + '</section>'
      + '<section class="card card--padded login__card">'
      + '<span class="eyebrow">SIGNED IN</span>'
      + '<h2 class="display-3">' + u.nickname() + '</h2>'
      + '<dl class="who">'
        + '<div><dt>手机号</dt><dd class="mono">' + F.maskPhone(u.profile ? u.profile.phone : '') + '</dd></div>'
        + '<div><dt>会员等级</dt><dd>' + (u.profile ? u.profile.level : '') + '</dd></div>'
      + '</dl>'
      + '<div class="login__actions">'
        + '<a href="/shuma/orders" class="btn btn--primary">查看我的订单</a>'
        + '<a href="/shuma/favorites" class="btn">我的收藏</a>'
        + '<button type="button" class="btn btn--danger" data-action="logout">退出登录</button>'
      + '</div>'
      + '</section></div></div>';
    $('main').html(html);
    $('main').on('click', '[data-action="logout"]', function (e) { e.preventDefault(); logout(); });
  }

  /* ---------------------------- 表单动态重渲染 ---------------------------- */
  function renderForm() {
    var $card = $('#login-form-card');
    if (!$card.length) return;

    var tabs = '<div class="login-tabs" role="tablist">'
      + '<button type="button" class="login-tabs__item' + (mode === 'password' ? ' is-on' : '') + '" data-tab="password">密码登录</button>'
      + '<button type="button" class="login-tabs__item' + (mode === 'sms' ? ' is-on' : '') + '" data-tab="sms">短信登录</button>'
      + '</div>';

    var body = '';
    if (mode === 'password') body = passwordFields();
    else body = smsFields();

    var html = '<span class="eyebrow">SIGN IN</span>'
      + '<h2 class="display-3 login__card-title">登录 VOLTA</h2>'
      + tabs
      + '<form class="login__form" novalidate data-action="submit-login">'
      + body
      + '</form>';

    $card.html(html);
    bindForm($card);
  }

  function passwordFields() {
    var f = pwdForm;
    var submitBtn = submitting
      ? '<button type="submit" class="btn btn--primary btn--block is-loading" disabled>登录中…</button>'
      : '<button type="submit" class="btn btn--primary btn--block">登录</button>';
    return ''
      + field('lg-phone-p', '手机号', 'tel', '11 位手机号', f.phone, f.errors.phone)
      + field('lg-pwd', '密码', 'password', '6 位以上密码', f.password, f.errors.password)
      + agreedRow(f.agreed)
      + submitBtn
      + '<p class="login__foot login__foot--split"><span>还没有账号？<a href="/shuma/register">立即注册</a></span><a href="/shuma/help">帮助中心</a></p>';
  }

  function smsFields() {
    var f = smsForm;
    var codeBtnHtml = countdown > 0
      ? '<button type="button" class="btn btn--outline-accent code-row__btn" disabled>' + countdown + 's 后重发</button>'
      : '<button type="button" class="btn btn--outline-accent code-row__btn" data-action="send-code">获取验证码</button>';
    var submitBtn = submitting
      ? '<button type="submit" class="btn btn--primary btn--block is-loading" disabled>登录中…</button>'
      : '<button type="submit" class="btn btn--primary btn--block">登录</button>';
    return ''
      + field('lg-phone-s', '手机号', 'tel', '11 位手机号', f.phone, f.errors.phone)
      + '<div class="field' + (f.errors.code ? ' has-error' : '') + '">'
        + '<label class="field__label" for="lg-code">验证码</label>'
        + '<div class="code-row">'
          + '<input id="lg-code" class="input mono" type="text" inputmode="numeric" maxlength="6" placeholder="6 位数字" value="' + escapeAttr(f.code) + '" data-field="code">'
          + codeBtnHtml
        + '</div>'
        + (f.errors.code
            ? '<span class="field__error">' + f.errors.code + '</span>'
            : '<span class="field__hint">演示环境：任意 6 位数字均可通过</span>')
      + '</div>'
      + agreedRow(f.agreed)
      + submitBtn
      + '<p class="login__foot login__foot--split"><span>还没有账号？<a href="/shuma/register">立即注册</a></span><a href="/shuma/help">帮助中心</a></p>';
  }

  function field(id, label, type, placeholder, value, err) {
    return '<div class="field' + (err ? ' has-error' : '') + '">'
      + '<label class="field__label" for="' + id + '">' + label + '</label>'
      + '<input id="' + id + '" class="input mono" type="' + type + '" inputmode="' + (type === 'tel' ? 'numeric' : '') + '" maxlength="' + (type === 'tel' ? '11' : '') + '" placeholder="' + placeholder + '" autocomplete="' + (type === 'tel' ? 'tel' : 'current-password') + '" value="' + escapeAttr(value || '') + '" data-field="' + (type === 'tel' ? 'phone' : 'password') + '">'
      + (err ? '<span class="field__error">' + err + '</span>' : '')
      + '</div>';
  }
  function agreedRow(v) {
    return '<label class="agree">'
      + '<input type="checkbox"' + (v ? ' checked' : '') + ' data-field="agreed">'
      + '<span class="agree__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6"/></svg></span>'
      + '<span>我已阅读并同意《用户协议》与《隐私说明》（演示文本）</span>'
      + '</label>';
  }
  function escapeAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function bindForm($card) {
    $card.off('input change click submit');
    var $form = $card.find('form');
    $card.on('click', '.login-tabs__item', function () {
      mode = $(this).data('tab');
      renderForm();
    });
    $form.on('input', '[data-field="phone"]', function () { current().phone = $(this).val(); });
    $form.on('input', '[data-field="password"]', function () { pwdForm.password = $(this).val(); });
    $form.on('input', '[data-field="code"]', function () { smsForm.code = $(this).val(); });
    $form.on('change', '[data-field="agreed"]', function () { current().agreed = this.checked; });
    $form.on('click', '[data-action="send-code"]', function (e) { e.preventDefault(); sendCode(); });
    $form.on('submit', function (e) { e.preventDefault(); submit(); });
  }

  function bindInitial() {
    bindForm($('#login-form-card'));
  }

  function render() {
    if (Volta.User.isLogin()) {
      renderSignedIn();
    } else {
      bindInitial();
    }
  }

  $(function () {
    UI.initTheme();
    Volta.Layout.mount('');
    render();
    setTimeout(function () { Volta.Reveal.init(document); }, 0);
  });
})(window);
