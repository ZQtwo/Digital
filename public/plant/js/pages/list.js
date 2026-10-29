/**
 * list.js —— 商品列表 / 搜索 / 筛选（jQuery 版）
 * 筛选状态全部同步到 URL query（q / cat / brand / band / sort / page），
 * 因此刷新、分享链接都能还原同一结果。改动通过 location.href 触发整页刷新，
 * 兼容 file:// 协议。
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var Data = Volta.Data;
  var UI = Volta.UI;
  var Components = Volta.Components;

  var PAGE_SIZE = 12;

  /* ------------------------------ 状态 -------------------------------- */
  var state = {
    q: '', keywordInput: '',
    cat: '',
    brands: [],
    bands: [],
    sort: 'recommend',
    page: 1,
    loading: true
  };

  /** 从 URL query 还原筛选状态 */
  function syncFromQuery() {
    var query = parseQuery();
    state.q = String(query.q || '');
    state.keywordInput = state.q;
    state.cat = String(query.cat || '');
    state.brands = query.brand ? String(query.brand).split(',').filter(Boolean) : [];
    state.bands = query.band
      ? String(query.band).split(',').map(function (n) { return Number(n); })
          .filter(function (n) { return Number.isInteger(n) && n >= 0 && n < Data.priceBands.length; })
      : [];
    state.sort = Data.sortOptions.some(function (s) { return s.value === query.sort; })
      ? String(query.sort) : 'recommend';
    var p = Number(query.page);
    state.page = Number.isInteger(p) && p > 0 ? p : 1;
  }

  function parseQuery() {
    var s = global.location.search.replace(/^\?/, '');
    var out = {};
    if (!s) return out;
    s.split('&').forEach(function (kv) {
      var pair = kv.split('=');
      var k = decodeURIComponent(pair[0].replace(/\+/g, ' '));
      var v = pair[1] !== undefined ? decodeURIComponent(pair[1].replace(/\+/g, ' ')) : '';
      out[k] = v;
    });
    return out;
  }

  /** 把筛选状态写回 URL 并整页刷新 */
  function commit(patch) {
    patch = patch || {};
    var next = {
      q: patch.q !== undefined ? patch.q : state.q,
      cat: patch.cat !== undefined ? patch.cat : state.cat,
      brand: patch.brand !== undefined ? patch.brand : state.brands,
      band: patch.band !== undefined ? patch.band : state.bands,
      sort: patch.sort !== undefined ? patch.sort : state.sort,
      page: patch.page !== undefined ? patch.page : 1
    };
    var query = [];
    if (next.q) query.push('q=' + encodeURIComponent(next.q));
    if (next.cat) query.push('cat=' + encodeURIComponent(next.cat));
    if (next.brand && next.brand.length) query.push('brand=' + encodeURIComponent(next.brand.join(',')));
    if (next.band && next.band.length) query.push('band=' + encodeURIComponent(next.band.join(',')));
    if (next.sort && next.sort !== 'recommend') query.push('sort=' + encodeURIComponent(next.sort));
    if (Number(next.page) > 1) query.push('page=' + Number(next.page));
    var url = '/shuma/list' + (query.length ? '?' + query.join('&') : '');
    global.location.href = url;
  }

  /* ------------------------------ 派生数据 ---------------------------- */
  function computeBaseList() {
    var list = Data.products.slice();
    var kw = state.q.trim().toLowerCase();
    if (kw) {
      list = list.filter(function (p) {
        return (p.name + ' ' + p.brand + ' ' + (p.tags || []).join(' ') + ' ' + p.category).toLowerCase().indexOf(kw) !== -1;
      });
    }
    if (state.cat) list = list.filter(function (p) { return p.category === state.cat; });
    return list;
  }

  function computeBrandOptions(baseList) {
    var set = [];
    baseList.forEach(function (p) { if (set.indexOf(p.brand) === -1) set.push(p.brand); });
    set.sort(function (a, b) { return a.localeCompare(b, 'zh-Hans-CN'); });
    return set.map(function (b) {
      return {
        value: b, label: b,
        count: baseList.filter(function (p) { return p.brand === b; }).length
      };
    });
  }

  function computeCategoryOptions(baseList) {
    return Data.categories
      .map(function (c) {
        return {
          id: c.id, name: c.name,
          count: baseList.filter(function (p) { return p.category === c.id; }).length
        };
      })
      .filter(function (c) { return c.count > 0 || !state.q; });
  }

  function computeFiltered(baseList) {
    var list = baseList.slice();
    if (state.brands.length) list = list.filter(function (p) { return state.brands.indexOf(p.brand) !== -1; });
    if (state.bands.length) {
      list = list.filter(function (p) {
        return state.bands.some(function (i) {
          var band = Data.priceBands[i];
          return band && p.price >= band.min && p.price <= band.max;
        });
      });
    }
    var arr = list.slice();
    switch (state.sort) {
      case 'sales': arr.sort(function (a, b) { return b.sales - a.sales; }); break;
      case 'price-asc': arr.sort(function (a, b) { return a.price - b.price; }); break;
      case 'price-desc': arr.sort(function (a, b) { return b.price - a.price; }); break;
      case 'rating': arr.sort(function (a, b) { return b.rating - a.rating; }); break;
      case 'new': arr.reverse(); break;
      default:
        arr.sort(function (a, b) { return (b.rating * 1000 + b.sales / 100) - (a.rating * 1000 + a.sales / 100); });
    }
    return arr;
  }

  /* ------------------------------ 渲染 ------------------------------- */
  function catName() {
    var c = Data.categories.find(function (c) { return c.id === state.cat; });
    return c ? c.name : '';
  }

  function activeCount() {
    return (state.cat ? 1 : 0) + state.brands.length + state.bands.length;
  }

  function activeChips() {
    var chips = [];
    if (state.q) chips.push({ key: 'q', label: '搜索：' + state.q, patch: { q: '' } });
    if (state.cat) chips.push({ key: 'cat', label: '分类：' + catName(), patch: { cat: '' } });
    state.brands.forEach(function (b) {
      chips.push({ key: 'brand-' + b, label: '品牌：' + b, patch: { brand: state.brands.filter(function (x) { return x !== b; }) } });
    });
    state.bands.forEach(function (i) {
      chips.push({ key: 'band-' + i, label: '价格：' + (Data.priceBands[i] ? Data.priceBands[i].label : ''), patch: { band: state.bands.filter(function (x) { return x !== i; }) } });
    });
    return chips;
  }

  function renderHead() {
    var name = catName();
    var title = name || (state.q ? '“' + state.q + '” 的搜索结果' : '全部商品');
    var crumb = ''
      + '<nav class="crumb eyebrow" aria-label="面包屑">'
      + '<a href="/shuma/index">首页</a><span>/</span>'
      + '<span>' + (name || '全部商品') + '</span>'
      + '</nav>';
    var ac = activeCount();
    return ''
      + '<div class="list-head">'
      + crumb
      + '<div class="list-head__row">'
      + '<h1 class="display-2">' + title + '</h1>'
      + '<p class="mono list-head__count">' + state.filtered.length + ' 件商品' + (ac ? ' · ' + ac + ' 个筛选条件' : '') + '</p>'
      + '</div>'
      + '</div>';
  }

  function renderMobileToolbar() {
    var ac = activeCount();
    var sortHtml = Data.sortOptions.map(function (opt) {
      return '<button type="button" class="sort-chip' + (state.sort === opt.value ? ' is-active' : '') + '" data-action="sort" data-sort="' + opt.value + '">' + opt.label + '</button>';
    }).join('');
    return ''
      + '<div class="toolbar toolbar--mobile">'
      + '<button type="button" class="btn btn--sm" data-action="open-filter">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4" /></svg>'
      + '筛选' + (ac ? ' · ' + ac : '')
      + '</button>'
      + '<div class="sort-scroll">' + sortHtml + '</div>'
      + '</div>';
  }

  function renderDesktopToolbar() {
    var sortHtml = Data.sortOptions.map(function (opt) {
      return '<button type="button" class="sort-chip' + (state.sort === opt.value ? ' is-active' : '') + '" data-action="sort" data-sort="' + opt.value + '">' + opt.label + '</button>';
    }).join('');
    return ''
      + '<div class="toolbar toolbar--desktop">'
      + '<span class="eyebrow">SORT</span>'
      + sortHtml
      + '</div>';
  }

  function renderFilterPanel(categoryOptions, brandOptions) {
    var bandOptions = Data.priceBands.map(function (b, i) { return { value: String(i), label: b.label }; });
    var totalCount = categoryOptions.reduce(function (s, c) { return s + c.count; }, 0);
    var catsHtml = ''
      + '<li><button type="button" class="fp__cat' + (!state.cat ? ' is-active' : '') + '" data-action="set-cat" data-cat="">'
      + '<span>全部分类</span><span class="fp__cat-count mono">' + totalCount + '</span>'
      + '</button></li>';
    catsHtml += categoryOptions.map(function (c) {
      return '<li><button type="button" class="fp__cat' + (state.cat === c.id ? ' is-active' : '') + '" data-action="set-cat" data-cat="' + c.id + '">'
        + '<span>' + c.name + '</span><span class="fp__cat-count mono">' + c.count + '</span>'
        + '</button></li>';
    }).join('');

    var ac = activeCount();
    return ''
      + '<div class="fp">'
      + '<div class="fp__head"><span class="eyebrow">FILTER</span>'
      + (ac ? '<button type="button" class="fp__reset" data-action="reset">重置（' + ac + '）</button>' : '')
      + '</div>'
      + '<section class="fp__group"><h3 class="fp__title">商品分类</h3><ul class="fp__cats">' + catsHtml + '</ul></section>'
      + '<section class="fp__group"><h3 class="fp__title">品牌</h3>'
      + Components.MultiSelect.render({ label: '品牌', items: brandOptions, selected: state.brands })
      + '</section>'
      + '<section class="fp__group"><h3 class="fp__title">价格区间</h3>'
      + Components.MultiSelect.render({ label: '价格', items: bandOptions, selected: state.bands.map(String) })
      + '</section>'
      + '<p class="fp__tip">多选下拉点击展开，勾选后即生效</p>'
      + '</div>';
  }

  function renderChips() {
    var chips = activeChips();
    if (!chips.length) return '';
    var html = chips.map(function (c) {
      return '<span class="chip">' + c.label
        + '<button type="button" class="chip__x" data-action="chip-remove" data-patch=\'' + JSON.stringify(c.patch) + '\' aria-label="移除筛选条件 ' + c.label + '">'
        + '<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" /></svg>'
        + '</button></span>';
    }).join('');
    return '<div class="chips active-chips">' + html + '<button type="button" class="chips__clear" data-action="reset">全部清除</button></div>';
  }

  function renderSkeleton() {
    var sk = '';
    for (var i = 0; i < 8; i++) sk += Components.SkeletonCard.render();
    return '<div class="grid-products">' + sk + '</div>';
  }

  function renderResults(paged, pageCount) {
    var cards = paged.map(function (p, i) {
      return Components.ProductCard.render(p);
    }).join('');
    var pagination = '';
    if (pageCount > 1) {
      var base = '/shuma/list?';
      var params = [];
      if (state.q) params.push('q=' + encodeURIComponent(state.q));
      if (state.cat) params.push('cat=' + encodeURIComponent(state.cat));
      if (state.brands.length) params.push('brand=' + encodeURIComponent(state.brands.join(',')));
      if (state.bands.length) params.push('band=' + encodeURIComponent(state.bands.join(',')));
      if (state.sort && state.sort !== 'recommend') params.push('sort=' + encodeURIComponent(state.sort));
      var baseHref = '/shuma/list' + (params.length ? '?' + params.join('&') + '&' : '?') + 'page=';
      pagination = '<div class="list-pagination">'
        + Components.PaginationBar.render({ page: state.page, total: pageCount, baseHref: baseHref })
        + '</div>';
    }
    return '<div class="grid-products">' + cards + '</div>' + pagination;
  }

  function renderEmpty() {
    return Components.EmptyState.render({
      icon: '⊙',
      title: '没有找到匹配的商品',
      text: '试着减少筛选条件，或者换一个关键词再搜一次。',
      action: '清空全部条件',
      actionHref: '/shuma/list'
    });
  }

  function renderDrawer(categoryOptions, brandOptions) {
    if (!UI.filterDrawerOpen) return '';
    return ''
      + '<div class="drawer" data-action="drawer">'
      + '<div class="drawer__scrim" data-action="close-filter"></div>'
      + '<div class="drawer__panel" role="dialog" aria-modal="true" aria-label="筛选">'
      + '<div class="drawer__head">'
      + '<span class="display-3">筛选</span>'
      + '<button type="button" class="icon-btn" aria-label="关闭筛选" data-action="close-filter">'
      + '<svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 3 L11 11 M11 3 L3 11" /></svg>'
      + '</button>'
      + '</div>'
      + '<div class="drawer__body">' + renderFilterPanel(categoryOptions, brandOptions) + '</div>'
      + '<div class="drawer__foot">'
      + '<button type="button" class="btn btn--block" data-action="reset">重置</button>'
      + '<button type="button" class="btn btn--primary btn--block" data-action="close-filter">查看 ' + state.filtered.length + ' 件商品</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function renderPage() {
    var $root = $('#list-root');
    var baseList = computeBaseList();
    var brandOptions = computeBrandOptions(baseList);
    var categoryOptions = computeCategoryOptions(baseList);
    var filtered = computeFiltered(baseList);
    state.filtered = filtered;
    var pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page > pageCount) state.page = 1;
    var paged = filtered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    var main;
    if (state.loading) {
      main = renderDesktopToolbar() + renderSkeleton();
    } else if (paged.length) {
      main = renderDesktopToolbar() + renderChips() + renderResults(paged, pageCount);
    } else {
      main = renderDesktopToolbar() + renderChips() + renderEmpty();
    }

    var html = ''
      + '<div class="list-view container">'
      + renderHead()
      + renderMobileToolbar()
      + '<div class="split-layout">'
      + '<aside class="split-layout__aside">' + renderFilterPanel(categoryOptions, brandOptions) + '</aside>'
      + '<div class="list-main">' + main + '</div>'
      + '</div>'
      + '</div>'
      + renderDrawer(categoryOptions, brandOptions);

    $root.html(html);
    bind($root);
    if (!state.loading) {
      Components.ProductCard.bind($root);
      Volta.Reveal.init(document);
    }
  }

  /* ------------------------------ 事件 ------------------------------- */
  function bind($root) {
    // 排序切换
    $root.on('click', '[data-action="sort"]', function (e) {
      e.preventDefault();
      commit({ sort: $(this).data('sort') });
    });

    // 分类切换
    $root.on('click', '[data-action="set-cat"]', function (e) {
      e.preventDefault();
      commit({ cat: $(this).data('cat') });
    });

    // 重置全部
    $root.on('click', '[data-action="reset"]', function (e) {
      e.preventDefault();
      commit({ q: '', cat: '', brand: [], band: [], sort: 'recommend', page: 1 });
    });

    // 移除单个 chip
    $root.on('click', '[data-action="chip-remove"]', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var patch = $(this).data('patch');
      commit(patch);
    });

    // 打开筛选抽屉
    $root.on('click', '[data-action="open-filter"]', function (e) {
      e.preventDefault();
      UI.openFilterDrawer();
      renderPage();
    });

    // 关闭筛选抽屉（点击 scrim / 关闭按钮 / 查看商品）
    $root.on('click', '[data-action="close-filter"]', function (e) {
      e.preventDefault();
      UI.closeFilterDrawer();
      renderPage();
    });

    // 抽屉里的多选下拉：展开 + 选择
    Components.MultiSelect.bind($root, function (selected, $wrap) {
      // 根据下拉所在 group 决定是 brand 还是 band
      var $group = $wrap.closest('.fp__group');
      var title = $group.find('.fp__title').text();
      if (title === '品牌') {
        commit({ brand: selected });
      } else if (title === '价格区间') {
        commit({ band: selected.map(Number) });
      }
    });
  }

  /* ------------------------------ 入口 ------------------------------- */
  function render() {
    syncFromQuery();
    state.filtered = [];
    renderPage();
    // 模拟首屏加载延迟
    setTimeout(function () {
      state.loading = false;
      renderPage();
    }, 520);
  }

  $(function () {
    UI.initTheme();
    Volta.Layout.mount('list');
    render();
    setTimeout(function () { Volta.Reveal.init(document); }, 0);
  });
})(window);
