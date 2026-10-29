/**
 * store-banners.js —— 广告位只读层（前台 jQuery 版）
 *
 * 前台只读后台运营的 banner（位置 home_top / side / activity），
 * 持久化在 localStorage 键 volta.banners，与后台 banners.js 共用同一份。
 * 前台只暴露只读 API（list/getByPosition/getById），不暴露增删改。
 */
(function (global) {
  var Storage = global.Volta && global.Volta.Storage;
  var BANNER_KEY = 'volta.banners';

  function loadAll() {
    var arr = Storage ? Storage.readLS(BANNER_KEY, []) : [];
    return Array.isArray(arr) ? arr : [];
  }

  /** 全部 banner */
  function list() { return loadAll().slice(); }

  /** 按位置筛选；enabledOnly=true 时只返回启用项；按 weight 倒序 */
  function getByPosition(position, enabledOnly) {
    return loadAll()
      .filter(function (b) { return b.position === position; })
      .filter(function (b) { return !enabledOnly || b.enabled !== false; })
      .sort(function (a, b) { return (b.weight || 0) - (a.weight || 0); })
      .map(function (b) { return Object.assign({}, b); });
  }

  function getById(id) {
    var hit = loadAll().find(function (b) { return b.id === id; });
    return hit ? Object.assign({}, hit) : null;
  }

  global.Volta = global.Volta || {};
  global.Volta.Banners = {
    BANNER_KEY: BANNER_KEY,
    list: list,
    getByPosition: getByPosition,
    getById: getById
  };
})(window);
