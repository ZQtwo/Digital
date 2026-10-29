/**
 * product-art.js —— 商品矢量插画（jQuery 版）
 * 移植自 Vue ProductArt.vue；用 jQuery 构造 SVG 字符串。
 * 8 种品类 + 多种变体；同一品类不同型号通过 seed 微调辉光位置与网格起点。
 */
(function (global) {
  var $ = jQuery;
  var uidSeed = 0;

  // 形状构造器
  function R(x, y, w, h, rx, s) { return { t: 'rect', x: x, y: y, width: w, height: h, rx: rx || 0, s: s || 'ink' }; }
  function C(cx, cy, r, s) { return { t: 'circle', cx: cx, cy: cy, r: r, s: s || 'ink' }; }
  function P(d, s) { return { t: 'path', d: d, s: s || 'ink' }; }
  function L(x1, y1, x2, y2, s) { return { t: 'line', x1: x1, y1: y1, x2: x2, y2: y2, s: s || 'ink' }; }
  function E(cx, cy, rx, ry, s) { return { t: 'ellipse', cx: cx, cy: cy, rx: rx, ry: ry, s: s || 'ink' }; }

  function keyRow(y, count, startX, step, w, h) {
    startX = startX || 92; step = step || 18; w = w || 13; h = h || 12;
    var arr = [];
    for (var i = 0; i < count; i++) arr.push(R(startX + i * step, y, w, h, 2, 'dim'));
    return arr;
  }

  var SHAPES = {
    'default': [R(110, 62, 100, 96, 12), C(160, 110, 18, 'accent')],
    'phone': [R(118, 34, 84, 152, 14), R(128, 48, 64, 124, 6, 'dim'), C(160, 40, 3, 'accent'), L(146, 178, 174, 178)],
    'laptop': [R(96, 46, 128, 78, 6), R(104, 54, 112, 62, 3, 'dim'), P('M74 132 H246 L258 150 H62 Z'), L(140, 141, 180, 141)],
    'tablet': [R(106, 36, 108, 148, 12), R(116, 48, 88, 112, 4, 'dim'), L(226, 68, 246, 48), C(246, 48, 4, 'accent')],
    'earbuds': [C(134, 58, 16), C(186, 58, 16), L(134, 72, 134, 90), L(186, 72, 186, 90), R(112, 92, 96, 64, 16), L(136, 124, 184, 124), C(160, 124, 4, 'accent')],
    'headphone': [P('M104 122 A56 56 0 0 1 216 122'), R(94, 116, 20, 56, 8), R(206, 116, 20, 56, 8), C(160, 60, 5, 'accent')],
    'watch': [R(140, 38, 40, 26, 8), R(140, 156, 40, 26, 8), R(128, 66, 64, 88, 16), R(138, 78, 44, 64, 8, 'dim'), L(196, 96, 206, 96), C(160, 110, 6, 'accent')],
    'camera': [R(132, 58, 56, 16, 4), R(90, 76, 140, 86, 12), C(158, 119, 30), C(158, 119, 16, 'dim'), C(210, 92, 6, 'accent')],
    'speaker': [R(112, 52, 96, 132, 18), C(160, 86, 20), C(160, 142, 13, 'dim'), C(160, 52, 4, 'accent')],
    'keyboard': [R(80, 84, 160, 68, 10)].concat(keyRow(94, 8), keyRow(112, 8), [R(118, 130, 84, 12, 3, 'dim'), C(224, 90, 3, 'accent')]),
    'mouse': [P('M160 50 C130 50 118 76 118 108 V138 C118 164 138 176 160 176 C182 176 202 164 202 138 V108 C202 76 190 50 160 50 Z'), L(160, 50, 160, 96), R(155, 66, 10, 20, 5, 'accent')],
    'monitor': [R(66, 50, 188, 112, 10), R(76, 60, 168, 92, 4, 'dim'), L(160, 162, 160, 182), L(130, 186, 190, 186), C(238, 62, 4, 'accent')],
    'ssd': [R(104, 72, 112, 76, 12), R(114, 82, 92, 42, 4, 'dim'), L(124, 134, 196, 134), C(196, 88, 4, 'accent')],
    'powerbank': [R(104, 48, 112, 136, 14), R(116, 60, 88, 32, 6, 'dim'), L(130, 92, 190, 92), R(116, 120, 26, 10, 3, 'dim'), R(150, 120, 26, 10, 3, 'dim'), C(160, 158, 6, 'accent')],
    'console': [R(88, 62, 76, 116, 10), L(100, 86, 152, 86), L(100, 102, 140, 102), R(176, 84, 68, 68, 26), C(198, 112, 6, 'accent'), C(216, 126, 5), L(224, 112, 238, 112)],
    'drone': [L(136, 100, 92, 66), L(184, 100, 228, 66), L(136, 124, 92, 158), L(184, 124, 228, 158), E(88, 62, 26, 6), E(232, 62, 26, 6), E(88, 162, 26, 6), E(232, 162, 26, 6), R(136, 96, 48, 32, 8), C(160, 112, 8, 'accent')],
    'vr': [P('M76 96 C58 104 58 130 76 138'), P('M244 96 C262 104 262 130 244 138'), R(88, 84, 144, 64, 26), C(132, 116, 18, 'dim'), C(188, 116, 18, 'dim'), C(160, 132, 4, 'accent')],
    'router': [L(128, 108, 140, 64), L(192, 108, 180, 64), R(102, 108, 116, 46, 10), C(120, 131, 4, 'accent'), C(138, 131, 4), C(156, 131, 4)],
    'charger': [L(136, 62, 136, 42), L(184, 62, 184, 42), R(114, 62, 92, 92, 14), C(160, 82, 5, 'accent'), R(130, 112, 24, 8, 2, 'dim'), R(166, 112, 24, 8, 2, 'dim')],
    'projector': [R(90, 84, 140, 72, 14), C(128, 120, 20), C(128, 120, 10, 'dim'), L(180, 104, 222, 104), L(180, 120, 222, 120), L(180, 136, 222, 136), C(104, 96, 4, 'accent')]
  };

  function shapeTag(sh) {
    var attrs = '';
    Object.keys(sh).forEach(function (k) {
      if (k === 't' || k === 's') return;
      attrs += ' ' + k + '="' + sh[k] + '"';
    });
    return '<' + sh.t + attrs + ' class="art-' + sh.s + '"/>';
  }

  function render(kind, seed, label) {
    var uid = 'pa' + (++uidSeed);
    var s = Number(seed) || 1;
    var gradId = uid + '-g';
    var glowId = uid + '-gl';
    var glowX = 120 + (s * 37) % 90;
    var glowY = 60 + (s * 23) % 70;
    var gridOffset = (s * 7) % 32;

    var shapes = SHAPES[kind] || SHAPES['default'];
    var body = shapes.map(shapeTag).join('');

    var gridV = ''; for (var i = 1; i <= 10; i++) gridV += '<line x1="' + (i * 32 - 32) + '" y1="0" x2="' + (i * 32 - 32) + '" y2="220"/>';
    var gridH = ''; for (var j = 1; j <= 7; j++) gridH += '<line x1="0" y1="' + (j * 32 - 32) + '" x2="320" y2="' + (j * 32 - 32) + '"/>';

    return ''
      + '<svg class="product-art" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + (label || '商品示意图') + '">'
      + '<defs>'
      + '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--art-bg-1)"/><stop offset="1" stop-color="var(--art-bg-2)"/></linearGradient>'
      + '<radialGradient id="' + glowId + '"><stop offset="0" stop-color="var(--c-accent)" stop-opacity="0.3"/><stop offset="1" stop-color="var(--c-accent)" stop-opacity="0"/></radialGradient>'
      + '</defs>'
      + '<rect width="320" height="220" fill="url(#' + gradId + ')"/>'
      + '<g class="art-grid" transform="translate(' + gridOffset + ' 0)">' + gridV + gridH + '</g>'
      + '<ellipse fill="url(#' + glowId + ')" cx="' + glowX + '" cy="' + glowY + '" rx="130" ry="86"/>'
      + '<g class="art-marks"><path d="M14 26 V14 H26"/><path d="M294 14 H306 V26"/><path d="M306 194 V206 H294"/><path d="M26 206 H14 V194"/></g>'
      + '<g class="art-body">' + body + '</g>'
      + '</svg>';
  }

  global.Volta = global.Volta || {};
  global.Volta.ProductArt = { render: render };
})(window);
