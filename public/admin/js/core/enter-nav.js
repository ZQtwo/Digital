/**
 * enter-nav.js —— 全局 Enter 键导航（jQuery 版）
 *
 * 行为：
 *   - 在任何弹窗 / Drawer / 独立表单内，input 或 select 上按 Enter
 *       → 自动 focus 到下一个可编辑字段（跳过 disabled / readonly / hidden / checkbox / radio）
 *   - 如果已经是最后一个字段
 *       → 自动点击容器内第一个 .btn--primary 确认按钮（和鼠标点击等价）
 *
 * 不拦截的情况：
 *   - textarea（多行文本框里 Enter 是换行，保留原生行为）
 *   - button / submit 类元素（原生 click 行为）
 *   - 搜索框（type="search" 或带 data-*-search 属性）—— 搜索框自己有 Enter 触发搜索的逻辑
 *
 * 用法：在 jQuery 之后、页面业务脚本之前引入本文件即可。
 */
(function (global) {
  'use strict';
  var $ = global.jQuery;
  if (!$) { console.warn('[enter-nav] jQuery 未加载'); return; }

  /* ---- 容器选择器（从近到远依次尝试匹配） ---- */
  var CONTAINER_SEL = [
    '[data-editor-overlay]',
    '[data-confirm-overlay]',
    '[data-resetpwd-overlay]',
    '[data-alert-overlay]',
    '[data-detail-overlay]',
    '.admin-drawer',
    '.cat-modal',
    '.confirm-modal',
    '.admin-login__card',
    '.pc-form',
    'form'
  ].join(', ');

  /** Fallback：向上找最近的、包含可聚焦字段 + 确认按钮的祖先 */
  function findContainerFallback(el) {
    var cur = el.parentElement;
    while (cur && cur !== document.body) {
      var $c = $(cur);
      // 这个祖先里有可聚焦字段 + 确认按钮 → 就是容器
      if ($c.find(FIELD_SEL).not(':hidden').length > 0
        && $c.find('button.btn--primary, button[type="submit"], input[type="submit"]').length > 0) {
        return $c;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  /* ---- 可编辑字段选择器 ---- */
  var FIELD_SEL = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([disabled]):not([readonly]), select:not([disabled]):not([readonly])';

  /** 判断是否是搜索框——搜索框保留自己的 Enter 行为 */
  function isSearchInput(el) {
    if (el.type === 'search') return true;
    var attrs = el.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var n = attrs[i].name;
      if (n.indexOf('data-') === 0 && n.indexOf('search') !== -1) return true;
    }
    return false;
  }

  /** 从容器内收集所有可聚焦字段，保持 DOM 顺序 */
  function collectFields($container) {
    return $container.find(FIELD_SEL).not(':hidden').get();
  }

  /** 获取离当前元素最近的有效容器 */
  function findContainer(el) {
    var $el = $(el);
    // 1) 用预定义选择器精确匹配
    var $self = $el.closest(CONTAINER_SEL);
    if ($self.length) return $self.first();
    // 2) Fallback：向上找最近的、同时包含可聚焦字段 + 确认按钮的祖先
    return findContainerFallback(el);
  }

  /* ---- 事件委托 ---- */
  $(document).on('keydown.voltaEnterNav', function (e) {
    if (e.key !== 'Enter') return;

    var el = e.target;
    if (!el || el.nodeType !== 1) return;

    var tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT') return;
    if (isSearchInput(el)) return;

    var $container = findContainer(el);
    if (!$container) return;

    // 如果容器本身是原生 form 且没有 submit 按钮之外的主按钮
    // 先让原生 submit 逻辑有机会触发（form submit 里 Enter 会点第一个 submit 按钮）
    // 但我们已经 preventDefault 了，所以要手动触发

    var fields = collectFields($container);
    if (!fields.length) return;

    var curIdx = fields.indexOf(el);
    if (curIdx === -1) return;

    // 只有 1 个可聚焦字段时，Enter 不拦截——让页面自己处理
    // （比如库存调整 Drawer 里只有数量输入框，Enter 不该自动触发确认）
    if (fields.length === 1) return;

    e.preventDefault();

    if (curIdx < fields.length - 1) {
      // 跳到下一个
      fields[curIdx + 1].focus();
    } else {
      // 最后一个 → 点确认按钮
      var $confirm = $container.find('button.btn--primary').first();
      if ($confirm.length) {
        $confirm[0].click();
      } else {
        // 没找到 .btn--primary，再 fallback 找 form 的 submit 按钮
        var $submit = $container.find('button[type="submit"], input[type="submit"]').first();
        if ($submit.length) $submit[0].click();
      }
    }
  });

})(window);
