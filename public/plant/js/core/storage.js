/**
 * storage.js —— localStorage 安全读写（jQuery 版）
 * 隐私模式 / 存储被禁用时统一兜底，避免应用崩溃。
 */
(function (global) {
  function readLS(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }
  function writeLS(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }
  function removeLS(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      /* 忽略 */
    }
  }
  global.Volta = global.Volta || {};
  global.Volta.Storage = { readLS: readLS, writeLS: writeLS, removeLS: removeLS };
})(window);
