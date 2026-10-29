/**
 * components.js —— 可复用 UI 组件（jQuery 版）
 * 通过 Volta.Components.xxx($el, opts) 渲染到目标容器。
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;

  /* ---------------------------- PriceTag ---------------------------- */
  var PriceTag = {
    render: function (opts) {
      opts = opts || {};
      var F = Volta.Format;
      var value = Number(opts.value) || 0;
      var listPrice = Number(opts.listPrice) || 0;
      var size = opts.size || 'md';
      var html = '<span class="price-tag price-tag--' + size + '">';
      html += '<span class="price-tag__sym">¥</span><span class="price-tag__current">' + F.formatPrice(value) + '</span>';
      if (listPrice && listPrice > value && opts.showOld !== false) {
        html += '<span class="price-tag__old">¥' + F.formatPrice(listPrice) + '</span>';
      }
      var disc = F.discountOf(value, listPrice);
      if (opts.showDiscount && disc) {
        html += '<span class="price-tag__discount">-' + disc + '%</span>';
      }
      html += '</span>';
      return html;
    }
  };

  /* ---------------------------- RatingStars ---------------------------- */
  var RatingStars = {
    render: function (rating, count) {
      rating = Number(rating) || 0;
      var stars = '';
      for (var i = 1; i <= 5; i++) {
        var cls = 'star';
        if (rating >= i) cls += ' is-on';
        else if (rating >= i - 0.5) cls += ' is-half';
        stars += '<span class="' + cls + '" aria-hidden="true"></span>';
      }
      var meta = (count !== undefined && count !== null)
        ? '<span class="rating-stars__count mono">' + Volta.Format.formatCount(count) + '</span>'
        : '';
      return '<span class="rating-stars" role="img" aria-label="' + rating.toFixed(1) + ' 星">' + stars + meta + '</span>';
    }
  };

  /* --------------------------- ProductCard --------------------------- */
  var ProductCard = {
    render: function (product) {
      if (!product) return '';
      var F = Volta.Format;
      var stock = Volta.Inventory.getStock(product.id);
      var status = Volta.Inventory.statusOf(product.id);
      var art = Volta.ProductArt.render(product.art, product.artSeed, product.name + ' 示意图');
      var fav = Volta.User.isFavorite(product.id);
      var discount = F.discountOf(product.price, product.listPrice);
      var tags = (product.tags || []).slice(0, 2).map(function (t) {
        return '<span class="product-card__tag">' + t + '</span>';
      }).join('');

      return ''
        + '<article class="product-card' + (status === 'out' ? ' is-out' : '') + '">'
        + '<a href="/shuma/product/' + product.id + '" class="product-card__art" aria-label="' + product.name + '">'
        + art
        + (discount ? '<span class="product-card__discount mono">-' + discount + '%</span>' : '')
        + (status === 'out' ? '<span class="product-card__mask">已售罄</span>' : (status === 'low' ? '<span class="product-card__mask product-card__mask--warn">仅剩 ' + stock + ' 件</span>' : ''))
        + '</a>'
        + '<button type="button" class="product-card__fav' + (fav ? ' is-on' : '') + '" data-action="toggle-fav" data-pid="' + product.id + '" aria-label="' + (fav ? '取消收藏' : '加入收藏') + '">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="' + (fav ? 'var(--c-accent)' : 'none') + '" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.3l-6.6-6.5a4.2 4.2 0 1 1 6-5.9l.6.6.6-.6a4.2 4.2 0 1 1 6 5.9z"/></svg>'
        + '</button>'
        + '<div class="product-card__body">'
        + '<div class="product-card__meta mono"><span class="product-card__brand">' + product.brand + '</span><span>已售 ' + F.formatSales(product.sales) + '</span></div>'
        + '<a href="/shuma/product/' + product.id + '" class="product-card__name">' + product.name + '</a>'
        + (tags ? '<p class="product-card__tags">' + tags + '</p>' : '')
        + '<div class="product-card__rating">' + RatingStars.render(product.rating, product.ratingCount) + '</div>'
        + '<div class="product-card__foot">'
        + '<span class="product-card__price">' + PriceTag.render({ value: product.price, listPrice: product.listPrice, size: 'sm' }) + '</span>'
        + '<button type="button" class="product-card__cart" data-action="quick-add" data-pid="' + product.id + '"' + (status === 'out' ? ' disabled' : '') + ' aria-label="将 ' + product.name + ' 加入购物车">'
        + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.2l2.1 10.6h10.9l1.8-7H6"/><path d="M12 8.5v4M10 10.5h4"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>'
        + '</button>'
        + '</div>'
        + '</div>'
        + '</article>';
    },
    bind: function ($container) {
      $container = $($container);
      // 防重复绑定：先解除命名空间事件，再重新绑定
      $container.off('.ProductCard');
      $container.on('click.ProductCard', '[data-action="toggle-fav"]', function (e) {
        e.preventDefault(); e.stopPropagation();
        var pid = $(this).data('pid');
        if (!Volta.User.isLogin()) {
          Volta.UI.toast('登录后可收藏', 'error');
          return;
        }
        var on = Volta.User.toggleFavorite(pid);
        Volta.UI.toast(on ? '已加入收藏' : '已取消收藏', on ? 'success' : 'info');
        // 局部刷新这张卡
        var p = Volta.Data.getProduct(pid);
        if (p) {
          $(this).closest('.product-card').replaceWith(ProductCard.render(p));
        }
      });
      $container.on('click.ProductCard', '[data-action="quick-add"]', function (e) {
        e.preventDefault(); e.stopPropagation();
        var pid = $(this).data('pid');
        var p = Volta.Data.getProduct(pid);
        if (!p) return;
        if (Volta.Inventory.statusOf(pid) === 'out') {
          Volta.UI.toast('该商品已售罄', 'error');
          return;
        }
        var result = Volta.Cart.add(p, {}, 1);
        if (result.ok) {
          Volta.UI.toast('已加入购物车', 'success');
        } else if (result.reason === 'out') {
          Volta.UI.toast('该商品已售罄', 'error');
        }
      });
    }
  };

  /* --------------------------- SkeletonCard --------------------------- */
  var SkeletonCard = {
    render: function () {
      return '<article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article>';
    }
  };

  /* --------------------------- EmptyState --------------------------- */
  var EmptyState = {
    render: function (opts) {
      opts = opts || {};
      return '<div class="empty-state"><div class="empty-state__icon">' + (opts.icon || '○') + '</div><h3 class="empty-state__title">' + (opts.title || '暂无数据') + '</h3><p class="empty-state__text">' + (opts.text || '') + '</p>' + (opts.action ? '<a href="' + (opts.actionHref || '#') + '" class="btn btn--outline-accent">' + opts.action + '</a>' : '') + '</div>';
    }
  };

  /* --------------------------- QuantityStepper --------------------------- */
  var QuantityStepper = {
    render: function (opts) {
      opts = opts || {};
      var value = Number(opts.value) || 1;
      var max = opts.max !== undefined ? opts.max : 99;
      return '<div class="qty-stepper" data-max="' + max + '">'
        + '<button type="button" class="qty-stepper__btn" data-action="qty-minus" aria-label="减少">−</button>'
        + '<input type="text" class="qty-stepper__input" value="' + value + '" aria-label="数量">'
        + '<button type="button" class="qty-stepper__btn" data-action="qty-plus" aria-label="增加">+</button>'
        + '</div>';
    },
    bind: function ($container, onChange) {
      $container = $($container);
      $container.off('.QtyStepper');
      $container.on('click.QtyStepper', '[data-action="qty-minus"]', function () {
        var $wrap = $(this).closest('.qty-stepper');
        var $input = $wrap.find('.qty-stepper__input');
        var max = Number($wrap.data('max')) || 99;
        var v = Math.max(1, (Number($input.val()) || 1) - 1);
        $input.val(Math.min(v, max));
        if (onChange) onChange(Math.min(v, max), $wrap);
      });
      $container.on('click.QtyStepper', '[data-action="qty-plus"]', function () {
        var $wrap = $(this).closest('.qty-stepper');
        var $input = $wrap.find('.qty-stepper__input');
        var max = Number($wrap.data('max')) || 99;
        var v = Math.min(max, (Number($input.val()) || 1) + 1);
        $input.val(v);
        if (onChange) onChange(v, $wrap);
      });
      $container.on('change.QtyStepper', '.qty-stepper__input', function () {
        var $wrap = $(this).closest('.qty-stepper');
        var max = Number($wrap.data('max')) || 99;
        var v = Math.max(1, Math.min(max, Math.floor(Number($(this).val()) || 1)));
        $(this).val(v);
        if (onChange) onChange(v, $wrap);
      });
    }
  };

  /* --------------------------- CouponCard --------------------------- */
  var CouponCard = {
    render: function (coupon, mode) {
      mode = mode || 'claim';
      var F = Volta.Format;
      var claimed = Volta.User.hasCoupon(coupon.id);
      var body = ''
        + '<div class="coupon-card__amount"><span class="mono">¥</span>' + F.formatPrice(coupon.amount) + '</div>'
        + '<div class="coupon-card__body"><p class="coupon-card__title">' + coupon.title + '</p>'
        + '<p class="coupon-card__threshold">满 ¥' + F.formatPrice(coupon.threshold) + ' 可用</p>'
        + '<p class="coupon-card__scope mono">' + coupon.scope + '</p></div>';
      var action = '';
      if (mode === 'claim') {
        action = '<button type="button" class="coupon-card__btn"' + (claimed ? ' disabled' : '') + ' data-action="claim-coupon" data-cid="' + coupon.id + '">' + (claimed ? '已领取' : '立即领取') + '</button>';
      } else if (mode === 'select') {
        action = '<button type="button" class="coupon-card__btn" data-action="select-coupon" data-cid="' + coupon.id + '">使用</button>';
      }
      return '<article class="coupon-card">' + body + action + '</article>';
    }
  };

  /* --------------------------- SearchBox --------------------------- */
  // 完整版搜索栏：图标 + 输入框 + 清空按钮 + 橙色"搜索"按钮 + 历史搜索下拉
  // mode: 'header'（顶栏内联）/ 'mobile'（移动端展开行）/ 'page'（列表页大尺寸）
  var SearchBox = {
    render: function (opts) {
      opts = opts || {};
      var placeholder = opts.placeholder || '搜索商品、品牌或型号';
      var value = opts.value || '';
      var mode = opts.mode || 'header';
      var sizeCls = mode === 'page' ? ' search-box--lg' : '';
      var historyHtml = '';
      var hist = Volta.UI && Volta.UI.searchHistory ? Volta.UI.searchHistory : [];
      if (hist.length) {
        var items = hist.map(function (w) {
          return '<li><button type="button" data-action="use-history" data-kw="' + w.replace(/"/g, '&quot;') + '">' + w + '</button></li>';
        }).join('');
        historyHtml = '<div class="search-box__panel" style="display:none">'
          + '<div class="search-box__panel-head"><span class="eyebrow">历史搜索</span>'
          + '<button type="button" class="search-box__panel-clear" data-action="clear-history">清除</button>'
          + '</div><ul class="search-box__history">' + items + '</ul></div>';
      }
      return '<form class="search-box' + sizeCls + '" data-action="search" role="search" autocomplete="off">'
        + '<span class="search-box__icon" aria-hidden="true">'
        + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L21 21"/></svg>'
        + '</span>'
        + '<input type="search" class="search-box__input" placeholder="' + placeholder + '" value="' + value.replace(/"/g, '&quot;') + '" aria-label="搜索商品" data-mode="' + mode + '">'
        + (value ? '<button type="button" class="search-box__clear" data-action="clear-search" aria-label="清空搜索词"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3 L11 11 M11 3 L3 11"/></svg></button>' : '')
        + '<button type="submit" class="search-box__go">搜索</button>'
        + historyHtml
        + '</form>';
    },
    bind: function ($container, onSubmit) {
      $container = $($container);
      $container.off('.SearchBox');
      // 提交
      $container.on('submit.SearchBox', '[data-action="search"]', function (e) {
        e.preventDefault();
        var kw = $(this).find('.search-box__input').val();
        if (Volta.UI && Volta.UI.pushSearch && kw) Volta.UI.pushSearch(kw);
        $(this).find('.search-box__panel').hide();
        if (onSubmit) onSubmit(kw);
      });
      // 聚焦且为空时显示历史
      $container.on('focus.SearchBox', '.search-box__input', function () {
        var $form = $(this).closest('.search-box');
        if (!$(this).val()) $form.find('.search-box__panel').show();
      });
      $container.on('blur.SearchBox', '.search-box__input', function () {
        var $form = $(this).closest('.search-box');
        window.setTimeout(function () { $form.find('.search-box__panel').hide(); }, 160);
      });
      // 输入变化时显隐清空按钮 + 历史面板
      $container.on('input.SearchBox', '.search-box__input', function () {
        var $form = $(this).closest('.search-box');
        var v = $(this).val();
        var $clear = $form.find('.search-box__clear');
        if (v && !$clear.length) {
          $form.find('.search-box__input').after('<button type="button" class="search-box__clear" data-action="clear-search" aria-label="清空搜索词"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3 L11 11 M11 3 L3 11"/></svg></button>');
        } else if (!v && $clear.length) {
          $clear.remove();
        }
        if (!v) $form.find('.search-box__panel').show();
        else $form.find('.search-box__panel').hide();
      });
      // 点击历史词
      $container.on('mousedown.SearchBox', '[data-action="use-history"]', function (e) {
        e.preventDefault();
        var w = $(this).data('kw');
        var $form = $(this).closest('.search-box');
        $form.find('.search-box__input').val(w);
        $form.find('.search-box__panel').hide();
        $form.trigger('submit');
      });
      // 清空输入
      $container.on('click.SearchBox', '[data-action="clear-search"]', function (e) {
        e.preventDefault();
        var $form = $(this).closest('.search-box');
        $form.find('.search-box__input').val('').focus();
        $(this).remove();
        $form.find('.search-box__panel').show();
      });
      // 清空历史
      $container.on('click.SearchBox', '[data-action="clear-history"]', function (e) {
        e.preventDefault();
        if (Volta.UI && Volta.UI.clearSearchHistory) Volta.UI.clearSearchHistory();
        $(this).closest('.search-box').find('.search-box__panel').remove();
      });
    }
  };

  /* --------------------------- PaginationBar --------------------------- */
  var PaginationBar = {
    render: function (opts) {
      var page = opts.page, total = opts.total, baseHref = opts.baseHref;
      var html = '<nav class="pagination" aria-label="分页">';
      function link(p, label, attr) {
        return '<a href="' + baseHref + 'page=' + p + '" class="pagination__item' + (attr ? ' ' + attr : '') + '">' + label + '</a>';
      }
      if (page <= 1) html += '<span class="pagination__item is-disabled">上一页</span>';
      else html += link(page - 1, '上一页');
      for (var i = 1; i <= total; i++) {
        if (i === 1 || i === total || Math.abs(i - page) <= 2) {
          html += (i === page)
            ? '<span class="pagination__item is-current">' + i + '</span>'
            : link(i, String(i));
        } else if (i === 2 || i === total - 1) {
          html += '<span class="pagination__ellipsis">…</span>';
        }
      }
      if (page >= total) html += '<span class="pagination__item is-disabled">下一页</span>';
      else html += link(page + 1, '下一页');
      html += '</nav>';
      return html;
    }
  };

  /* --------------------------- MultiSelect --------------------------- */
  // 点击展开下拉，不用原生 multiple select
  var MultiSelect = {
    render: function (opts) {
      opts = opts || {};
      var label = opts.label || '多选';
      var items = (opts.items || []).map(function (item) {
        var v = item.value !== undefined ? item.value : item;
        var l = item.label !== undefined ? item.label : item;
        var checked = opts.selected && opts.selected.indexOf(v) !== -1 ? ' is-on' : '';
        return '<li><label class="multi-select__item' + checked + '"><input type="checkbox" value="' + v + '"' + (checked ? ' checked' : '') + '><span>' + l + '</span></label></li>';
      }).join('');
      return '<div class="multi-select" data-action="multi-select">'
        + '<button type="button" class="multi-select__trigger" aria-expanded="false">' + label + '<span class="multi-select__caret">▾</span></button>'
        + '<ul class="multi-select__menu" style="display:none">' + items + '</ul>'
        + '</div>';
    },
    bind: function ($container, onChange) {
      $container = $($container);
      $container.off('.MultiSelect');
      $container.on('click.MultiSelect', '[data-action="multi-select"] > .multi-select__trigger', function (e) {
        e.preventDefault();
        var $wrap = $(this).closest('.multi-select');
        var $menu = $wrap.find('.multi-select__menu');
        var open = $menu.is(':visible');
        $menu.slideToggle(140);
        $(this).attr('aria-expanded', String(!open));
        if (!open) {
          var handler = function (ev) {
            if (!$(ev.target).closest($wrap).length) {
              $menu.slideUp(140);
              $(document).off('click', handler);
            }
          };
          setTimeout(function () { $(document).on('click', handler); }, 0);
        }
      });
      $container.on('change.MultiSelect', '.multi-select__menu input', function () {
        var $wrap = $(this).closest('.multi-select');
        var $label = $(this).closest('.multi-select__item');
        $label.toggleClass('is-on', this.checked);
        var selected = [];
        $wrap.find('input:checked').each(function () { selected.push($(this).val()); });
        if (onChange) onChange(selected, $wrap);
      });
    }
  };

  global.Volta.Components = {
    PriceTag: PriceTag,
    RatingStars: RatingStars,
    ProductCard: ProductCard,
    SkeletonCard: SkeletonCard,
    EmptyState: EmptyState,
    QuantityStepper: QuantityStepper,
    CouponCard: CouponCard,
    SearchBox: SearchBox,
    PaginationBar: PaginationBar,
    MultiSelect: MultiSelect
  };
})(window);


