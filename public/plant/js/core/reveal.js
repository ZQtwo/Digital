/**
 * reveal.js —— 错峰上浮入场效果（jQuery 版）
 * 给元素加 .reveal 类 + data-delay 属性即可。
 * 无 IntersectionObserver 时直接显示。
 */
(function (global) {
  var io = null;
  var pending = [];
  function init(root) {
    root = root || document;
    var els = root.querySelectorAll('.reveal:not(.is-in):not(.is-ready)');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            el.classList.add('is-in');
            io.unobserve(el);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    }
    els.forEach(function (el) {
      el.classList.add('is-ready');
      var d = el.getAttribute('data-delay');
      if (d) el.style.setProperty('--reveal-delay', d);
      io.observe(el);
    });
  }
  global.Volta = global.Volta || {};
  global.Volta.Reveal = { init: init };
})(window);
