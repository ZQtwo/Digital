/**
 * store-members.js —— 会员管理（后台 API 版）
 *
 * 直接调 Laravel 后端 API（同域）：
 *   GET    /shuma/api/admin/members          列表 + stats
 *   POST   /shuma/api/admin/members          新增
 *   GET    /shuma/api/admin/members/{id}     详情
 *   PUT    /shuma/api/admin/members/{id}     编辑
 *   DELETE /shuma/api/admin/members/{id}     删除
 *
 * Token 从 Volta.Admin.getToken() 读取（store-admin.js 登录后写入）。
 */
(function (global) {
  var Admin = global.Volta && global.Volta.Admin;
  var API_BASE = '/shuma/api/admin';

  /** 会员等级统一映射（code → { label, minSpent, tone }） */
  var MEMBER_LEVELS = {
    normal:   { label: '普通会员', minSpent: 0,    tone: 'muted' },
    silver:   { label: '银卡会员', minSpent: 1000, tone: 'info' },
    gold:     { label: '金卡会员', minSpent: 5000, tone: 'accent' },
    platinum: { label: '铂金会员', minSpent: 20000,tone: 'success' }
  };
  var LEVEL_ORDER = ['normal', 'silver', 'gold', 'platinum'];

  // —— 内存缓存 ——
  var cache = { list: null, stats: null, timestamp: 0 };
  var CACHE_TTL = 10000; // 10 秒
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function invalidate() { cache.list = null; cache.stats = null; cache.timestamp = 0; emit(); }

  function getToken() { return Admin ? Admin.getToken() : null; }
  function hasToken() { return !!getToken(); }

  /** 统一 fetch helper（自动加 token） */
  function apiFetch(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    headers['Accept'] = 'application/json';
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    return fetch(API_BASE + path, Object.assign({ headers: headers }, opts))
      .then(function (resp) { return resp.json(); })
      .then(function (json) {
        if (json.code === 401) { invalidate(); /* token 可能过期 */ }
        return json;
      });
  }

  /** API row → 前端 row 字段映射 */
  function toMemberRow(r) {
    if (!r) return null;
    return {
      id: r.id,
      memberCode: r.memberCode,
      name: r.name,
      phone: r.phone,
      levelCode: r.levelCode,
      levelOverride: r.levelOverride === 'NULL' ? null : r.levelOverride,
      level: r.level,  // 后端返回的生效等级（可能也需要再算一遍）
      totalSpent: Number(r.totalSpent) || 0,
      totalOrders: r.orderCount || 0,
      orderCount: r.orderCount || 0,
      balance: Number(r.balance) || 0,
      points: r.points || 0,
      status: r.status || 'normal',
      registerType: r.registerType,
      verifiedPhone: !!r.verifiedPhone,
      passwordSet: r.passwordSet !== false,
      createdAt: r.createdAt,
      lastActiveAt: r.lastActiveAt
    };
  }

  /** 根据消费金额自动计算等级（前端 fallback） */
  function levelBySpent(spent) {
    var s = Number(spent) || 0;
    var result = 'normal';
    LEVEL_ORDER.forEach(function (code) {
      if (s >= MEMBER_LEVELS[code].minSpent) result = code;
    });
    return result;
  }

  // —— 异步加载入口（首次调用时从 API 拉全量） ——
  function loadAll(force) {
    if (!force && cache.list && (Date.now() - cache.timestamp < CACHE_TTL)) {
      return Promise.resolve({ list: cache.list, stats: cache.stats });
    }
    return apiFetch('/members?pageSize=100')
      .then(function (json) {
        if (json.code !== 0) { throw new Error(json.message || '加载失败'); }
        var data = json.data;
        cache.list = (data.list || []).map(toMemberRow);
        cache.stats = data.stats;
        cache.timestamp = Date.now();
        return { list: cache.list, stats: cache.stats };
      });
  }

  /** 同步 list() — 首次返回空数组，后台异步填充；后续直接返回缓存 */
  function list() { return cache.list || []; }

  /** 确保数据已加载（页面 init 时调用） */
  function ensure() { return loadAll(false); }

  function get(id) {
    if (!cache.list) return null;
    var m = cache.list.find(function (x) { return String(x.id) === String(id); });
    return m || null;
  }

  /** POST /members 新增 */
  function add(payload) {
    var body = {
      name: String(payload.name || '').trim(),
      phone: String(payload.phone || '').trim(),
      password: String(payload.password || '123456'),
      levelCode: payload.levelCode || 'normal',
      balance: payload.balance || 0,
      points: payload.points || 0
    };
    if (!body.name) return Promise.reject(new Error('昵称必填'));
    return apiFetch('/members', {
      method: 'POST',
      body: JSON.stringify(body)
    }).then(function (json) {
      if (json.code !== 0) { throw new Error(json.message || '新增失败'); }
      invalidate();
      return json.data;
    });
  }

  /** PUT /members/{id} 编辑 */
  function update(id, patch) {
    if (!patch) return Promise.resolve(false);
    var body = {};
    if (patch.name !== undefined) body.name = String(patch.name).trim();
    if (patch.phone !== undefined) body.phone = String(patch.phone).trim();
    if (patch.levelCode !== undefined) body.levelCode = patch.levelCode;
    if (patch.levelOverride !== undefined) body.levelOverride = patch.levelOverride || null;
    if (patch.status !== undefined) body.status = patch.status;
    if (patch.balance !== undefined) body.balance = Number(patch.balance);
    if (patch.points !== undefined) body.points = Number(patch.points);
    return apiFetch('/members/' + id, {
      method: 'PUT',
      body: JSON.stringify(body)
    }).then(function (json) {
      if (json.code !== 0) { throw new Error(json.message || '更新失败'); }
      invalidate();
      return true;
    });
  }

  function setLevel(id, levelCode) {
    return update(id, { levelOverride: levelCode || null });
  }

  /** 设置状态 */
  function setStatus(id, status) {
    if (['normal', 'frozen', 'blacklist'].indexOf(status) === -1) return Promise.resolve(false);
    return update(id, { status: status });
  }

  /** DELETE /members/{id} */
  function remove(id) {
    return apiFetch('/members/' + id, { method: 'DELETE' })
      .then(function (json) {
        if (json.code !== 0) { throw new Error(json.message || '删除失败'); }
        invalidate();
        return true;
      });
  }

  /** 统计（从后端 stats 派生前端期望的结构） */
  function stats() {
    if (!cache.stats) { return { total: 0, byLevel: {}, byStatus: { normal: 0, frozen: 0, blacklist: 0 }, totalSpent: 0, totalOrders: 0 }; }
    var s = cache.stats;
    return {
      total: s.total || 0,
      byLevel: s.levelCounts || {},
      byStatus: { normal: s.normal || 0, frozen: s.frozen || 0, blacklist: s.blacklist || 0 },
      totalSpent: 0,  // 后端 stats 没给这个，前端可能不依赖
      totalOrders: 0,
      verifiedPhoneCount: s.verifiedPhoneCount || 0
    };
  }

  function resetAll() { invalidate(); }

  global.Volta = global.Volta || {};
  global.Volta.Members = {
    MEMBER_LEVELS: MEMBER_LEVELS,
    LEVEL_ORDER: LEVEL_ORDER,
    list: list,
    ensure: ensure,
    loadAll: loadAll,
    get: get,
    add: add,
    update: update,
    remove: remove,
    setLevel: setLevel,
    setStatus: setStatus,
    levelBySpent: levelBySpent,
    stats: stats,
    resetAll: resetAll,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
