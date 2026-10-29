/**
 * store-admins.js —— 管理员账号管理（后台 jQuery 版）
 *
 * 后台能登录的人：super（创始者）/ admin（员工）两档角色。
 *
 * localStorage 键：volta.admins
 * 首次访问若键为空，会生成 3 条 mock 账号。
 *
 * 对外接口：Volta.Admins
 */
(function (global) {
  var Storage = global.Volta && global.Volta.Storage;
  var ADMINS_KEY = 'volta.admins';

  /** 角色 code → { label, tone }，与 members.js 的等级徽章风格保持一致 */
  var ROLES = {
    super: { label: '超级管理员', tone: 'accent' },
    admin: { label: '管理员', tone: 'info' }
  };

  /** 状态值 */
  var STATUS = {
    active: { label: '启用', tone: 'success' },
    disabled: { label: '禁用', tone: 'muted' }
  };

  /* ---------------------------- mock 数据 ---------------------------- */
  // 只预置创始者一个演示账号。员工账号由 super 在「管理员账号」页手动创建。
  function generateMockAdmins() {
    var now = Date.now();
    return [
      {
        id: 'adm1', username: 'admin', password: 'admin123',
        realname: '创始者', role: 'super', phone: '13800000000',
        status: 'active', lastLoginAt: now - 3600000, loginCount: 23,
        createdAt: now - 60 * 86400000, updatedAt: now - 3600000
      }
    ];
  }

  var state = { admins: Storage ? Storage.readLS(ADMINS_KEY, null) : null };
  if (!state.admins || !Array.isArray(state.admins)) {
    state.admins = generateMockAdmins();
    if (Storage) Storage.writeLS(ADMINS_KEY, state.admins);
  }
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function persist() { if (Storage) Storage.writeLS(ADMINS_KEY, state.admins); emit(); }

  /* ---------------------------- 工具 ---------------------------- */
  function nextId() {
    var max = 0;
    state.admins.forEach(function (a) {
      var match = /^adm(\d+)$/.exec(String(a.id));
      if (match) { var n = parseInt(match[1], 10); if (n > max) max = n; }
    });
    return 'adm' + String(max + 1);
  }

  function now() { return Date.now(); }

  /* ---------------------------- 查询 ---------------------------- */
  /** 返回全部管理员（不含 password） */
  function list() {
    return state.admins.map(function (a) {
      var copy = Object.assign({}, a);
      delete copy.password;
      return copy;
    });
  }

  /** 单个管理员（不含 password） */
  function get(id) {
    var a = state.admins.find(function (x) { return x.id === id; });
    if (!a) return null;
    var copy = Object.assign({}, a);
    delete copy.password;
    return copy;
  }

  /** 按用户名查找（含 password，仅内部鉴权用） */
  function findByUsername(username) {
    var u = String(username || '').trim();
    return state.admins.find(function (a) { return a.username === u; }) || null;
  }

  /* ---------------------------- 写入 ---------------------------- */
  /**
   * 新增管理员
   * @param {{ username, password, realname, role, phone }} payload
   */
  function add(payload) {
    if (!payload || !payload.username) return null;
    // 用户名唯一校验
    if (findByUsername(payload.username)) return { error: 'USERNAME_TAKEN' };
    var a = {
      id: nextId(),
      username: String(payload.username).trim(),
      password: String(payload.password || 'admin123'),
      realname: String(payload.realname || '').trim() || payload.username,
      role: ROLES[String(payload.role)] ? String(payload.role) : 'admin',
      phone: String(payload.phone || '').trim(),
      status: STATUS[String(payload.status)] ? String(payload.status) : 'active',
      lastLoginAt: 0,
      loginCount: 0,
      createdAt: now(),
      updatedAt: now()
    };
    state.admins = [a].concat(state.admins);
    persist();
    var copy = Object.assign({}, a);
    delete copy.password;
    return copy;
  }

  /**
   * 编辑管理员（密码不会被 update 改掉，改密码必须用 changePassword / resetPassword）
   * @returns {boolean} 是否实际变动
   */
  function update(id, patch) {
    if (!patch) return false;
    var a = state.admins.find(function (x) { return x.id === id; });
    if (!a) return false;
    // 禁止改密码（防误操作）
    var safePatch = Object.assign({}, patch);
    delete safePatch.password;
    Object.assign(a, safePatch);
    if (safePatch.realname !== undefined) a.realname = String(safePatch.realname).trim();
    if (safePatch.phone !== undefined) a.phone = String(safePatch.phone || '').trim();
    if (safePatch.role !== undefined && !ROLES[safePatch.role]) a.role = 'admin';
    if (safePatch.status !== undefined && !STATUS[safePatch.status]) a.status = 'active';
    a.updatedAt = now();
    persist();
    return true;
  }

  /** 启用/禁用 */
  function setStatus(id, status) {
    if (!STATUS[status]) return false;
    var a = state.admins.find(function (x) { return x.id === id; });
    if (!a) return false;
    a.status = status;
    a.updatedAt = now();
    persist();
    return true;
  }

  /** 删除（不能删自己） */
  function remove(id, selfId) {
    if (selfId && id === selfId) return { ok: false, message: '不能删除自己' };
    var a = state.admins.find(function (x) { return x.id === id; });
    if (!a) return { ok: false, message: '账号不存在' };
    if (a.role === 'super') return { ok: false, message: '超级管理员不可删除' };
    var before = state.admins.length;
    state.admins = state.admins.filter(function (x) { return x.id !== id; });
    if (state.admins.length === before) return { ok: false, message: '删除失败' };
    persist();
    return { ok: true };
  }

  /**
   * 重置密码（管理员账号管理页面用，不需要校验旧密码）
   * @returns {{ ok: boolean, message?: string }}
   */
  function resetPassword(id, newPwd) {
    var a = state.admins.find(function (x) { return x.id === id; });
    if (!a) return { ok: false, message: '账号不存在' };
    if (!newPwd || newPwd.length < 6) return { ok: false, message: '密码至少 6 位' };
    a.password = String(newPwd);
    a.updatedAt = now();
    persist();
    return { ok: true };
  }

  /**
   * 校验旧密码（profile 页改自己密码用）
   */
  function verifyPassword(id, oldPwd) {
    var a = state.admins.find(function (x) { return x.id === id; });
    return a && a.password === String(oldPwd);
  }

  /**
   * 修改自己的密码（带旧密码校验）
   * @returns {{ ok: boolean, message?: string }}
   */
  function changePassword(id, oldPwd, newPwd) {
    var a = state.admins.find(function (x) { return x.id === id; });
    if (!a) return { ok: false, message: '账号不存在' };
    if (a.password !== String(oldPwd)) return { ok: false, message: '旧密码不正确' };
    if (!newPwd || newPwd.length < 6) return { ok: false, message: '新密码至少 6 位' };
    if (newPwd === oldPwd) return { ok: false, message: '新密码不能与旧密码相同' };
    a.password = String(newPwd);
    a.updatedAt = now();
    persist();
    return { ok: true };
  }

  /** 登录成功后更新 lastLoginAt + loginCount */
  function touchLogin(id) {
    var a = state.admins.find(function (x) { return x.id === id; });
    if (!a) return;
    a.lastLoginAt = now();
    a.loginCount = (a.loginCount || 0) + 1;
    persist();
  }

  /* ---------------------------- 统计 ---------------------------- */
  function stats() {
    var arr = list();
    var byRole = { super: 0, admin: 0 };
    var byStatus = { active: 0, disabled: 0 };
    arr.forEach(function (a) {
      byRole[a.role] = (byRole[a.role] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });
    return {
      total: arr.length,
      superCount: byRole.super || 0,
      adminCount: byRole.admin || 0,
      disabledCount: byStatus.disabled || 0
    };
  }

  function resetAll() {
    state.admins = generateMockAdmins();
    persist();
  }

  /* ---------------------------- 【需求17】API 层：绑定管理员数据表 ---------------------------- */

  /** 拿到登录 token */
  function token() {
    return (global.Volta && global.Volta.Admin && global.Volta.Admin.getToken()) || '';
  }

  function apiHeaders() {
    return { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Bearer ' + token() };
  }

  /** DB 行 → 本地行结构（数字 id 与登录态 currentId 对齐） */
  function mapDbRow(r) {
    return {
      id: Number(r.id),
      username: r.username,
      realname: r.realname || r.username,
      phone: r.phone || '',
      email: r.email || '',
      role: r.role === 'super' ? 'super' : 'admin',
      status: String(r.status) === '1' || r.status === 'active' ? 'active' : 'disabled',
      lastLoginAt: r.lastLoginAt || null,
      loginCount: r.loginCount || 0,
      createdAt: r.createdAt || null,
      updatedAt: r.createdAt || null
    };
  }

  /**
   * 从后端管理员数据表（ssc_guanliyuan）拉取全量，替换本地列表。
   * @returns {Promise<Array>}  拉取后的列表
   */
  function fetchAll() {
    return fetch('/shuma/api/admin/admins?pageSize=200', { headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token() } })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.code === 0 && json.data && Array.isArray(json.data.list)) {
          state.admins = json.data.list.map(mapDbRow);
          if (Storage) Storage.writeLS(ADMINS_KEY, state.admins);
          emit();
        }
        return list();
      });
  }

  /** 新增管理员（POST /admin/admins，成功后重拉 DB） */
  function addViaApi(payload) {
    return fetch('/shuma/api/admin/admins', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.code === 0) return fetchAll().then(function () { return { ok: true, id: json.data && json.data.id, message: json.message }; });
        return { ok: false, message: json.message || '创建失败' };
      })
      .catch(function (e) { return { ok: false, message: '网络错误：' + (e.message || e) }; });
  }

  /** 编辑管理员（PUT /admin/admins/{id}，成功后重拉 DB） */
  function updateViaApi(id, patch) {
    return fetch('/shuma/api/admin/admins/' + id, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(patch) })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.code === 0) return fetchAll().then(function () { return { ok: true }; });
        return { ok: false, message: json.message || '更新失败' };
      })
      .catch(function (e) { return { ok: false, message: '网络错误：' + (e.message || e) }; });
  }

  /** 启用/禁用（PUT /admin/admins/{id}/status） */
  function setStatusViaApi(id, status) {
    return fetch('/shuma/api/admin/admins/' + id + '/status', { method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ status: status === 'disabled' ? 0 : 1 }) })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.code === 0) return fetchAll().then(function () { return { ok: true }; });
        return { ok: false, message: json.message || '操作失败' };
      })
      .catch(function (e) { return { ok: false, message: '网络错误：' + (e.message || e) }; });
  }

  /** 重置密码（PUT /admin/admins/{id}/reset-password，后端做复杂度校验） */
  function resetPwdViaApi(id, newPwd) {
    return fetch('/shuma/api/admin/admins/' + id + '/reset-password', { method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ newPassword: newPwd }) })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.code === 0) return { ok: true, message: json.message };
        return { ok: false, message: json.message || '重置失败' };
      })
      .catch(function (e) { return { ok: false, message: '网络错误：' + (e.message || e) }; });
  }

  /** 删除管理员（DELETE /admin/admins/{id}，不能删自己） */
  function removeViaApi(id, selfId) {
    if (selfId && Number(id) === Number(selfId)) return Promise.resolve({ ok: false, message: '不能删除自己' });
    return fetch('/shuma/api/admin/admins/' + id, { method: 'DELETE', headers: apiHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.code === 0) return fetchAll().then(function () { return { ok: true }; });
        return { ok: false, message: json.message || '删除失败' };
      })
      .catch(function (e) { return { ok: false, message: '网络错误：' + (e.message || e) }; });
  }

  global.Volta = global.Volta || {};
  global.Volta.Admins = {
    ADMINS_KEY: ADMINS_KEY,
    ROLES: ROLES,
    STATUS: STATUS,
    list: list,
    get: get,
    findByUsername: findByUsername,
    add: add,
    update: update,
    setStatus: setStatus,
    remove: remove,
    resetPassword: resetPassword,
    verifyPassword: verifyPassword,
    changePassword: changePassword,
    touchLogin: touchLogin,
    stats: stats,
    resetAll: resetAll,
    fetchAll: fetchAll,
    addViaApi: addViaApi,
    updateViaApi: updateViaApi,
    setStatusViaApi: setStatusViaApi,
    resetPwdViaApi: resetPwdViaApi,
    removeViaApi: removeViaApi,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
