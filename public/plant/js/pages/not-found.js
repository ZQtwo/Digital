/**
 * not-found.js —— 404 页（jQuery 版）
 * 重构后：页面内容已在 not-found.html 中预渲染，render() 不再注入 HTML，
 * 只做 reveal 初始化（Layout.mount 已负责）。
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var UI = Volta.UI;

  $(function () {
    UI.initTheme();
    Volta.Layout.mount('');
    setTimeout(function () { Volta.Reveal.init(document); }, 0);
  });
})(window);
