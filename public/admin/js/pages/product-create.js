/**
 * product-create.js —— 商品发布页（静态 DOM 版）
 *
 * 架构：表单结构写在 product-create.html 的 <template> 里，
 *       JS 只做 init / 事件绑定 / 定向更新，绝不重建整个 DOM。
 *       这样中文 IME 组合输入零打断，校验错误和预览都是增量更新。
 *
 * 媒体存储：图片 Canvas 压缩为 base64 dataURL（≤400KB/张，最多 5 张）；
 *          视频 FileReader 转 base64（源文件 ≤1.5MB）。
 *          纯 localStorage，未来接后端时把 base64 替换成 URL 即可。
 */
(function (global) {
  'use strict';
  var $ = global.jQuery;
  var Volta = global.Volta;
  var F = Volta.Format;
  var UI = Volta.UI;
  var Data = Volta.Data;
  var Products = Volta.Products;

  /* ------------------------------ 常量 ------------------------------ */
  var MAX_IMAGES = 5;
  var MAX_VIDEO_BYTES = 1.5 * 1024 * 1024;   // 视频源文件上限 1.5MB
  var MAX_IMG_EDGE = 1600;                   // 图片 Canvas resize 最大边
  var IMG_JPEG_QUALITY = 0.82;               // JPEG 压缩质量（试到 400KB 稳定）

  /* ------------------------------ state ------------------------------ */

  var DEFAULTS = function () {
    return {
      name: '',
      brand: (Data.brandList && Data.brandList[0]) || 'VOLTA',
      category: (Data.categories && Data.categories[0]) ? Data.categories[0].id : 'peripheral',
      price: '',
      listPrice: '',
      stock: '',
      tags: '',
      description: '',
      images: [],   // dataURL[]
      video: null,  // dataURL or null
      touched: false
    };
  };

  var state = DEFAULTS();

  /* ------------------------------ 校验 ------------------------------ */

  function validate() {
    var errs = {};
    // 名称：必填
    if (!state.name.trim()) errs.name = '请输入商品名称';

    // 售价：必填 + 数字 + 非负
    if (!state.price.trim()) {
      errs.price = '请输入售价';
    } else {
      var p = Number(state.price);
      if (!isFinite(p) || p < 0) errs.price = '售价必须是不小于 0 的数字';
    }

    // 划线价：选填，但填了就必须是合法数字，且 ≥ 售价
    if (state.listPrice.trim()) {
      var lp = Number(state.listPrice);
      if (!isFinite(lp) || lp < 0) {
        errs.listPrice = '划线价必须是不小于 0 的数字';
      } else if (state.price.trim()) {
        var pp = Number(state.price);
        if (isFinite(pp) && lp < pp) errs.listPrice = '划线价应不低于售价';
      }
    }

    // 库存：选填，非负整数
    if (state.stock.trim()) {
      var s = Number(state.stock);
      if (!isFinite(s) || s < 0) errs.stock = '初始库存必须是不小于 0 的整数';
    }

    return errs;
  }

  /* ------------------------------ 图片压缩 ------------------------------ */

  /**
   * 把 File 读成 Image，Canvas 等比缩小，toBlob 成 JPEG dataURL。
   * @returns Promise<string>  dataURL
   */
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('读取图片失败')); };
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth;
          var h = img.naturalHeight;
          var scale = Math.min(1, MAX_IMG_EDGE / Math.max(w, h));
          var dw = Math.round(w * scale);
          var dh = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = dw;
          canvas.height = dh;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';  // JPEG 不支持透明，垫白
          ctx.fillRect(0, 0, dw, dh);
          ctx.drawImage(img, 0, 0, dw, dh);
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error('图片压缩失败')); return; }
            var r2 = new FileReader();
            r2.onload = function () { resolve(r2.result); };
            r2.onerror = function () { reject(new Error('压缩后读取失败')); };
            r2.readAsDataURL(blob);
          }, 'image/jpeg', IMG_JPEG_QUALITY);
        };
        img.onerror = function () { reject(new Error('图片解码失败')); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 把视频文件读成 base64 dataURL（不压缩，靠用户选小文件）。
   */
  function readVideo(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('读取视频失败')); };
      reader.onload = function () { resolve(reader.result); };
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------ Gallery 渲染 ------------------------------ */

  function galleryHint() {
    return '<div class="pc-gallery__hint">'
      + '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>'
      + '点击添加图片'
    + '</div>';
  }

  /** 重建整个 gallery DOM（5 个 slot） */
  function renderGallery() {
    var $g = $('[data-gallery]');
    if (!$g.length) return;
    var html = '';
    for (var i = 0; i < MAX_IMAGES; i++) {
      if (i < state.images.length) {
        html += '<div class="pc-gallery__slot has-image" data-slot="' + i + '">'
          + '<img src="' + state.images[i] + '" alt="商品图片 ' + (i + 1) + '">'
          + '<button type="button" class="pc-slot-remove" data-action="remove-image" data-idx="' + i + '" aria-label="删除图片">×</button>'
        + '</div>';
      } else {
        html += '<div class="pc-gallery__slot" data-slot="' + i + '">' + galleryHint() + '</div>';
      }
    }
    $g.html(html);
  }

  function renderVideoSlot() {
    var $v = $('[data-video-slot]');
    if (!$v.length) return;
    if (state.video) {
      $v.addClass('has-video').html('<video src="' + state.video + '" muted preload="metadata"></video>'
        + '<button type="button" class="pc-slot-remove" data-action="remove-video" aria-label="删除视频">×</button>');
    } else {
      $v.removeClass('has-video').html(
        '<div class="pc-gallery__hint">'
          + '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m10 9 5 3-5 3V9z" fill="currentColor"/></svg>'
          + '点击上传视频'
        + '</div>'
      );
    }
  }

  /* ------------------------------ 媒体事件 ------------------------------ */

  function bindMediaEvents() {
    // 点击空 slot → 触发隐藏 file input
    $('#page-root').on('click', '[data-gallery] [data-slot]', function () {
      if ($(this).hasClass('has-image')) return;
      if (state.images.length >= MAX_IMAGES) { UI.toast('最多 ' + MAX_IMAGES + ' 张图片', 'warn'); return; }
      $('[data-gallery-input]').trigger('click');
    });
    $('#page-root').on('click', '[data-video-slot]', function () {
      if ($(this).hasClass('has-video')) return;
      $('[data-video-input]').trigger('click');
    });

    // 删除图片
    $('#page-root').on('click', '[data-action="remove-image"]', function (e) {
      e.stopPropagation();
      var idx = Number($(this).data('idx'));
      state.images.splice(idx, 1);
      renderGallery();
    });
    // 删除视频
    $('#page-root').on('click', '[data-action="remove-video"]', function (e) {
      e.stopPropagation();
      state.video = null;
      renderVideoSlot();
    });

    // 图片文件选择
    $('#page-root').on('change', '[data-gallery-input]', function () {
      var files = Array.prototype.slice.call(this.files || []);
      var room = MAX_IMAGES - state.images.length;
      if (!room) { UI.toast('最多 ' + MAX_IMAGES + ' 张图片', 'warn'); this.value = ''; return; }
      var take = files.slice(0, room);
      if (files.length > room) UI.toast('只取前 ' + room + ' 张（最多 ' + MAX_IMAGES + ' 张）', 'warn');
      var ok = 0, fail = 0;
      take.forEach(function (file) {
        compressImage(file).then(function (dataURL) {
          state.images.push(dataURL);
          ok++;
          if (ok + fail === take.length) {
            renderGallery();
            UI.toast('已上传 ' + ok + ' 张图片', 'success');
          }
        }).catch(function (err) {
          fail++;
          UI.toast(err.message || '图片上传失败', 'error');
          if (ok + fail === take.length) renderGallery();
        });
      });
      this.value = '';
    });

    // 视频文件选择
    $('#page-root').on('change', '[data-video-input]', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      if (file.size > MAX_VIDEO_BYTES) {
        UI.toast('视频超过 ' + Math.round(MAX_VIDEO_BYTES / 1024 / 1024) + 'MB，请压缩后再传', 'error');
        this.value = '';
        return;
      }
      if (!/^video\//.test(file.type)) {
        UI.toast('请选择视频文件', 'error');
        this.value = '';
        return;
      }
      readVideo(file).then(function (dataURL) {
        state.video = dataURL;
        renderVideoSlot();
        UI.toast('视频已上传', 'success');
      }).catch(function (err) {
        UI.toast(err.message || '视频上传失败', 'error');
      });
      this.value = '';
    });
  }

  /* ------------------------------ DOM 定向更新 ------------------------------ */

  /** 只更新预览区 3 个文本节点，零 DOM 重建 */
  function updatePreview() {
    var $root = $('[data-preview]');
    if (!$root.length) return;
    var name = state.name.trim() || '商品名称占位';
    var price = state.price.trim() ? ('¥' + F.formatPrice(Number(state.price))) : '待填';
    var desc = state.description.trim() || '商品描述将显示在这里...';
    $root.find('[data-preview-name]').text(name);
    $root.find('[data-preview-price]').text(price);
    $root.find('[data-preview-desc]').text(desc);
  }

  /** 清除所有错误提示 */
  function clearErrors() {
    $('[data-error-for]').text('');
    $('.field').removeClass('has-error');
  }

  /** 显示错误（定向填充已有 <p class="field__error"> 节点） */
  function showErrors(errs) {
    clearErrors();
    Object.keys(errs).forEach(function (key) {
      $('[data-error-for="' + key + '"]').text(errs[key]);
      $('[data-field-wrap="' + key + '"]').addClass('has-error');
    });
  }

  /* ------------------------------ init ------------------------------ */

  /** 把 <template> clone 到 #page-root，填充 select 选项，只执行一次 */
  function init() {
    // 1. 从 <template> clone DOM（只建一次）
    var tpl = document.getElementById('tpl-product-create');
    if (!tpl) { UI.toast('页面模板缺失', 'error'); return; }
    $('#page-root').html(tpl.content.cloneNode(true));

    // 2. 渲染媒体区初始空槽位
    renderGallery();
    renderVideoSlot();

    // 3. 绑定事件
    bind();
    bindMediaEvents();

    // 4. 首次预览
    updatePreview();

    // 5. 【v2】从数据库拉品牌 + 分类（真实 id），填充下拉
    var token = Volta.Admin.getToken();
    var H = { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token };
    function getJSON(url) {
      return fetch(url, { headers: H }).then(function (r) { return r.json(); })
        .then(function (j) { if (j.code !== 0) throw new Error(j.message || '拉取失败'); return j.data; });
    }
    Promise.all([
      getJSON('/shuma/api/admin/brands?pageSize=100').catch(function () { return null; }),
      getJSON('/shuma/api/admin/categories?pageSize=100').catch(function () { return null; })
    ]).then(function (rs) {
      var brands = rs[0];
      var cats = rs[1];
      var $brand = $('[data-field="brand"]');
      var $cat = $('[data-field="category"]');
      if (brands && brands.list && brands.list.length) {
        state.brandId = brands.list[0].id;
        $brand.html(brands.list.map(function (b) {
          return '<option value="' + b.id + '">' + b.name + '</option>';
        }).join(''));
      }
      if (cats && cats.list && cats.list.length) {
        state.categoryId = cats.list[0].id;
        $cat.html(cats.list.map(function (c) {
          return '<option value="' + c.id + '">' + c.name + '</option>';
        }).join(''));
      }
    }).catch(function (e) { console.warn('[product-create] 下拉数据拉取失败:', e.message); });
  }

  /* ------------------------------ 事件绑定 ------------------------------ */

  function bind() {
    // input：只更新 state，不触发校验、不重建 DOM
    $('#page-root').on('input change', '[data-field]', function () {
      var k = $(this).data('field');
      state[k] = $(this).val();
      // 实时预览（只更新文本节点）
      if (k === 'name' || k === 'price' || k === 'description') updatePreview();
    });

    // blur：触发校验（用户离开字段时才显示错误，避免打字过程中闪烁）
    $('#page-root').on('blur', '[data-field]', function () {
      state.touched = true;
      showErrors(validate());
    });

    // 提交
    $('#page-root').on('click', '[data-action="submit"]', function (e) {
      e.preventDefault();
      state.touched = true;
      // 从 DOM 再同步一遍（防止有未触发 input 的值）
      syncFromDOM();
      var errs = validate();
      showErrors(errs);
      if (Object.keys(errs).length) {
        UI.toast('请修正表单错误', 'error');
        return;
      }
      submit();
    });

    // 重置
    $('#page-root').on('click', '[data-action="reset"]', function (e) {
      e.preventDefault();
      state = DEFAULTS();
      syncToDOM();
      clearErrors();
      updatePreview();
      renderGallery();
      renderVideoSlot();
    });
  }

  /** 把 state 同步到 DOM（reset 时用） */
  function syncToDOM() {
    $('#page-root [data-field]').each(function () {
      var k = $(this).data('field');
      $(this).val(state[k]);
    });
  }

  /** 把 DOM 值同步回 state（submit 前兜底） */
  function syncFromDOM() {
    $('#page-root [data-field]').each(function () {
      var k = $(this).data('field');
      state[k] = $(this).val();
    });
  }

  /* ------------------------------ 提交 ------------------------------ */

  function submit() {
    var price = Math.round(Number(state.price));
    var listPrice = state.listPrice.trim() ? Math.round(Number(state.listPrice)) : price;
    var tags = state.tags.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 3);

    // 【v3】brandId/categoryId 以 DOM 下拉选中值为权威来源（state 只是缓存）
    var brandSel = $('[data-field="brand"]').val();
    var catSel = $('[data-field="category"]').val();
    var brandId = Number(brandSel) || Number(state.brandId) || null;
    var categoryId = Number(catSel) || Number(state.categoryId) || null;

    // 【v3】提交到后端，写入 ssc_shangpin 商品表（含初始库存流水）
    var payload = {
      name: state.name.trim(),
      brandId: brandId,
      categoryId: categoryId,
      price: price,
      listPrice: listPrice,
      stock: state.stock.trim() ? Math.round(Number(state.stock)) : 0,
      tags: tags,
      description: state.description.trim(),
      onSale: true
    };
    if (!payload.brandId || !payload.categoryId) {
      UI.toast('品牌/分类数据未就绪，请等下拉框填充后再提交（或刷新页面重试）', 'error');
      return;
    }

    var token = Volta.Admin.getToken();
    var $btn = $('[data-action="submit"]');
    $btn.prop('disabled', true);
    fetch('/shuma/api/admin/products', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.code !== 0) throw new Error(j.message || '保存失败');
      UI.toast('商品「' + payload.name + '」已保存到商品表（ID ' + (j.data && j.data.id) + '），即将跳转商品管理', 'success');
      setTimeout(function () { location.href = '/shuma/admin/products?page=last'; }, 1800);
    }).catch(function (e) {
      UI.toast('发布失败：' + (e.message || '未知错误'), 'error');
      $btn.prop('disabled', false);
    });
  }

  /* ------------------------------ 启动 ------------------------------ */

  $(function () {
    if (!Volta.AdminAuth.requireAdmin('/shuma/admin/login')) return;
    UI.initTheme();
    Volta.AdminLayout.init();
    init();
    setTimeout(function () { Volta.Reveal && Volta.Reveal.init(document); }, 0);
  });
})(window);
