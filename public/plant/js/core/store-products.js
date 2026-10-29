/**
 * store-products.js —— 商品运营层（前台只读 jQuery 版）
 *
 * 与前台 Volta.Data.products（只读 30 件基线）不同：本 store 把后台
 * 增 / 删 / 改 的覆盖层合并到基线后返回，让前台商品列表能读到
 * 后台新增/修改/删除的商品，实现前后台商品数据联动。
 *
 * localStorage 键：volta.products.overrides（与后台共用同一份）
 * 结构：
 *   {
 *     modified: { p01: { ...full product... } },  // 完整替换基线对应项
 *     removed:  ['p30'],                           // 基线中被删除的 id
 *     added:    [ { id: 'p31', ...full product... } ] // 后台新增项
 *   }
 *
 * 前台只暴露只读 API（list/get/stats），不暴露 add/update/remove。
 * 与库存的协作：库存走 Volta.Inventory（volta.inventory.* keys），
 * 本 store 只负责商品字段（名称 / 品类 / 价格 / 标签 / 上下架 等）。
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

  global.Volta = global.Volta || {};
  global.Volta.Products = {
    STATE_KEY: STATE_KEY,
    get modified() { return state.modified; },
    get removed() { return state.removed; },
    get added() { return state.added; },
    list: list,
    get: get,
    stats: stats,
    categoryStats: categoryStats,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
