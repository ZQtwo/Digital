/**
 * help.js —— 帮助中心（jQuery 版）
 * 重构后：页面内容已在 /shuma/help 中预渲染，不再调用 $root.html()。
 * FAQ 使用 <details>/<summary> 原生折叠，无需额外 JS 绑定。
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var UI = Volta.UI;

  $(function () {
    UI.initTheme();
    Volta.Layout.mount('me');
    setTimeout(function () { Volta.Reveal.init(document); }, 0);
  });
})(window);
