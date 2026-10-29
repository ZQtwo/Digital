/**
 * store-admin.js —— 后台管理员登录态
 *
 * 登录走 Laravel Sanctum API: POST /shuma/api/admin/auth/login
 * Token 存 localStorage volta.admin.token，所有后台 API 自动带 Authorization: Bearer
 *
 * localStorage 键：volta.admin (session), volta.admin.token (Sanctum token)
 */
(function (global) {
  var Storage = global.Volta && global.Volta.Storage;
  var Admins = global.Volta && global.Volta.Admins;
  var ADMIN_KEY = 'volta.admin';
  var TOKEN_KEY = 'volta.admin.token';
  var LOGGED_OUT_KEY = 'volta.admin.loggedOut';
  var PROFILE_EXT_KEY = 'volta.admin.profileExt';   // 扩展资料（邮箱/手机/昵称）

  var state = {
    profile: Storage ? Storage.readLS(ADMIN_KEY, null) : null,
    token: Storage ? Storage.readLS(TOKEN_KEY, null) : null
  };

  // —— file:// 协议开发模式 fallback ——
  // file:// 下每个 html 是独立 origin，localStorage 互不相通。
  // 如果检测到是 file:// 协议且没有登录态，自动 seed 一个默认 super 账号，
  // 方便直接双击 html 文件就能用。生产部署走 http(s) 时不受影响。
  // 但如果用户刚才主动点过退出登录（LOGGED_OUT_KEY 已写），就尊重那个选择，
  // 不重新 seed —— 否则退出永远退不出去。
  if (!state.profile && /^file:/i.test(location.protocol)) {
    var explicitlyLoggedOut = Storage && Storage.readLS(LOGGED_OUT_KEY, false);
    if (!explicitlyLoggedOut) {
      state.profile = {
        id: 'adm1', username: 'admin', realname: '创始者', role: 'super', loginAt: Date.now()
      };
      if (Storage) Storage.writeLS(ADMIN_KEY, state.profile);
    }
  }

  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function persist() {
    if (Storage) {
      Storage.writeLS(ADMIN_KEY, state.profile);
      if (state.token) Storage.writeLS(TOKEN_KEY, state.token);
      else Storage.removeLS && Storage.removeLS(TOKEN_KEY);
    }
    emit();
  }

  /** 当前 Sanctum token（其他 store 调 API 用） */
  function getToken() { return state.token || null; }
  /** 当前管理员角色 code (super|admin) */
  function currentRoleCode() { return state.profile ? (state.profile.role || state.profile.role_code || '') : ''; }

  function isLogin() { return !!state.profile && !!state.token; }
  function name() { return state.profile ? state.profile.realname || state.profile.username : '未登录'; }
  function role() { return state.profile ? (state.profile.role || state.profile.role_code || '') : ''; }
  function currentId() { return state.profile ? state.profile.id : null; }
  function username() { return state.profile ? state.profile.username : ''; }

  /** 【需求16】手机号格式：1 开头第二位 3-9 共 11 位 */
  var PHONE_RE = /^1[3-9]\d{9}$/;

  /**
   * 管理员登录 —— 真调后端 API（【需求16】手机号登录）
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  function login(uname, password) {
    var u = String(uname || '').trim();
    // 密码仅去除首尾空白（复制粘贴常见坑）；密码中间的空格保留
    var p = String(password || '').replace(/^\s+|\s+$/g, '');
    if (!u) return Promise.resolve({ ok: false, message: '请输入手机号' });
    if (!PHONE_RE.test(u)) return Promise.resolve({ ok: false, message: '手机号格式不正确（1 开头 11 位数字）' });
    if (!p) return Promise.resolve({ ok: false, message: '请输入密码' });
    if (p.length > 20) return Promise.resolve({ ok: false, message: '密码最多 20 个字符' });

    return fetch('/shuma/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ phone: u, password: p })
    }).then(function (resp) { return resp.json(); }).then(function (json) {
      if (json.code === 0) {
        var a = json.data.admin;
        state.profile = {
          id: a.id,
          adminCode: a.adminCode,
          username: a.username,
          nickname: a.nickname,
          avatar: a.avatar,
          realname: a.realname,
          gender: a.gender,
          department: a.department,
          position: a.position,
          phone: a.phone,
          email: a.email,
          bio: a.bio,
          role: a.role,
          status: a.status,
          lastLoginAt: a.lastLoginAt,
          loginAt: Date.now()
        };
        state.token = json.data.token;
        if (Storage) Storage.writeLS(LOGGED_OUT_KEY, false);
        persist();
        return { ok: true };
      }
      return { ok: false, message: json.message || '登录失败' };
    }).catch(function (e) {
      return { ok: false, message: '网络错误：' + (e.message || e) };
    });
  }

  /**
   * 修改自己的密码 —— 真实调后端 API
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  function changePassword(oldPwd, newPwd) {
    if (!state.profile || !state.token) return Promise.resolve({ ok: false, message: '未登录' });
    return fetch('/shuma/api/admin/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
    }).then(function (resp) { return resp.json(); }).then(function (json) {
      if (json.code === 0) return { ok: true, message: json.message || '密码修改成功' };
      return { ok: false, message: json.message || '修改失败' };
    }).catch(function (e) {
      return { ok: false, message: '网络错误：' + (e.message || e) };
    });
  }

  /** 从 state.profile 读取完整扩展资料 */
  function getProfileExt() {
    var p = state.profile || {};
    return {
      avatar: p.avatar || '',
      nickname: p.nickname || '',
      realName: p.realname || '',
      gender: p.gender || '',
      department: p.department || '',
      position: p.position || '',
      email: p.email || '',
      phone: p.phone || '',
      bio: p.bio || '',
    };
  }

  /**
   * 【需求13】从后端 /admin/auth/me 实时拉取当前管理员资料（绑定管理员数据表 ssc_guanliyuan），
   * 覆盖本地快照，个人信息页显示的始终是数据库里的最新数据。
   * @returns {Promise<boolean>} 是否刷新成功
   */
  function fetchProfile() {
    if (!state.token) return Promise.resolve(false);
    return fetch('/shuma/api/admin/auth/me', {
      headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + state.token }
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (json.code === 0 && json.data && json.data.admin) {
        state.profile = json.data.admin;
        persist();
        return true;
      }
      return false;
    }).catch(function () { return false; });
  }

  /**
   * 保存资料 —— 真实调后端 API
   * @param {object} patch 要更新的字段
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  function setProfileExt(patch) {
    if (!state.profile || !state.token) return Promise.resolve({ ok: false, message: '未登录' });
    var body = {
      nickname: patch.nickname || null,
      avatar: patch.avatar || null,
      realname: patch.realName || patch.realname || null,
      gender: patch.gender || null,
      department: patch.department || null,
      position: patch.position || null,
      email: patch.email || null,
      phone: patch.phone || null,
      bio: patch.bio || null,
    };
    return fetch('/shuma/api/admin/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify(body)
    }).then(function (resp) { return resp.json(); }).then(function (json) {
      if (json.code === 0 && json.data && json.data.admin) {
        var a = json.data.admin;
        // 更新 state.profile
        Object.assign(state.profile, {
          nickname: a.nickname,
          avatar: a.avatar,
          realname: a.realname,
          gender: a.gender,
          department: a.department,
          position: a.position,
          phone: a.phone,
          email: a.email,
          bio: a.bio,
        });
        persist();
        return { ok: true, message: json.message || '资料已更新' };
      }
      return { ok: false, message: json.message || '保存失败' };
    }).catch(function (e) {
      return { ok: false, message: '网络错误：' + (e.message || e) };
    });
  }

  function logout() {
    // 尝试通知后端作废 token（可选，失败不影响前端清除）
    try {
      if (state.token) {
        fetch('/shuma/api/admin/auth/logout', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + state.token }
        });
      }
    } catch (e) {}
    state.profile = null;
    state.token = null;
    if (Storage) Storage.writeLS(LOGGED_OUT_KEY, true);
    persist();
  }

  var SESSION_TTL = 24 * 60 * 60 * 1000; // 24 小时

  /**
   * 路由守卫：校验登录态有效。
   * - 检查是否登录；
   * - 检查 loginAt 距今是否超过 24 小时，超时则自动 logout 并清空登录态。
   */
  function checkSession() {
    if (!isLogin()) return false;
    var loginAt = state.profile && state.profile.loginAt;
    if (loginAt && (Date.now() - loginAt > SESSION_TTL)) {
      logout();
      return false;
    }
    return true;
  }

  /**
   * 路由守卫：未登录跳 login；已登录但账号被禁用也会触发 logout
   * @returns {boolean} true 表示已登录且可用；false 表示已跳转
   */
  function requireAdmin(loginPage) {
    if (!checkSession()) {
      var page = loginPage || '/shuma/admin/login';
      var cur = (location.pathname.split('/').slice(-1)[0] || '/shuma/admin/') + location.search;
      location.href = page + '?redirect=' + encodeURIComponent(cur);
      return false;
    }
    return true;
  }

  /**
   * 角色守卫：当前账号角色不匹配则 toast 并跳回首页
   * @param {string} targetRole 'super' | 'admin'
   * @returns {boolean} true 表示角色满足
   */
  function requireRole(targetRole) {
    if (!isLogin()) { requireAdmin(); return false; }
    if (!checkSession()) return false;
    var cur = state.profile.role;
    if (targetRole === 'admin') return true;   // 已登录就是 admin 或 super 都能进
    if (targetRole === 'super') {
      if (cur !== 'super') {
        if (global.Volta && global.Volta.UI) global.Volta.UI.toast('无此权限', 'error');
        setTimeout(function () { location.href = '/shuma/admin/'; }, 400);
        return false;
      }
      return true;
    }
    return true;
  }

  /** super 守卫便利别名 */
  function requireSuper() { return requireRole('super'); }

  global.Volta = global.Volta || {};
  global.Volta.Admin = {
    ADMIN_KEY: ADMIN_KEY,
    DEMO_ACCOUNT: { phone: '13182796613', password: 'admin123' },
    get profile() { return state.profile; },
    getToken: getToken,
    isLogin: isLogin,
    name: name,
    role: role,
    roleCode: currentRoleCode,
    currentId: currentId,
    username: username,
    login: login,
    logout: logout,
    requireAdmin: requireAdmin,
    requireRole: requireRole,
    requireSuper: requireSuper,
    changePassword: changePassword,
    checkSession: checkSession,
    getProfileExt: getProfileExt,
    fetchProfile: fetchProfile,
    setProfileExt: setProfileExt,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
