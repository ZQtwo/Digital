/**
 * bootstrap-data.js —— 直线流程，没有 mock fallback
 * DOMContentLoaded → await API → 同时设置 Data + Store → 发 volta:data-ready
 * 引入顺序：api.js + store.js 之后，store-inventory.js 之前
 */
(function (global) {
  var API = global.Volta.API;
  var Store = global.Volta.Store;
  var Data = global.Volta.Data || {};

  // API 还没加载？这是致命错误，不回退 mock
  if (!API || !API.Public) {
    console.error('[bootstrap-data] api.js 未加载！请检查 HTML 引入顺序');
    return;
  }

  function transformProduct(p) {
    return {
      id: p.skuCode,
      dbId: p.id,
      skuCode: p.skuCode,
      name: p.name,
      subtitle: p.subtitle || '',
      brand: p.brand,
      category: p.category,
      art: p.art,
      artSeed: p.artSeed,
      price: Number(p.price) || 0,
      listPrice: Number(p.listPrice) || 0,
      rating: Number(p.rating) || 0,
      ratingCount: p.ratingCount || 0,
      sales: p.sales || 0,
      stock: Number(p.stock) || 0,
      threshold: p.threshold || 20,
      tags: Array.isArray(p.tags) ? p.tags : [],
      highlights: p.highlights || [],
      desc: p.description || '',
      options: p.options || [],
      specs: p.specs || {}
    };
  }

  async function load() {
    try {
      var results = await Promise.all([
        API.Public.products({ pageSize: 100 }),
        API.Public.categories(),
        API.Public.brands()
      ]);

      var productsResp = results[0];
      if (!productsResp || !productsResp.ok) {
        throw new Error('商品接口返回 code=' + (productsResp && productsResp.code));
      }

      // API 返回 {list, total, page, pageSize}
      var apiList = productsResp.data && productsResp.data.list ? productsResp.data.list : [];
      var transformed = apiList.map(transformProduct);

      // 同时写入旧 Data 和新 Store
      Data.products = transformed;
      // id 优先按 skuCode 匹配；订单等场景会传 DB 整数 id，回退到 Store（同时收录 skuCode + dbId 两种 key）
      Data.getProduct = function (id) { return transformed.find(function (p) { return p.id === id; }) || Store.getProduct(id) || null; };
      Data.bestSellers = transformed.slice().sort(function (a, b) { return b.sales - a.sales; }).slice(0, 6);
      Store.setProducts(transformed);

      // categories / brands
      var catsResp = results[1];
      if (catsResp && catsResp.ok) {
        // data 可能是数组，也可能是 {list: [...]} 包装
        var catsData = catsResp.data;
        if (catsData && !Array.isArray(catsData) && Array.isArray(catsData.list)) {
          catsData = catsData.list;
        }
        Data.categories = flattenCategories(Array.isArray(catsData) ? catsData : []);
      }
      var brandsResp = results[2];
      if (brandsResp && brandsResp.ok) {
        var bData = brandsResp.data;
        if (bData && !Array.isArray(bData) && Array.isArray(bData.list)) {
          bData = bData.list;
        }
        Data.brandList = (Array.isArray(bData) ? bData : []).map(function (b) { return b.name; });
      }

      console.log('[bootstrap-data] OK:', transformed.length, '商品已加载, 全部 stock>=0');
      // 最后发事件——store-inventory.js 等这个重建 baseline
      global.dispatchEvent(new CustomEvent('volta:data-ready', {
        detail: { productCount: transformed.length }
      }));
    } catch (err) {
      console.error('[bootstrap-data] 加载失败:', err.message);
      // 不回退 mock！直接发 error 事件
      global.dispatchEvent(new CustomEvent('volta:data-error', {
        detail: { message: err.message }
      }));
    }
  }

  function flattenCategories(nodes) {
    var flat = [];
    (nodes || []).forEach(function (n) {
      flat.push({ id: n.code, name: n.name, art: n.art || n.code });
      if (n.children && n.children.length) {
        flat = flat.concat(flattenCategories(n.children));
      }
    });
    return flat;
  }

  // 立即开始加载（IIFE 执行时 DOM 可能还没 ready，但 fetch 会异步完成）
  load();
})(window);
