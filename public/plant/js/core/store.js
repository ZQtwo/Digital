/**
 * store.js —— 干净的全局状态
 * 同时用 skuCode 和 dbId 做索引，确保 Inventory.getStock() 用 DB id 也能查到
 */
(function (global) {
  global.Volta = global.Volta || {};

  var products = [];          // API 返回的原始商品列表
  var bySku = {};             // skuCode -> product 索引（旧接口用）
  var byDbId = {};            // DB 整数 id -> product 索引（购物车/订单用）
  var isLoaded = false;

  function setProducts(list) {
    products = list || [];
    bySku = {};
    byDbId = {};
    products.forEach(function (p) {
      // 两种 key 都存，确保无论用 skuCode 还是 DB id 都能查到
      if (p.id)    bySku[p.id] = p;          // skuCode 如 "p01"
      if (p.dbId)  byDbId[p.dbId] = p;       // DB 整数 id 如 1
    });
    isLoaded = true;
  }

  function getProducts() { return products; }

  /** 按 id 查商品 —— 先试 skuCode，再试 DB id */
  function getProduct(id) {
    if (!id && id !== 0) return null;
    if (bySku[id]) return bySku[id];
    if (byDbId[id]) return byDbId[id];
    // 兼容：id 是字符串形式的 DB 整数（如 "1"）
    if (byDbId[parseInt(id, 10)]) return byDbId[parseInt(id, 10)];
    return null;
  }

  /** 按 id 查库存 —— 先试 skuCode，再试 DB id */
  function getStock(id) {
    if (!id && id !== 0) return 0;
    var p = bySku[id] || byDbId[id];
    if (!p && typeof id === 'string') p = byDbId[parseInt(id, 10)];
    return p ? (Number(p.stock) || 0) : 0;
  }

  function statusOf(id) {
    var s = getStock(id);
    if (s <= 0) return 'out';
    var p = getProduct(id);
    var threshold = p && p.threshold ? Number(p.threshold) : 20;
    return s <= threshold ? 'low' : 'ok';
  }

  function isLoaded_() { return isLoaded; }

  global.Volta.Store = {
    setProducts: setProducts,
    getProducts: getProducts,
    getProduct: getProduct,
    getStock: getStock,
    statusOf: statusOf,
    isLoaded: isLoaded_,
  };
})(window);
