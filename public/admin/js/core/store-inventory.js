/**
 * store-inventory.js —— 库存数据源（API 版）
 *
 * 全部操作走 Laravel 后端 API（同域）：
 *   GET    /shuma/api/admin/inventory           库存列表 + stats
 *   GET    /shuma/api/admin/inventory/stats      库存统计
 *   PUT    /shuma/api/admin/inventory/{id}/stock       设定库存
 *   PUT    /shuma/api/admin/inventory/{id}/threshold   设定预警线
 *   POST   /shuma/api/admin/inventory/adjust            单品入库/出库
 *   POST   /shuma/api/admin/inventory/batch             批量调整
 *   POST   /shuma/api/admin/inventory/logs/{id}/undo    撤销流水
 *
 * 前端页面通过 Volta.Inventory.rows() / stats() / setStock() / adjustStock()
 * 等方法操作库存，内部统一走 fetch → 后端 DB（ssc_shangpin.stock / ssc_kucun_rizhi）。
 */
(function (global) {
  var API_BASE = '/shuma/api/admin';

  var LOG_TYPES = {
    set: { label: '手动设定', tone: 'neutral' },
    in: { label: '入库', tone: 'in' },
    out: { label: '出库', tone: 'out' },
    order: { label: '订单扣减', tone: 'out' },
    restore: { label: '订单回补', tone: 'in' },
    undo: { label: '撤销回滚', tone: 'neutral' }
  };
  var UNDOABLE_TYPES = ['set', 'in', 'out'];
  var DEFAULT_THRESHOLD = 20;

  // —— 内存缓存 ——
  var state = { rows: [], stats: null, timestamp: 0 };
  var CACHE_TTL = 5000; // 5 秒
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  // 【修复】invalidate 只标记数据过期，保留旧 rows 展示，
  // 避免写操作后 emit → 页面刷新时 rows=[] 的空窗渲染出「没有匹配的商品」空态
  function invalidate() { state.timestamp = 0; emit(); }

  /** 每次动态从 global 取 Admin，避免加载顺序问题 */
  function getAdmin() {
    var V = global.Volta;
    return V ? V.Admin : null;
  }
  function getToken() {
    var a = getAdmin();
    return a ? a.getToken() : null;
  }

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
        if (json.code === 401) { invalidate(); }
        return json;
      });
  }

  /** API 列表 row → 前端 row 字段映射 */
  function toRow(r) {
    var price = Number(r.price) || 0;
    var stock = Number(r.stock) || 0;
    var threshold = Number(r.threshold) || 0;
    var status = stock <= 0 ? 'out' : (stock <= threshold ? 'low' : 'ok');
    return {
      id: r.skuCode || String(r.id),     // 前端用 skuCode 作为行 id（如 p01）
      _dbId: r.id,                        // 真实 DB id（给 API 用）
      name: r.name,
      brand: r.brand || '',
      brandId: r.brandId,
      category: r.categoryCode || r.category || '', // 用 code 做匹配
      categoryCode: r.categoryCode || '',
      categoryName: r.category || '',
      art: r.art || '',
      artSeed: r.artSeed || 1,
      price: price,
      sales: Number(r.sales) || 0,
      stock: stock,
      baseStock: stock,
      threshold: threshold,
      status: status,
      value: stock * price,
      overridden: false
    };
  }

  /** 从 API 加载库存列表（带 stats）；force=true 跳过 5 秒缓存（轮询实时用） */
  function loadFromServer(force) {
    if (!force && state.rows.length && (Date.now() - state.timestamp) < CACHE_TTL) {
      return Promise.resolve({ rows: state.rows, stats: state.stats });
    }
    return apiFetch('/inventory?pageSize=500').then(function (json) {
      if (json.code !== 0 || !json.data) return { rows: [], stats: null };
      var data = json.data;
      var items = data.list || data.data || data.items || [];
      var rows = items.map(toRow);
      state.rows = rows;
      state.stats = data.stats ? {
        skuCount: data.stats.total || rows.length,
        totalStock: data.stats.totalStock || 0,
        totalValue: Math.round(rows.reduce(function (s, r) { return s + r.value; }, 0)),
        lowCount: data.stats.lowStock || 0,
        outCount: data.stats.outOfStock || 0,
        okCount: rows.length - (data.stats.lowStock || 0) - (data.stats.outOfStock || 0),
        alertCount: (data.stats.lowStock || 0) + (data.stats.outOfStock || 0),
        avgStock: rows.length ? Math.round((data.stats.totalStock || 0) / rows.length) : 0
      } : computeLocalStats(rows);
      state.timestamp = Date.now();
      emit();
      return { rows: state.rows, stats: state.stats };
    }).catch(function () { return { rows: state.rows, stats: state.stats }; });
  }

  function computeLocalStats(rows) {
    var totalStock = rows.reduce(function (s, r) { return s + r.stock; }, 0);
    var totalValue = rows.reduce(function (s, r) { return s + r.value; }, 0);
    var low = rows.filter(function (r) { return r.status === 'low'; }).length;
    var out = rows.filter(function (r) { return r.status === 'out'; }).length;
    return {
      skuCount: rows.length, totalStock: totalStock, totalValue: Math.round(totalValue),
      lowCount: low, outCount: out, okCount: rows.length - low - out,
      alertCount: low + out, avgStock: rows.length ? Math.round(totalStock / rows.length) : 0
    };
  }

  /** rows() —— 返回缓存的库存列表（同步）；首次调用自动触发加载 */
  function rows() {
    if (!state.rows.length && hasToken()) {
      loadFromServer();
    }
    return state.rows;
  }

  function stats() {
    if (!state.stats && hasToken()) {
      loadFromServer();
    }
    return state.stats || { skuCount: 0, totalStock: 0, totalValue: 0, lowCount: 0, outCount: 0, okCount: 0, alertCount: 0, avgStock: 0 };
  }

  function alertRows() {
    return rows().filter(function (r) { return r.status !== 'ok'; }).sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'out' ? -1 : 1;
      var ra = a.threshold ? a.stock / a.threshold : 0;
      var rb = b.threshold ? b.stock / b.threshold : 0;
      return ra - rb;
    });
  }

  function categoryDistribution() {
    var map = new Map();
    rows().forEach(function (r) {
      var key = r.categoryName || r.category;
      var hit = map.get(key) || { id: r.category, name: key, stock: 0, skuCount: 0, value: 0 };
      hit.stock += r.stock; hit.skuCount += 1; hit.value += r.value;
      map.set(key, hit);
    });
    return Array.from(map.values()).sort(function (a, b) { return b.stock - a.stock; });
  }

  function topByStock(n) {
    n = n || 8;
    return rows().slice().sort(function (a, b) { return b.stock - a.stock; }).slice(0, n);
  }

  /**
   * 设定库存 —— PUT /inventory/{productId}/stock
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  function setStock(id, value, opts) {
    opts = opts || {};
    var dbId = getDbId(id);
    if (!dbId) return Promise.resolve({ ok: false, message: '商品不存在' });
    return apiFetch('/inventory/' + dbId + '/stock', {
      method: 'PUT',
      body: JSON.stringify({ quantity: Math.max(0, Math.floor(Number(value) || 0)), reason: opts.reason || '手动设定库存' })
    }).then(function (json) {
      if (json.code === 0) { invalidate(); return { ok: true, message: json.message }; }
      return { ok: false, message: json.message || '设定失败' };
    });
  }

  /**
   * 调整库存（入库=正 / 出库=负） —— POST /inventory/adjust
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  function adjustStock(id, delta, opts) {
    opts = opts || {};
    var dbId = getDbId(id);
    if (!dbId) return Promise.resolve({ ok: false, message: '商品不存在' });
    var d = Math.trunc(Number(delta) || 0);
    if (d === 0) return Promise.resolve({ ok: false, message: '变动为 0' });
    return apiFetch('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ productId: dbId, quantity: d, reason: opts.reason || (d > 0 ? '入库' : '出库') })
    }).then(function (json) {
      if (json.code === 0) { invalidate(); return { ok: true, message: json.message }; }
      return { ok: false, message: json.message || '调整失败' };
    });
  }

  /**
   * 批量调整 —— POST /inventory/batch
   */
  function batchApply(productIds, opts) {
    opts = opts || {};
    var v = Math.trunc(Number(opts.value) || 0);
    if (v === 0) return Promise.resolve({ changed: 0, groupId: null });
    var items = productIds.map(function (id) {
      var dbId = getDbId(id);
      return dbId ? { productId: dbId, quantity: (opts.mode === 'in' ? 1 : opts.mode === 'out' ? -1 : 1) * (opts.mode === 'set' ? v : Math.abs(v)) } : null;
    }).filter(Boolean);
    if (!items.length) return Promise.resolve({ changed: 0, groupId: null });
    if (opts.mode === 'set') {
      // set 模式用 batch 不行（quantity 不是 delta），逐一下发
      return Promise.all(productIds.map(function (id) { return setStock(id, v, { reason: opts.reason || '批量设定' }); }))
        .then(function (results) {
          invalidate();
          var changed = results.filter(function (r) { return r.ok; }).length;
          return { changed: changed, groupId: null };
        });
    }
    var quantityMap = {};
    items.forEach(function (it) { quantityMap[it.productId] = it.quantity; });
    return apiFetch('/inventory/batch', {
      method: 'POST',
      body: JSON.stringify({ items: items, reason: opts.reason || '批量调整' })
    }).then(function (json) {
      invalidate();
      if (json.code === 0) return { changed: productIds.length, groupId: json.data ? json.data.groupId : null };
      return { changed: 0, groupId: null };
    });
  }

  function setThreshold(id, value) {
    var dbId = getDbId(id);
    if (!dbId) return Promise.resolve(false);
    return apiFetch('/inventory/' + dbId + '/threshold', {
      method: 'PUT',
      body: JSON.stringify({ threshold: Math.max(0, Math.floor(Number(value) || 0)) })
    }).then(function (json) {
      if (json.code === 0) { invalidate(); return true; }
      return false;
    });
  }

  function batchSetThreshold(productIds, value) {
    var tasks = productIds.map(function (id) { return setThreshold(id, value); });
    return Promise.all(tasks).then(function (results) {
      return results.filter(function (r) { return r === true; }).length;
    });
  }

  function resetProduct(id) {
    // 把 stock 设为 data.js 里的基线值（或查 API 初始值）
    var row = rows().find(function (r) { return r.id === id; });
    if (!row) return Promise.resolve({ ok: false, message: '商品不存在' });
    var baselineStock = row.baseStock || row.stock;
    return setStock(id, baselineStock, { reason: '恢复初始库存' });
  }

  function undoneGroups() { return new Set(); }
  function lastUndoableGroup() { return null; }
  function undoGroup() { return Promise.resolve(0); }

  /** —— 以下为兼容旧版的同步只读接口 —— */
  function getStock(id) {
    var row = state.rows.find(function (r) { return r.id === id; });
    return row ? row.stock : 0;
  }
  function thresholdOf(id) {
    var row = state.rows.find(function (r) { return r.id === id; });
    return row ? row.threshold : DEFAULT_THRESHOLD;
  }
  function statusOf(id) {
    var row = state.rows.find(function (r) { return r.id === id; });
    return row ? row.status : 'ok';
  }
  function isOverridden(id) {
    var row = state.rows.find(function (r) { return r.id === id; });
    return row ? row.overridden : false;
  }
  function checkAvailability(items) {
    var shortage = [];
    items.forEach(function (it) {
      var avail = getStock(it.productId);
      if (it.qty > avail) {
        shortage.push({ productId: it.productId, name: it.name || it.productId, need: it.qty, avail: avail });
      }
    });
    return shortage;
  }
  function deductForOrder(items, orderId) {
    var shortage = checkAvailability(items);
    if (shortage.length) return { ok: false, shortage: shortage };
    var tasks = items.map(function (it) {
      return adjustStock(it.productId, -it.qty, { reason: '订单出库' + (orderId ? ' ' + orderId : '') });
    });
    return Promise.all(tasks).then(function (results) {
      var ok = results.every(function (r) { return r.ok; });
      return { ok: ok, shortage: ok ? [] : shortage };
    });
  }
  function restoreForOrder(items, orderId) {
    var tasks = items.map(function (it) {
      return adjustStock(it.productId, it.qty, { reason: '订单回补' + (orderId ? ' ' + orderId : '') });
    });
    return Promise.all(tasks).then(function (results) {
      return results.filter(function (r) { return r.ok; }).length;
    });
  }
  function clearLogs() { /* API 版不清除，日志存在 DB */ }
  function resetAll() { invalidate(); }
  function removeLog() { /* no-op */ }

  /** id → DB id（前端用 skuCode，API 用数字 id） */
  function getDbId(id) {
    var row = state.rows.find(function (r) { return r.id === id; });
    return row ? row._dbId : null;
  }

  function hasToken() { return !!getToken(); }

  global.Volta = global.Volta || {};
  global.Volta.Inventory = {
    DEFAULT_THRESHOLD: DEFAULT_THRESHOLD,
    LOG_TYPES: LOG_TYPES,
    UNDOABLE_TYPES: UNDOABLE_TYPES,
    get rows() { return state.rows; },
    get statsCached() { return state.stats; },
    // 同步只读接口（兼容旧版）
    rows: rows,
    stats: stats,
    alertRows: alertRows,
    categoryDistribution: categoryDistribution,
    topByStock: topByStock,
    getStock: getStock,
    thresholdOf: thresholdOf,
    statusOf: statusOf,
    isOverridden: isOverridden,
    checkAvailability: checkAvailability,
    undoneGroups: undoneGroups,
    lastUndoableGroup: lastUndoableGroup,
    // 异步写接口（Promise）
    setStock: setStock,
    adjustStock: adjustStock,
    batchApply: batchApply,
    setThreshold: setThreshold,
    batchSetThreshold: batchSetThreshold,
    resetProduct: resetProduct,
    deductForOrder: deductForOrder,
    restoreForOrder: restoreForOrder,
    undoGroup: undoGroup,
    clearLogs: clearLogs,
    resetAll: resetAll,
    removeLog: removeLog,
    // 手动刷新；force=true 跳过缓存（库存页轮询实时拉取用）
    refresh: function (force) { invalidate(); return loadFromServer(force); },
    onChange: function (fn) { listeners.push(fn); }
  };

  // 页面加载时自动拉一次（如果已登录）
  $(function () {
    if (hasToken()) loadFromServer();
  });
})(window);
