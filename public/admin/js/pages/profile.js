/**
 * profile.js —— 个人信息页（jQuery 版）
 * 两卡片布局：左（头像+昵称+职位）+ 右（Tab 切换个人简介 / 编辑资料）。
 * - 个人简介 Tab：永远展示两列表格 + bio 文本
 * - 编辑资料 Tab：永远显示表单，保存/取消只在此 Tab 出现
 * 所有扩展字段存于 volta.admin.profileExt LS 键。
 */
(function (global) {
  'use strict';
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var Admin = Volta.Admin;

  /* ------------------------------ 头像压缩 ------------------------------ */
  var AVATAR_MAX_EDGE = 800;
  var AVATAR_JPEG_QUALITY = 0.85;
  var AVATAR_MAX_BYTES = 256 * 1024;

  function compressAvatar(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('读取图片失败')); };
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, AVATAR_MAX_EDGE / Math.max(w, h));
          var dw = Math.round(w * scale), dh = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = dw; canvas.height = dh;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, dw, dh);
          ctx.drawImage(img, 0, 0, dw, dh);
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error('图片压缩失败')); return; }
            if (blob.size > AVATAR_MAX_BYTES) { reject(new Error('压缩后仍超过 ' + Math.round(AVATAR_MAX_BYTES / 1024) + 'KB')); return; }
            var r2 = new FileReader();
            r2.onload = function () { resolve(r2.result); };
            r2.onerror = function () { reject(new Error('压缩后读取失败')); };
            r2.readAsDataURL(blob);
          }, 'image/jpeg', AVATAR_JPEG_QUALITY);
        };
        img.onerror = function () { reject(new Error('图片解码失败')); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------ state ------------------------------ */
  var state = {
    tab: 'bio',              // 'bio' 个人简介 / 'info' 编辑资料 / 'pwd' 修改密码
    avatar: '',
    nickname: '', email: '', phone: '',
    realName: '', gender: '', department: '', position: '', bio: '',
    accountId: '',
    pwdOld: '', pwdNew: '', pwdConfirm: '',
    pwdMsg: null,
    touched: false
  };

  var GENDER_OPTIONS = [
    { v: '', l: '保密' },
    { v: 'male', l: '男' },
    { v: 'female', l: '女' }
  ];

  var isEditingTab = function () { return state.tab === 'info'; };

  /* ------------------------------ 头像渲染 ------------------------------ */
  function renderAvatarDOM(src) {
    var cls = 'profile-avatar' + (src ? ' has-avatar' : '');
    var inner;
    if (src) {
      inner = '<img src="' + src + '" alt="头像">';
    } else {
      inner = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
      + '</svg>';
    }
    return '<div class="' + cls + '">' + inner + '</div>';
  }

  /* ------------------------------ 初始化 ------------------------------ */
  function loadFromStore() {
    var ext = Admin.getProfileExt();
    state.avatar = ext.avatar || '';
    state.nickname = ext.nickname || Admin.name();
    state.email = ext.email || '';
    state.phone = ext.phone || '';
    state.realName = ext.realName || '';
    state.gender = ext.gender || '';
    state.department = ext.department || '';
    state.position = ext.position || '';
    state.bio = ext.bio || '';
    state.accountId = Admin.currentId() || ext.accountId || '—';
  }

  function errorIf(cond, msg) { return cond ? '<p class="field__error">' + msg + '</p>' : ''; }

  function validate() {
    var errs = {};
    if (state.touched) {
      if (!state.nickname.trim()) errs.nickname = '昵称不能为空';
      if (!state.realName.trim()) errs.realName = '真实姓名不能为空';
      if (state.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email)) errs.email = '邮箱格式不正确';
      if (state.phone && !/^1\d{10}$/.test(state.phone)) errs.phone = '手机号需为 11 位且以 1 开头';
      if (state.bio && state.bio.length > 120) errs.bio = '个人简介最多 120 字';
    }
    return errs;
  }

  /* ------------------------------ 渲染 ------------------------------ */
  function render() {
    var p = Admin.profile || {};
    var ext = Admin.getProfileExt();
    var errs = validate();
    var loginAt = p.loginAt ? F.formatDateTime(p.loginAt) : '—';
    var genderLabel = '';
    GENDER_OPTIONS.forEach(function (g) { if (g.v === ext.gender) genderLabel = g.l; });

    var editable = isEditingTab();
    // 左卡片：昵称/职位在编辑 Tab 显示 state 值，简介 Tab 显示 LS 值
    var nameForLeft = editable ? state.nickname : (ext.nickname || ext.realName || Admin.name());
    var roleForLeft = editable ? state.position : (ext.position || Admin.role() || '—');

    var html = '';

    // 页头
    html += '<div class="admin-head"><div class="admin-head__text">'
      + '<span class="eyebrow">PROFILE</span>'
      + '<h1 class="display-3">个人信息</h1>'
      + '<p class="admin-head__lede">账号与角色由系统分配，扩展字段保存在本地浏览器。</p>'
    + '</div></div>';

    // —— 两卡片 grid ——
    html += '<div class="profile-grid">';

    // 左卡片：头像永远只读展示
    html += '<div class="chart-card profile-side">'
      + renderAvatarDOM(state.avatar)
      + '<div class="profile-side__name">' + esc(nameForLeft || '未设置昵称') + '</div>'
      + '<div class="profile-side__role">' + esc(roleForLeft || '—') + '</div>'
    + '</div>';

    // 右卡片 head
    var headRight = '';
    if (editable) {
      headRight = '<div class="profile-card__actions">'
        + '<button type="button" class="btn btn--primary btn--sm" data-action="save">保存</button>'
        + '<button type="button" class="btn btn--ghost btn--sm" data-action="cancel">取消</button>'
      + '</div>';
    }

    html += '<div class="chart-card">'
      + '<div class="chart-card__head">'
        + '<div><span class="eyebrow">PROFILE</span><h2 class="display-3" style="margin-top:4px">账号信息</h2></div>'
        + headRight
      + '</div>';

    // Tab 切换
    html += '<div class="profile-tabs">'
      + '<button type="button" class="profile-tab' + (state.tab === 'bio' ? ' is-active' : '') + '" data-tab="bio">个人简介</button>'
      + '<button type="button" class="profile-tab' + (state.tab === 'info' ? ' is-active' : '') + '" data-tab="info">编辑资料</button>'
      + '<button type="button" class="profile-tab' + (state.tab === 'pwd' ? ' is-active' : '') + '" data-tab="pwd">修改密码</button>'
    + '</div>';

    // Tab 内容（稳定锚点 div，便于定向更新）
    html += '<div class="profile-tab-content">';
    if (state.tab === 'bio') {
      html += renderTabBio(ext, genderLabel, loginAt);
    } else if (state.tab === 'info') {
      html += renderTabEdit(errs);
    } else {
      html += renderTabPwd();
    }
    html += '</div>';

    html += '</div>';  // 右卡片
    html += '</div>';  // profile-grid

    $('#page-root').html(html);
    bind($('#page-root'));
  }

  /* —— Tab bio：两列表格 + bio 文本（永远展示） —— */
  function renderTabBio(ext, genderLabel, loginAt) {
    var items = [
      ['昵称', ext.nickname || ext.realName || '—', false],
      ['真实姓名', ext.realName || '—', false],
      ['账号 ID', state.accountId, true],
      ['性别', genderLabel || '—', false],
      ['部门', ext.department || '—', false],
      ['职位', ext.position || '—', false],
      ['邮箱', ext.email || '—', true],
      ['手机号', ext.phone ? F.maskPhone(ext.phone) : '—', true],
      ['登录时间', loginAt, true]
    ];
    var html = '<div class="profile-info-table">';
    items.forEach(function (it) {
      html += '<div class="profile-info-table__label">' + esc(it[0]) + '</div>'
        + '<div class="profile-info-table__value' + (it[2] ? ' mono' : '') + '">' + esc(it[1]) + '</div>';
    });
    html += '</div>';
    html += '<div style="margin-top: var(--sp-4)">'
      + '<div class="field__label" style="font-size: var(--fs-xs); color: var(--c-muted); font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: var(--sp-2)">个人简介</div>'
      + '<div class="profile-bio">' + esc(ext.bio || '') + '</div>'
    + '</div>';
    return html;
  }

  /* —— Tab info：编辑表单（永远编辑） —— */
  function renderTabEdit(errs) {
    // 头像上传 field（独立一行，虚线框 + 72px 缩略图 + 按钮组 + hint + hidden input）
    var hasAvatar = !!state.avatar;
    var thumbInner = hasAvatar
      ? '<img src="' + state.avatar + '" alt="头像">'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    var hintText = hasAvatar
      ? '建议正方形 JPG / PNG，文件越小加载越快'
      : '还没有头像，上传后会显示在左卡片';
    var avatarField = '<div class="field field--full">'
      + '<label class="field__label">头像</label>'
      + '<div class="avatar-upload">'
        + '<div class="avatar-upload__thumb' + (hasAvatar ? ' has-avatar' : '') + '">' + thumbInner + '</div>'
        + '<div class="avatar-upload__meta">'
          + '<div class="avatar-upload__btns">'
            + '<button type="button" class="btn btn--sm" data-action="avatar-pick">'
              + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:-2px"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
              + '上传头像</button>'
            + (hasAvatar ? '<button type="button" class="btn btn--ghost btn--sm" data-action="avatar-clear">清除</button>' : '')
          + '</div>'
          + '<p class="avatar-upload__hint">' + hintText + '</p>'
        + '</div>'
      + '</div>'
      + '<input type="file" accept="image/*" hidden data-avatar-input>'
    + '</div>';

    return '<div class="profile-form">'
      + avatarField
      + fieldText('昵称', 'nickname', state.nickname, '用于显示的昵称', errs.nickname)
      + fieldText('真实姓名', 'realName', state.realName, '请输入真实姓名', errs.realName)
      + '<div class="field field--full">'
          + '<label class="field__label">性别</label>'
          + '<div class="seg" style="margin-top:6px">'
            + GENDER_OPTIONS.map(function (o) {
                return '<button type="button" class="seg__btn' + (state.gender === o.v ? ' is-active' : '') + '" data-gender="' + o.v + '">' + esc(o.l) + '</button>';
              }).join('')
          + '</div>'
        + '</div>'
      + fieldText('部门', 'department', state.department, '如：运营部、仓库组')
      + fieldText('职位', 'position', state.position, '如：主管、组长')
      + fieldText('邮箱', 'email', state.email, 'name@volta.com', errs.email, 'email')
      + fieldText('手机号', 'phone', state.phone, '11 位手机号', errs.phone, 'tel')
      + '<div class="field field--full">'
          + '<label class="field__label">个人简介</label>'
          + '<textarea class="field__input" rows="4" data-field="bio" placeholder="简短描述一下自己，最多 120 字">' + esc(state.bio) + '</textarea>'
          + errorIf(errs.bio, errs.bio)
        + '</div>'
    + '</div>';
  }

  /* —— Tab pwd：修改密码 —— */
  function renderTabPwd() {
    var msg = state.pwdMsg;
    var msgHtml = msg
      ? '<p class="field__error" style="margin-top:var(--sp-3); padding:var(--sp-2) var(--sp-3); border:1px solid var(--c-danger-line); border-radius:var(--r-xs); background:var(--c-danger-soft); color:var(--c-danger-text)">' + esc(msg) + '</p>'
      : '';
    return '<div class="profile-form">'
      + '<div class="admin-note">修改的是当前登录管理员账号的密码，下次登录时生效。</div>'
      + fieldText('当前密码', 'pwdOld', state.pwdOld, '请输入当前密码', null, 'password')
      + fieldText('新密码', 'pwdNew', state.pwdNew, '至少 6 位', null, 'password')
      + fieldText('确认新密码', 'pwdConfirm', state.pwdConfirm, '再次输入新密码', null, 'password')
      + '<div class="field field--full" style="display:flex; gap:var(--sp-2); margin-top:var(--sp-2)">'
        + '<button type="button" class="btn btn--primary" data-action="save-pwd">确认修改</button>'
        + '<button type="button" class="btn btn--ghost" data-action="clear-pwd">清空</button>'
      + '</div>'
      + msgHtml
    + '</div>';
  }

  function fieldText(label, key, val, placeholder, err, type) {
    var t = type || 'text';
    return '<div class="field">'
      + '<label class="field__label">' + esc(label) + '</label>'
      + '<input class="field__input" type="' + t + '" data-field="' + key + '" value="' + esc(val) + '" placeholder="' + esc(placeholder) + '">'
      + errorIf(err, err)
    + '</div>';
  }

  /* ------------------------------ 事件 ------------------------------ */
  function bind($root) {
    $root.off();
    $(document).off('click.voltaMsClick');

    // —— Tab 切换（因为 head 按钮会变，直接 render 整个页面，用户点 Tab 时不在 IME 输入中 ——
    $root.on('click', '[data-tab]', function () {
      var target = $(this).data('tab');
      if (target === state.tab) return;
      state.tab = target;
      if (target === 'bio') {
        state.touched = false;
      } else if (target === 'pwd') {
        // 切到密码 tab → 清空密码 state
        state.pwdOld = ''; state.pwdNew = ''; state.pwdConfirm = ''; state.pwdMsg = null;
      } else {
        loadFromStore();
      }
      render();
    });

    // —— 头像上传（按钮在编辑资料 Tab 表单里）——
    $root.on('click', '[data-action="avatar-pick"]', function () {
      $('[data-avatar-input]').trigger('click');
    });
    $root.on('click', '[data-action="avatar-clear"]', function () {
      state.avatar = '';
      render();
    });
    $root.on('change', '[data-avatar-input]', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { UI.toast('请选择图片文件', 'error'); this.value = ''; return; }
      UI.toast('正在压缩图片...', 'info');
      compressAvatar(file).then(function (dataURL) {
        state.avatar = dataURL;
        render();
        UI.toast('头像已更新', 'success');
      }).catch(function (err) {
        UI.toast(err.message || '头像处理失败', 'error');
      });
      this.value = '';
    });

    // —— 表单输入 ——
    $root.on('input', '[data-field]', function () {
      var k = $(this).data('field');
      state[k] = $(this).val();
      state.touched = true;
      // 定向更新左卡片的昵称/职位（不 render）
      if (k === 'nickname' || k === 'position') {
        var $left = $('.profile-side__' + (k === 'nickname' ? 'name' : 'role'));
        $left.text(state[k].trim() || (k === 'nickname' ? '未设置昵称' : '—'));
      }
      // 定向校验（不 render，避免打断 IME）
      var errs = validate();
      var $err = $(this).siblings('.field__error');
      var msg = errs[k];
      if (msg) { if ($err.length) $err.text(msg); else $(this).after('<p class="field__error">' + msg + '</p>'); }
      else $err.remove();
    });
    $root.on('click', '[data-gender]', function () {
      state.gender = $(this).data('gender');
      state.touched = true;
      $root.find('[data-gender]').each(function () {
        $(this).toggleClass('is-active', $(this).data('gender') === state.gender);
      });
    });

    // —— 保存 / 取消 ——
    $root.on('click', '[data-action="save"]', function (e) {
      e.preventDefault();
      state.touched = true;
      var errs = validate();
      if (Object.keys(errs).length) { render(); UI.toast('请修正表单错误', 'error'); return; }
      UI.toast('正在保存...', 'info');
      Admin.setProfileExt({
        avatar: state.avatar,
        nickname: state.nickname.trim(),
        realName: state.realName.trim(),
        gender: state.gender,
        department: state.department.trim(),
        position: state.position.trim(),
        email: state.email.trim(),
        phone: state.phone.trim(),
        bio: state.bio.trim(),
        updatedAt: Date.now()
      }).then(function (res) {
        if (res.ok) {
          UI.toast(res.message || '个人资料已保存', 'success');
          state.tab = 'bio';
          state.touched = false;
          loadFromStore();
          render();
        } else {
          UI.toast(res.message || '保存失败', 'error');
        }
      });
      // 注意：此时页面可能立即切换，但保存仍在进行中
      // 为了体验先 toast，不阻塞 render
    });
    $root.on('click', '[data-action="cancel"]', function (e) {
      e.preventDefault();
      state.tab = 'bio';
      state.touched = false;
      loadFromStore();
      render();
    });

    // —— 修改密码 tab ——
    $root.on('input', '[data-field="pwdOld"], [data-field="pwdNew"], [data-field="pwdConfirm"]', function () {
      var k = $(this).data('field');
      state[k] = $(this).val();
      state.pwdMsg = null;
    });
    $root.on('click', '[data-action="save-pwd"]', function (e) {
      e.preventDefault();
      var oldPwd = state.pwdOld, newPwd = state.pwdNew, confirm = state.pwdConfirm;
      if (!oldPwd) { state.pwdMsg = '请输入当前密码'; render(); return; }
      // 【需求15】6~20 字符，含大小写字母 + 数字 + 特殊符号（后端同样校验）
      var PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,20}$/;
      if (!PWD_RE.test(newPwd)) { state.pwdMsg = '密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号'; render(); return; }
      if (newPwd !== confirm) { state.pwdMsg = '两次输入不一致'; render(); return; }
      if (newPwd === oldPwd) { state.pwdMsg = '新密码不能与当前密码相同'; render(); return; }
      UI.toast('正在修改密码...', 'info');
      Admin.changePassword(oldPwd, newPwd).then(function (res) {
        if (res.ok) {
          UI.toast(res.message || '密码修改成功', 'success');
          state.pwdOld = ''; state.pwdNew = ''; state.pwdConfirm = ''; state.pwdMsg = null;
          render();
        } else {
          state.pwdMsg = res.message || '修改失败';
          render();
        }
      });
    });
    $root.on('click', '[data-action="clear-pwd"]', function (e) {
      e.preventDefault();
      state.pwdOld = ''; state.pwdNew = ''; state.pwdConfirm = ''; state.pwdMsg = null;
      render();
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ------------------------------ 启动 ------------------------------ */
  $(function () {
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;
    UI.initTheme();
    Volta.AdminLayout.init();
    loadFromStore();
    render();
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
    // 【需求13】先从管理员数据表（ssc_guanliyuan）实时拉取当前管理员资料，拉到后重渲染
    if (typeof Admin.fetchProfile === 'function') {
      Admin.fetchProfile().then(function (refreshed) {
        if (!refreshed) return;
        loadFromStore();
        render();
        setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
      });
    }
  });
})(window);