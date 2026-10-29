/**
 * store-categories.js —— 分类只读层（前台 jQuery 版）【绑定数据库版】
 *
 * 数据源：GET /shuma/api/categories（公开接口，数据库分类表 ssc_fenlei，含在售商品计数）
 * 不再使用 mock 基础层与 localStorage 自定义层——分类唯一来源是数据库。
 *
 * bootstrap-data.js 也会把分类写入 Data.categories（id=编号 code）。
 * 本 store 在其基础上提供 Volta.Categories.list()/get()，并随 volta:data-ready 自动刷新。
 */
(function (global) {
  var Storage = global.Volta && global.Volta.Storage;
  var API = global.Volta && global.Volta.API;
  var Data = global.Volta && global.Volta.Data;
  var CACHE_KEY = 'volta.categories.db';

  var state = {
    categories: Storage ? Storage.readLS(CACHE_KEY, []) : []
  };

  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  /** 展平分类树：id=编号(code)，带在售商品数 */
  function flattenCats(nodes) {
    var out = [];
    (nodes || []).forEach(function (n) {
      out.push({
        id: n.code,
        dbId: n.id,
        name: n.name,
        art: n.art || n.code,
        productCount: n.count || 0,
        level: n.level || 1
      });
      if (n.children && n.children.length) out = out.concat(flattenCats(n.children));
    });
    return out;
  }

  /** 【绑定数据库】从分类表拉取启用中的分类 */
  function fetchAll() {
    if (!API || !API.Public) return Promise.resolve(false);
    return API.Public.categories().then(function (res) {
      if (res && res.ok && res.data) {
        var list = Array.isArray(res.data) ? res.data : (res.data.list || []);
        state.categories = flattenCats(list);
        if (Storage) Storage.writeLS(CACHE_KEY, state.categories);
        // 同步到旧 Data 引用（部分页面直接读 Data.categories）
        if (Data) Data.categories = state.categories.map(function (c) {
          return { id: c.id, name: c.name, art: c.art };
        });
        emit();
        return true;
      }
      return false;
    }).catch(function () { return false; });
  }

  function naturalCompare(a, b) {
    function tokenize(s) {
      var tokens = []; var buf = ''; var isNum = null;
      for (var i = 0; i < s.length; i++) {
        var ch = s[i];
        var cn = /\d/.test(ch);
        if (isNum === null) { isNum = cn; buf = ch; continue; }
        if (cn === isNum) { buf += ch; } else {
          tokens.push({ str: buf, isNum: isNum, num: isNum ? Number(buf) : 0 });
          buf = ch; isNum = cn;
        }
      }
      if (buf) tokens.push({ str: buf, isNum: isNum, num: isNum ? Number(buf) : 0 });
      return tokens;
    }
    var ta = tokenize(String(a)); var tb = tokenize(String(b));
    var len = Math.min(ta.length, tb.length);
    for (var i = 0; i < len; i++) {
      var x = ta[i], y = tb[i];
      if (x.isNum && y.isNum) {
        if (x.num !== y.num) return x.num - y.num;
        if (x.str.length !== y.str.length) return x.str.length - y.str.length;
      } else {
        if (x.isNum !== y.isNum) return x.isNum ? -1 : 1;
        var cmp = x.str.localeCompare(y.str);
        if (cmp !== 0) return cmp;
      }
    }
    return ta.length - tb.length;
  }

  /** 数据库分类（按编号自然排序） */
  function list() {
    var arr = (state.categories || []).slice();
    arr.sort(function (a, b) { return naturalCompare(a.id, b.id); });
    return arr;
  }

  function get(id) {
    var hit = state.categories.find(function (c) { return c.id === id; });
    return hit ? Object.assign({}, hit) : null;
  }

  // 页面数据就绪后自动刷新（bootstrap-data 发出）
  global.addEventListener('volta:data-ready', function () { fetchAll(); });

  global.Volta = global.Volta || {};
  global.Volta.Categories = {
    list: list,
    get: get,
    fetchAll: fetchAll,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
