/**
 * store-inventory.js —— 薄包装层，全部委托给 Volta.Store
 * 保留旧接口供 components.js / product.js / cart.js 调用
 * 真正的数据逻辑在 store.js 里
 */
(function (global) {
  var Store = global.Volta.Store;

  function getStock(id) { return Store ? Store.getStock(id) : 0; }
  function statusOf(id) { return Store ? Store.statusOf(id) : 'out'; }
  function thresholdOf(id) {
    var p = Store && Store.getProduct(id);
    return (p && p.threshold) ? Number(p.threshold) : 20;
  }
  function isOverridden(id) { return false; }

  var listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { console.warn(e); } }); }

  // 数据加载完成后通知所有监听器（商品卡片重新渲染）
  global.addEventListener('volta:data-ready', function () { emit(); });

  // 公开接口
  global.Volta.Inventory = {
    getStock: getStock,
    statusOf: statusOf,
    thresholdOf: thresholdOf,
    isOverridden: isOverridden,
    onChange: onChange,
    // Admin 功能在 Plant 前端不需要，返回空/假值
    setStock: function () { return false; },
    adjustStock: function () { return false; },
    deductForOrder: function () { return true; },
    restoreForOrder: function () { return true; },
    clearLogs: function () {},
    resetAll: function () {},
  };
})(window);
