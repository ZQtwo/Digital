/**
 * store-cart.js —— 购物车（API 优先 + localStorage fallback）
 * 登录态 → 所有操作走 /cart-api（后端持久化到 DB）
 * 未登录 → 降级 localStorage，加/改操作后提示登录
 * localStorage key = 'volta.cart'（未登录时使用）
 */
(function (global) {
  var Storage = global.Volta.Storage;
  var API = global.Volta.API;
  var Data = global.Volta.Data;

  var CART_KEY = 'volta.cart';
  var state = { items: [], _loaded: false };
  var listeners = [];

  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  /** 当前是否登录 */
  function isLoggedIn() {
    return !!(API && API.getToken && API.getToken());
  }

  /** 生成前端 lineKey（登录/未登录通用） */
  function lineKeyOf(productId, selection) {
    selection = selection || {};
    var sig = Object.keys(selection).sort().map(function (k) { return k + ':' + selection[k]; }).join('|');
    return productId + '::' + sig;
  }

  /** 未登录时的 persist：只写 localStorage */
  function persistLocal() {
    Storage.writeLS(CART_KEY, state.items);
    emit();
  }

  /**
   * 登录态下从 API 刷新购物车（完整替换 state.items）
   * API 返回: { items: [{id, productId, skuCode, name, cover, brand, price, quantity, specSnapshot, subtotal, outOfStock}], totalQty, totalAmount }
   */
  function refreshFromApi() {
    if (!isLoggedIn()) return Promise.resolve(null);
    return API.Member.cart().then(function (resp) {
      var apiItems = (resp && resp.items) ? resp.items : [];
      state.items = apiItems.map(function (it) {
        // 后端 productId 是整数 dbId → 前端通过 Data 映射 skuCode
        var skuCode = it.skuCode;
        if (!skuCode && Data && typeof Data.getSkuByDbId === 'function') {
          skuCode = Data.getSkuByDbId(it.productId) || String(it.productId);
        }
        var product = Data && Data.getProduct ? Data.getProduct(skuCode) : null;
        return {
          // 后端整数 id（用于 update/remove）
          id: it.id,
          // 前端 skuCode（用于 Data 查询）
          key: String(it.productId), // 登录态下用 productId 做 key（后端不区分规格）
          productId: String(it.productId), // 存字符串版 dbId
          dbId: it.productId,
          skuCode: skuCode,
          name: it.name || (product ? product.name : ''),
          brand: it.brand || (product ? product.brand : ''),
          art: product ? product.art : '',
          artSeed: product ? product.artSeed : '',
          cover: it.cover || (product ? product.cover : ''),
          price: Number(it.price) || (product ? product.price : 0),
          qty: Number(it.quantity) || 1,
          outOfStock: !!it.outOfStock,
          options: it.specSnapshot || {},
          subtotal: Number(it.subtotal) || 0,
          checked: true // 登录态下默认全选
        };
      });
      state._loaded = true;
      emit();
      return state.items;
    }).catch(function (err) {
      console.warn('[Cart] API 刷新失败', err && err.message);
      return null;
    });
  }

  /**
   * 确保 state 已加载（登录态自动从 API 拉，未登录从 localStorage 读）
   */
  function ensureLoaded() {
    if (state._loaded) return Promise.resolve(state.items);
    if (isLoggedIn()) {
      return refreshFromApi().then(function () { return state.items; });
    } else {
      state.items = Storage.readLS(CART_KEY, []);
      state._loaded = true;
      emit();
      return Promise.resolve(state.items);
    }
  }

  /** DB productId 映射辅助 */
  function toDbProductId(product) {
    if (!product) return null;
    // product 可能直接就是 skuCode 字符串
    if (typeof product === 'string') {
      if (Data && typeof Data.getDbProductId === 'function') {
        var id = Data.getDbProductId(product);
        if (id) return id;
      }
      var p = Data && Data.getProduct ? Data.getProduct(product) : null;
      return p && p.dbId ? p.dbId : null;
    }
    // product 是对象
    if (product.dbId) return product.dbId;
    if (Data && typeof Data.getDbProductId === 'function') {
      var id2 = Data.getDbProductId(product.id || product.skuCode);
      if (id2) return id2;
    }
    return product.id || product.skuCode || null;
  }

  /** 规格选择 → specSnapshot（存 options 对象给后端） */
  function toSpecSnapshot(selection) {
    if (!selection || typeof selection !== 'object') return null;
    var keys = Object.keys(selection);
    if (!keys.length) return null;
    return keys.reduce(function (acc, k) {
      acc[k] = selection[k];
      return acc;
    }, {});
  }

  /* ======= 纯计算方法（不涉及持久化，随时可用） ======= */
  function lineCount() { return state.items.length; }
  function totalQty() { return state.items.reduce(function (s, it) { return s + it.qty; }, 0); }
  function subtotal() { return state.items.reduce(function (s, it) { return s + it.price * it.qty; }, 0); }
  function checkedItems() { return state.items.filter(function (it) { return it.checked && !it.outOfStock; }); }
  function checkedQty() { return checkedItems().reduce(function (s, it) { return s + it.qty; }, 0); }
  function checkedSubtotal() { return checkedItems().reduce(function (s, it) { return s + it.price * it.qty; }, 0); }
  function allChecked() { return state.items.length > 0 && state.items.every(function (it) { return it.checked; }); }
  function qtyOfProduct(productId) {
    return state.items.filter(function (it) {
      return String(it.productId) === String(productId) || String(it.dbId) === String(productId);
    }).reduce(function (s, it) { return s + it.qty; }, 0);
  }

  function unitPriceOf(product, selection) {
    selection = selection || {};
    var price = product.price;
    (product.options || []).forEach(function (group) {
      var picked = selection[group.name];
      var hit = group.values.find(function (v) { return v.label === picked; });
      if (hit && hit.delta) price += hit.delta;
    });
    return price;
  }

  function stockOfProduct(productId) {
    if (global.Volta.Inventory && typeof global.Volta.Inventory.getStock === 'function') {
      return global.Volta.Inventory.getStock(productId);
    }
    if (Data && Data.getProduct) {
      var p = Data.getProduct(productId);
      return p ? (p.stock || 0) : 0;
    }
    return 99;
  }

  /* ======= 核心方法 ======= */

  /**
   * 加购
   * @param {object|string} product 商品对象或 skuCode
   * @param {object} selection 规格选择 {name: label}
   * @param {number} qty 数量
   */
  function add(product, selection, qty) {
    selection = selection || {}; qty = qty || 1;

    var productObj = typeof product === 'string' ? (Data && Data.getProduct ? Data.getProduct(product) : null) : product;
    var skuCode = typeof product === 'string' ? product : (product.id || product.skuCode);
    var dbId = toDbProductId(product);
    var price = productObj ? unitPriceOf(productObj, selection) : 0;
    var stock = productObj ? (productObj.stock || stockOfProduct(skuCode)) : stockOfProduct(skuCode);
    if (stock <= 0) return { ok: false, reason: 'out', maxQty: 0 };

    if (isLoggedIn() && dbId) {
      // 登录态 → 调后端 API（幂等：后端同商品自动累加）
      var specSnapshot = toSpecSnapshot(selection);
      return API.Member.cartAdd(dbId, qty, specSnapshot).then(function (resp) {
        // 加完刷新整个购物车
        return refreshFromApi().then(function () {
          return { ok: true, mode: 'api', count: resp && resp.count };
        });
      }).catch(function (err) {
        console.warn('[Cart] API 加购失败，降级本地', err && err.message);
        // 降级：加到本地 + 提示
        return _addLocalFallback(skuCode, productObj, selection, qty, price, stock).then(function (result) {
          result.mode = 'local_fallback';
          result.error = err && err.message;
          return result;
        });
      });
    }

    // 未登录 → 纯本地
    return _addLocalFallback(skuCode, productObj, selection, qty, price, stock);
  }

  /** 本地 fallback 加购 */
  function _addLocalFallback(skuCode, productObj, selection, qty, price, stock) {
    return ensureLoaded().then(function () {
      var key = lineKeyOf(skuCode, selection);
      var exist = state.items.find(function (it) { return it.key === key; });
      if (exist) {
        exist.qty = Math.max(1, Math.min(exist.qty + qty, stock));
        exist.checked = true;
        persistLocal();
        return { ok: true, merged: true, key: key, maxQty: stock };
      }
      state.items.push({
        key: key, productId: skuCode, skuCode: skuCode,
        dbId: productObj ? productObj.dbId : null,
        name: productObj ? productObj.name : skuCode,
        brand: productObj ? productObj.brand : '',
        art: productObj ? productObj.art : '',
        artSeed: productObj ? productObj.artSeed : '',
        price: price, qty: Math.max(1, Math.min(qty, stock)),
        options: Object.assign({}, selection), checked: true
      });
      persistLocal();
      return { ok: true, merged: false, key: key, maxQty: stock };
    });
  }

  /** 删除一条（乐观更新：先改本地再调 API） */
  function removeItem(key) {
    var t = state.items.find(function (it) { return it.key === key; });
    if (!t) return Promise.resolve(false);

    // 乐观更新：先本地删
    state.items = state.items.filter(function (it) { return it.key !== key; });
    persistLocal();

    if (isLoggedIn() && t.dbId) {
      var backendId = t.id || parseInt(t.productId, 10);
      if (backendId && !isNaN(backendId)) {
        // API 请求后再从后端刷新确认（防止并发修改）
        return API.Member.cartRemove(backendId).then(function () {
          return refreshFromApi();
        }).catch(function (err) {
          console.warn('[Cart] removeItem API 失败', err && err.message);
          return true; // 本地乐观删除已生效
        });
      }
    }
    return Promise.resolve(true);
  }

  /** 批量删除（当前所有选中项） */
  function removeChecked() {
    var removed = checkedItems();
    if (!removed.length) return Promise.resolve(false);
    var promises = removed.map(function (it) { return removeItem(it.key); });
    return Promise.all(promises).then(function () { return true; });
  }

  /** 修改数量（乐观更新：先改本地再调 API） */
  function setQty(key, qty) {
    var t = state.items.find(function (it) { return it.key === key; });
    if (!t) return Promise.resolve(false);
    var max = Math.max(1, stockOfProduct(t.skuCode || t.productId));
    var newQty = Math.max(1, Math.min(Math.floor(qty) || 1, max));

    // 乐观更新：先改本地
    t.qty = newQty;
    emit();

    if (isLoggedIn() && t.dbId) {
      var backendId = t.id || parseInt(t.productId, 10);
      if (backendId && !isNaN(backendId)) {
        return API.Member.cartUpdate(backendId, newQty).then(function () {
          return refreshFromApi();
        }).catch(function (err) {
          console.warn('[Cart] setQty API 失败', err && err.message);
          return true;
        });
      }
    }
    persistLocal();
    return Promise.resolve(true);
  }

  /** 切换勾选 */
  function toggleCheck(key) {
    var t = state.items.find(function (it) { return it.key === key; });
    if (t) { t.checked = !t.checked; emit(); }
  }

  /** 全选 / 取消全选 */
  function setAllChecked(flag) {
    state.items.forEach(function (it) { it.checked = flag; });
    emit();
  }

  /** 清空购物车（结算后用） */
  function clear() {
    if (isLoggedIn()) {
      return API.Member.cartClear().then(function () {
        state.items = [];
        persistLocal();
        return true;
      }).catch(function () {
        state.items = [];
        persistLocal();
        return true;
      });
    }
    state.items = [];
    state._loaded = false;
    persistLocal();
    return Promise.resolve(true);
  }

  /** 手动触发从 API 刷新（供外部调用） */
  function syncFromApi() {
    if (isLoggedIn()) return refreshFromApi();
    return ensureLoaded();
  }

  /** 角标数量（主页面调用） */
  function apiCartCount() {
    if (!isLoggedIn()) return Promise.resolve(totalQty());
    return API.Member.cartCount().then(function (resp) {
      return (resp && resp.count) || 0;
    }).catch(function () { return totalQty(); });
  }

  global.Volta = global.Volta || {};
  global.Volta.Cart = {
    get items() { return state.items; },
    get loaded() { return state._loaded; },
    lineCount: lineCount, totalQty: totalQty, subtotal: subtotal,
    checkedItems: checkedItems, checkedQty: checkedQty, checkedSubtotal: checkedSubtotal, allChecked: allChecked,
    add: add, removeItem: removeItem, removeChecked: removeChecked, setQty: setQty,
    toggleCheck: toggleCheck, setAllChecked: setAllChecked, qtyOfProduct: qtyOfProduct,
    stockOfProduct: stockOfProduct, clear: clear,
    unitPriceOf: unitPriceOf, lineKeyOf: lineKeyOf,
    syncFromApi: syncFromApi, apiCartCount: apiCartCount,
    ensureLoaded: ensureLoaded,
    /** 退出登录时调用：清前端 state + localStorage，不动后端购物车数据（用户再登录能看到之前的商品） */
    resetFrontend: function () {
      state.items = [];
      state._loaded = false;
      // 也清 localStorage，否则下次 ensureLoaded() 未登录时又读回来
      try { Storage.removeLS(CART_KEY); } catch (e) {}
      emit();
    },
    onChange: function (fn) { listeners.push(fn); }
  };

  // DOMContentLoaded：自动加载购物车
  global.addEventListener('DOMContentLoaded', function () {
    ensureLoaded();
  });
})(window);
