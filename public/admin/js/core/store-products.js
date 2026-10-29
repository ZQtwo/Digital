/**
 * store-products.js —— 商品运营层（后台 jQuery 版）
 *
 * 与前端 Volta.Data.products（只读 30 件基线）不同：后台支持增 / 删 / 改。
 * 设计为「覆盖层」：基线不动，所有改动持久化到 localStorage，
 * 渲染时把基线 + 覆盖合并后返回。
 *
 * localStorage 键：volta.products.overrides
 * 结构：
 *   {
 *     modified: { p01: { ...full product... } },  // 完整替换基线对应项
 *     removed:  ['p30'],                           // 基线中被删除的 id
 *     added:    [ { id: 'p31', ...full product... } ] // 后台新增项
 *   }
 *
 * 与库存的协作：库存走 Volta.Inventory（volta.inventory.* keys），
 * 本 store 只负责商品字段（名称 / 品类 / 价格 / 标签 / 上下架 等），
 * 不重复保存 stock。
 */
(function (global) {
  var Storage = global.Volta && global.Volta.Storage;
  var Data = global.Volta && global.Volta.Data;
  var STATE_KEY = 'volta.products.overrides';

  var baseline = {};
  var productMap = {};
  var baselineOrder = [];
  (Data ? Data.products : []).forEach(function (p) {
    baseline[p.id] = p;
    productMap[p.id] = p;
    baselineOrder.push(p.id);
  });

  function emptyState() { return { modified: {}, removed: [], added: [] }; }
  var saved = Storage ? Storage.readLS(STATE_KEY, emptyState()) : emptyState();
  if (!saved || typeof saved !== 'object') saved = emptyState();
  ['modified', 'removed', 'added'].forEach(function (k) {
    if (!saved[k] || typeof saved[k] !== 'object') saved[k] = (k === 'modified' ? {} : (k === 'removed' ? [] : []));
  });
  var state = saved;
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function persist() { if (Storage) Storage.writeLS(STATE_KEY, state); emit(); }

  function clampPrice(n) { return Math.max(0, Math.round(Number(n) || 0)); }

  /** 生成新 id：基于已用最大序号 +1 */
  function nextId() {
    var max = 0;
    function scan(id) {
      var m = /^p(\d+)$/.exec(String(id));
      if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
    }
    Object.keys(baseline).forEach(scan);
    Object.keys(state.modified).forEach(scan);
    state.added.forEach(function (p) { scan(p.id); });
    return 'p' + String(max + 1).padStart(2, '0');
  }

  /** 合并基线 + 覆盖后的完整列表 */
  function list() {
    var result = [];
    // 1. 基线（跳过 removed，应用 modified）
    baselineOrder.forEach(function (id) {
      if (state.removed.indexOf(id) !== -1) return;
      var p = state.modified[id] || baseline[id];
      if (p) result.push(Object.assign({}, p));
    });
    // 2. 后台新增
    state.added.forEach(function (p) { result.push(Object.assign({}, p)); });
    return result;
  }

  function get(id) {
    if (state.removed.indexOf(id) !== -1) return null;
    if (state.modified[id]) return Object.assign({}, state.modified[id]);
    var added = state.added.find(function (p) { return p.id === id; });
    if (added) return Object.assign({}, added);
    if (baseline[id]) return Object.assign({}, baseline[id]);
    return null;
  }

  /**
   * 新增商品
   * @param {Object} payload  { name, brand, category, price, listPrice, art, artSeed, tags, ... }
   * @returns {Object|null} 新建的商品（含 id）
   */
  function add(payload) {
    if (!payload || !payload.name) return null;
    var id = nextId();
    var product = {
      id: id,
      name: String(payload.name).trim(),
      brand: payload.brand || 'VOLTA',
      category: payload.category || 'R01',
      art: payload.art || 'default',
      artSeed: Number(payload.artSeed) || (Math.floor(Math.random() * 99) + 1),
      price: clampPrice(payload.price),
      listPrice: clampPrice(payload.listPrice) || clampPrice(payload.price),
      rating: Number(payload.rating) || 5,
      ratingCount: Number(payload.ratingCount) || 0,
      sales: Number(payload.sales) || 0,
      stock: Number(payload.stock) || 0,
      tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 3) : [],
      highlights: Array.isArray(payload.highlights) ? payload.highlights.slice(0, 4) : [],
      desc: payload.desc || '',
      options: Array.isArray(payload.options) ? payload.options : [],
      specs: payload.specs && typeof payload.specs === 'object' ? payload.specs : {},
      images: Array.isArray(payload.images) ? payload.images.slice(0, 5) : [],
      video: payload.video || null,
      onSale: payload.onSale !== false
    };
    state.added = [product].concat(state.added);
    persist();
    return product;
  }

  /**
   * 修改商品（合并 patch 到现有商品）
   * @returns {boolean} 是否实际变动
   */
  function update(id, patch) {
    if (!patch) return false;
    var current = get(id);
    if (!current) return false;
    var next = Object.assign({}, current, patch);
    // 价格字段单独兜底
    if (patch.price !== undefined) next.price = clampPrice(patch.price);
    if (patch.listPrice !== undefined) next.listPrice = clampPrice(patch.listPrice);
    if (patch.tags) next.tags = patch.tags.slice(0, 3);
    if (patch.highlights) next.highlights = patch.highlights.slice(0, 4);

    // 区分：是 added 还是 baseline/modified
    var addedIdx = state.added.findIndex(function (p) { return p.id === id; });
    if (addedIdx !== -1) {
      state.added[addedIdx] = next;
    } else {
      state.modified[id] = next;
    }
    persist();
    return true;
  }

  /**
   * 删除商品
   * - 基线项：写入 removed
   * - modified 项：移出 modified 并加入 removed
   * - added 项：直接从 added 删除
   */
  function remove(id) {
    var addedIdx = state.added.findIndex(function (p) { return p.id === id; });
    if (addedIdx !== -1) {
      state.added.splice(addedIdx, 1);
      persist();
      return true;
    }
    var changed = false;
    if (state.modified[id]) {
      delete state.modified[id];
      changed = true;
    }
    if (baseline[id] && state.removed.indexOf(id) === -1) {
      state.removed.push(id);
      changed = true;
    }
    if (changed) persist();
    return changed;
  }

  /** 上下架切换（便利方法） */
  function setOnSale(id, onSale) {
    var p = get(id);
    if (!p) return false;
    if (p.onSale === !!onSale) return false;
    return update(id, { onSale: !!onSale });
  }

  /**
   * 【v2】从后端数据库拉商品列表，整体替换本地基线（并清空本地覆盖）。
   * GET /shuma/api/admin/products?pageSize=500
   * @returns {Promise<Array>} DB 商品列表
   */
  function fetchAll() {
    var token = global.Volta && global.Volta.Admin && global.Volta.Admin.getToken();
    return fetch('/shuma/api/admin/products?pageSize=500', {
      headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token }
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (json.code !== 0 || !json.data || !json.data.list) throw new Error(json.message || '拉取商品失败');
      var rows = json.data.list.map(function (p) {
        return {
          id: p.id,
          skuCode: p.skuCode || '',
          name: p.name,
          brand: p.brand || 'VOLTA',
          brandId: p.brandId,
          category: p.category || '未分类',
          categoryId: p.categoryId,
          art: p.art || 'default',
          artSeed: Number(p.artSeed) || 1,
          price: Math.round(Number(p.price) || 0),
          listPrice: Math.round(Number(p.listPrice) || Number(p.price) || 0),
          rating: Number(p.rating) || 5,
          ratingCount: Number(p.ratingCount) || 0,
          sales: Number(p.sales) || 0,
          stock: Number(p.stock) || 0,
          threshold: Number(p.threshold) || 20,
          tags: [],
          highlights: [],
          desc: '',
          options: [],
          specs: {},
          images: [],
          onSale: p.onSale !== false
        };
      });
      // 重建基线 + 清空本地覆盖（DB 为唯一事实来源）
      baseline = {};
      productMap = {};
      baselineOrder = [];
      rows.forEach(function (p) {
        baseline[p.id] = p;
        productMap[p.id] = p;
        baselineOrder.push(p.id);
      });
      state.modified = {};
      state.removed = [];
      state.added = [];
      persist();
      return rows;
    });
  }

  /** 设价（便利方法） */
  function setPrice(id, price) {
    return update(id, { price: clampPrice(price) });
  }

  /** 统计 */
  function stats() {
    var arr = list();
    var onSale = arr.filter(function (p) { return p.onSale !== false; }).length;
    var offSale = arr.length - onSale;
    var modified = Object.keys(state.modified).length;
    var removed = state.removed.length;
    var added = state.added.length;
    return {
      total: arr.length,
      baseline: baselineOrder.length,
      onSale: onSale,
      offSale: offSale,
      modifiedCount: modified,
      removedCount: removed,
      addedCount: added
    };
  }

  /** 按分类统计 */
  function categoryStats() {
    var map = {};
    list().forEach(function (p) {
      var hit = map[p.category] || { id: p.category, total: 0, onSale: 0 };
      hit.total += 1;
      if (p.onSale !== false) hit.onSale += 1;
      map[p.category] = hit;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  /** 重置全部覆盖（回到基线 30 件） */
  function resetAll() {
    state = emptyState();
    persist();
  }

  global.Volta = global.Volta || {};
  global.Volta.Products = {
    STATE_KEY: STATE_KEY,
    get modified() { return state.modified; },
    get removed() { return state.removed; },
    get added() { return state.added; },
    list: list,
    get: get,
    fetchAll: fetchAll,
    add: add,
    update: update,
    remove: remove,
    setOnSale: setOnSale,
    setPrice: setPrice,
    stats: stats,
    categoryStats: categoryStats,
    resetAll: resetAll,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
