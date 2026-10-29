/**
 * addresses.js —— 收货地址管理（jQuery 版）
 * 功能：列表、新增、编辑、删除、设默认
 */
(function (global) {
  var $ = global.jQuery;
  var Volta = global.Volta;
  var UI = Volta.UI;
  var User = Volta.User;

  var loginTarget = '/shuma/login?redirect=' + encodeURIComponent(Volta.Auth.currentPath());
  if (!Volta.Auth.requireLogin(loginTarget)) {
    // 给用户一个明确提示，避免看到空白页困惑
    try { Volta.UI.toast('请先登录', 'info'); } catch (e) {}
    return;
  }

  var TEMP_ADDR_KEY = 'volta.tmp.pickedAddr';
  var params = new URLSearchParams(location.search);
  var isSelectMode = params.get('mode') === 'select';
  var redirect = params.get('redirect') || '/shuma/profile';
  var selectedId = '';
  try { selectedId = localStorage.getItem(TEMP_ADDR_KEY) || ''; } catch (e) {}

  function header() {
    var title = isSelectMode ? '选择收货地址' : '收货地址';
    var backHref = isSelectMode ? redirect : '/shuma/profile';
    return '<header class="page-head">'
      + '<a href="' + backHref + '" class="page-head__back">‹ 返回</a>'
      + '<h1 class="page-head__title">' + title + '</h1>'
      + '</header>';
  }

  /* 操作按钮（轻量图标 + 文字） */
  var ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  var ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>';
  var ICON_STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

  function addressCard(a) {
    var selectCls = isSelectMode ? ' addr-card--selectable' + (selectedId === a.id ? ' is-picked' : '') : '';
    var cardAttr = isSelectMode ? ' data-action="pick-address" data-id="' + a.id + '"' : '';
    var mainAttr = '';
    var actions = isSelectMode
      ? (!a.isDefault ? '<button type="button" class="addr-action addr-action--primary" data-action="set-default" data-id="' + a.id + '">' + ICON_STAR + '设为默认</button>' : '')
      : '<button type="button" class="addr-action" data-action="edit" data-id="' + a.id + '">' + ICON_EDIT + '编辑</button>'
        + '<button type="button" class="addr-action addr-action--danger" data-action="delete" data-id="' + a.id + '">' + ICON_TRASH + '删除</button>'
        + (!a.isDefault ? '<button type="button" class="addr-action addr-action--primary" data-action="set-default" data-id="' + a.id + '">' + ICON_STAR + '设为默认</button>' : '');
    return '<article class="addr-card card' + selectCls + '"' + cardAttr + '>'
      + '<div class="addr-card__main">'
      + '<div class="addr-card__row">'
      + '<span class="addr-card__name">' + (a.name || '收件人') + '</span>'
      + '<span class="addr-card__phone mono">' + (a.phone || '') + '</span>'
      + (a.isDefault ? '<span class="addr-card__default">默认</span>' : '')
      + '</div>'
      + '<p class="addr-card__region">' + (a.region || '') + '</p>'
      + '<p class="addr-card__detail">' + (a.detail || '') + '</p>'
      + '</div>'
      + '<div class="addr-card__actions">' + actions + '</div>'
      + (isSelectMode && selectedId === a.id ? '<span class="addr-card__tick">✓</span>' : '')
      + '</article>';
  }

  function render() {
    var $root = $('#addresses-root');
    var list = User.listAddresses();
    var body = '';
    if (!list.length) {
      body = '<div class="empty-state"><div class="empty-state__icon">📍</div><h3 class="empty-state__title">暂无收货地址</h3><p class="empty-state__text">添加一个常用收货地址吧</p></div>';
    } else {
      body = list.map(addressCard).join('');
    }
    var addBtn = '<button type="button" class="btn btn--block btn--accent addr-add-btn" data-action="add">+ 新增收货地址</button>';
    $root.html('<div class="container page-scoped">' + header() + body + addBtn + '</div>');
    bind($root);
  }

  function openForm(existing) {
    // 先清掉任何残留 modal（防止双击叠加多个）
    $('.modal-scrim').remove();
    $('body').removeClass('is-modal-open');

    var addr = existing || { name: '', phone: '', region: '', detail: '', isDefault: false };
    var isEdit = !!existing;
    var title = isEdit ? '编辑地址' : '新增地址';

    var html = '<div class="modal-scrim" data-action="close-form">'
      + '<div class="modal-panel addr-form" role="dialog" aria-label="' + title + '">'
      + '<header class="addr-form__head"><h3>' + title + '</h3><button type="button" class="addr-form__x" data-action="close-form">×</button></header>'
      + '<div class="addr-form__body">'
      + '<label class="field"><span class="field__label">收件人</span><input class="input" data-field="name" value="' + (addr.name || '') + '" placeholder="请输入姓名"></label>'
      + '<label class="field"><span class="field__label">手机号</span><input class="input" data-field="phone" value="' + (addr.phone || '') + '" placeholder="请输入手机号"></label>'
      + regionFieldHtml(addr.region)
      + '<label class="field"><span class="field__label">详细地址</span><textarea class="textarea" data-field="detail" placeholder="街道、门牌号等">' + (addr.detail || '') + '</textarea></label>'
      + '<label class="addr-form__check"><input type="checkbox" data-field="is-default"' + (addr.isDefault ? ' checked' : '') + '> 设为默认地址</label>'
      + '</div>'
      + '<footer class="addr-form__foot">'
      + '<button type="button" class="btn btn--outline" data-action="close-form">取消</button>'
      + '<button type="button" class="btn btn--accent" data-action="save-form">保存</button>'
      + '</footer>'
      + '</div></div>';

    // 用 appendTo 拿到刚 append 的那个 modal，确保 $form 唯一性
    var $modal = $(html).appendTo('body').addClass('is-modal-open');
    var $form = $modal.find('.addr-form');
    $form.data('editing-id', isEdit ? existing.id : null);
    bindForm($form);
  }

  /* ---------- 省市区级联 + 手动输入切换 ---------- */
  function splitRegion(regionStr) {
    // 从已有地址字符串里尝试拆出 省 市 区
    if (!regionStr) return { province: '', city: '', district: '', raw: '' };
    var parts = String(regionStr).split(/\s+/);
    // 启发式：拿前 3 段作为 province / city / district
    return {
      province: parts[0] || '',
      city: parts[1] || '',
      district: parts[2] || '',
      raw: regionStr
    };
  }
  function selectOptions(values, selected) {
    return '<option value="">请选择</option>'
      + values.map(function (v) {
        return '<option value="' + v + '"' + (v === selected ? ' selected' : '') + '>' + v + '</option>';
      }).join('');
  }
  function regionFieldHtml(existingRegion) {
    var data = Volta.Data;
    var split = splitRegion(existingRegion);
    var provinces = data.getProvinces();
    var cities = split.province ? data.getCities(split.province) : [];
    var districts = (split.province && split.city) ? data.getDistricts(split.province, split.city) : [];

    // 判断用哪种模式：已存地址能匹配就用 select，否则用 manual
    var selectMode = !!(split.province && provinces.indexOf(split.province) >= 0);

    return ''
      + '<div class="field">'
      + '<span class="field__label">所在地区 <button type="button" class="addr-region-toggle" data-action="toggle-region" data-target="' + (selectMode ? 'select' : 'manual') + '">切换为' + (selectMode ? '手动输入' : '选择器') + '</button></span>'
      + '<div class="addr-region" data-mode="' + (selectMode ? 'select' : 'manual') + '">'
      // select 模式
      + '<div class="addr-region__selects"' + (selectMode ? '' : ' style="display:none"') + '>'
      + '<select class="input select" data-region-level="province">' + selectOptions(provinces, split.province) + '</select>'
      + '<select class="input select" data-region-level="city">' + selectOptions(cities, split.city) + '</select>'
      + '<select class="input select" data-region-level="district">' + selectOptions(districts, split.district) + '</select>'
      + '</div>'
      // manual 模式
      + '<div class="addr-region__manual"' + (selectMode ? ' style="display:none"' : '') + '>'
      + '<input class="input" data-field="region-manual" value="' + (selectMode ? '' : split.raw) + '" placeholder="省 / 市 / 区，如：广东省 深圳市 南山区">'
      + '</div>'
      // 最终提交用的隐藏字段
      + '<input type="hidden" data-field="region" value="' + existingRegion + '">'
      + '</div></div>';
  }

  function updateRegionHidden($form) {
        // 用原生 DOM，避开 jQuery .data / .val 在事件触发链上的时序问题
    var root = $form[0];
    var wrap = root.querySelector('.addr-region');
    var mode = wrap.getAttribute('data-mode');
    var hidden = root.querySelector('input[type="hidden"][data-field="region"]');
        if (mode === 'select') {
      var pSel = root.querySelector('[data-region-level="province"]');
      var cSel = root.querySelector('[data-region-level="city"]');
      var dSel = root.querySelector('[data-region-level="district"]');
      var p = pSel ? (pSel.value || '').trim() : '';
      var c = cSel ? (cSel.value || '').trim() : '';
      var d = dSel ? (dSel.value || '').trim() : '';
      hidden.value = Volta.Data.buildRegion(p, c, d);
          } else {
      var manual = root.querySelector('[data-field="region-manual"]');
            hidden.value = manual ? (manual.value || '').trim() : '';
          }
  }

  function bindForm($form) {
    $form.on('click', '[data-action="close-form"]', function () {
      $('.modal-scrim').remove();
      $('body').removeClass('is-modal-open');
    });

    // ---- 省市区级联 ----
    $form.on('change', '[data-region-level="province"]', function () {
      var province = $(this).val();
      var $city = $form.find('[data-region-level="city"]');
      var $district = $form.find('[data-region-level="district"]');
      var cities = province ? Volta.Data.getCities(province) : [];
      $city.html(selectOptions(cities, ''));
      $district.html(selectOptions([], ''));
      updateRegionHidden($form);
    });
    $form.on('change', '[data-region-level="city"]', function () {
      var province = $form.find('[data-region-level="province"]').val();
      var city = $(this).val();
      var $district = $form.find('[data-region-level="district"]');
      var districts = (province && city) ? Volta.Data.getDistricts(province, city) : [];
      $district.html(selectOptions(districts, ''));
      updateRegionHidden($form);
    });
    $form.on('change', '[data-region-level="district"]', updateRegionHidden.bind(null, $form));

    // ---- 模式切换 ----
    $form.on('click', '[data-action="toggle-region"]', function () {
      var wrap = $form[0].querySelector('.addr-region');
      var cur = wrap.getAttribute('data-mode');
      var btn = this;
      if (cur === 'select') {
        // 切到手动
        wrap.setAttribute('data-mode', 'manual');
        wrap.querySelector('.addr-region__selects').style.display = 'none';
        wrap.querySelector('.addr-region__manual').style.display = '';
        // 把 hidden 当前值灌进 manual input
        var curVal = $form[0].querySelector('input[type="hidden"][data-field="region"]').value;
        wrap.querySelector('[data-field="region-manual"]').value = curVal;
        btn.textContent = '切换为选择器';
      } else {
        // 切回 select：尝试把 manual 值拆进 selects
        var raw = wrap.querySelector('[data-field="region-manual"]').value;
        var split = splitRegion(raw);
        wrap.setAttribute('data-mode', 'select');
        wrap.querySelector('.addr-region__manual').style.display = 'none';
        wrap.querySelector('.addr-region__selects').style.display = '';
        var provinces = Volta.Data.getProvinces();
        if (split.province && provinces.indexOf(split.province) >= 0) {
          var pSel = wrap.querySelector('[data-region-level="province"]');
          var cSel = wrap.querySelector('[data-region-level="city"]');
          var dSel = wrap.querySelector('[data-region-level="district"]');
          pSel.value = split.province;
          // 先级联更新 city 列表
          var cities = Volta.Data.getCities(split.province);
          cSel.innerHTML = selectOptions(cities, split.city);
          var districts = Volta.Data.getDistricts(split.province, split.city);
          dSel.innerHTML = selectOptions(districts, split.district);
        }
        btn.textContent = '切换为手动输入';
      }
      updateRegionHidden($form);
    });

    // 手动输入也要同步到 hidden
    $form.on('input', '[data-field="region-manual"]', updateRegionHidden.bind(null, $form));

    $form.on('click', '[data-action="save-form"]', function () {
      updateRegionHidden($form);
      // 从三级下拉取省/市/区（手动输入模式则从 region 串拆分），后端地址表按三字段存储
      var province = $.trim($form.find('[data-region-level="province"]').val() || '');
      var city = $.trim($form.find('[data-region-level="city"]').val() || '');
      var district = $.trim($form.find('[data-region-level="district"]').val() || '');
      var data = {
        name: $.trim($form.find('[data-field="name"]').val()),
        phone: $.trim($form.find('[data-field="phone"]').val()),
        region: $.trim($form.find('[data-field="region"]').val()),
        province: province,
        city: city,
        district: district,
        detail: $.trim($form.find('[data-field="detail"]').val()),
        isDefault: $form.find('[data-field="is-default"]').prop('checked')
      };
      // 手动输入模式：下拉为空，从 region 串拆分补齐
      if (!province || !city || !district) {
        var parts = splitRegion(data.region);
        data.province = data.province || parts.province;
        data.city = data.city || parts.city;
        data.district = data.district || parts.district;
      }
      if (!data.name) { UI.toast('请填写收件人', 'error'); return; }
      if (!data.phone) { UI.toast('请填写手机号', 'error'); return; }
      if (!data.region) { UI.toast('请填写所在地区', 'error'); return; }
      if (!data.province || !data.city || !data.district) { UI.toast('所在地区需包含省、市、区县', 'error'); return; }
      if (!data.detail) { UI.toast('请填写详细地址', 'error'); return; }

      var editingId = $form.data('editing-id');
      if (editingId) {
        // 编辑：本地立即生效 + API 异步同步（store-user 内部处理）
        User.updateAddress(editingId, data);
        UI.toast('地址已更新', 'success');
        $('.modal-scrim').remove();
        $('body').removeClass('is-modal-open');
        render();
      } else {
        // 新增：Promise 版（API 成功后从数据库刷新列表，失败弹具体错误）
        User.addAddress(data).then(function (newId) {
          UI.toast('地址已添加', 'success');
          if (isSelectMode) {
            // 选择模式下：新增后自动选中新地址并跳回
            try { localStorage.setItem(TEMP_ADDR_KEY, newId); } catch (e) {}
            global.location.href = redirect;
            return;
          }
          $('.modal-scrim').remove();
          $('body').removeClass('is-modal-open');
          render();
        }).catch(function (e) {
          UI.toast((e && e.message) || '保存失败，请重试', 'error');
        });
      }
    });
  }

  function bind($root) {
    $root.off('click').on('click', '[data-action="add"]', function () { openForm(null); });
    $root.on('click', '[data-action="edit"]', function () {
      var id = $(this).data('id');
      var a = User.getAddress(id);
      if (a) openForm(a);
    });
    $root.on('click', '[data-action="set-default"]', function (e) {
      if (isSelectMode) e.stopPropagation();
      User.setDefaultAddress($(this).data('id'));
      UI.toast('已设为默认地址', 'success');
      render();
    });
    $root.on('click', '[data-action="delete"]', function () {
      var id = $(this).data('id');
      if (confirm('确认删除这个地址？')) {
        User.removeAddress(id);
        UI.toast('地址已删除', 'info');
        render();
      }
    });
    // 选择模式下：点击地址卡片主体 → 选中并返回
    $root.on('click', '[data-action="pick-address"]', function () {
      var id = String($(this).data('id'));
      try { localStorage.setItem(TEMP_ADDR_KEY, id); } catch (e) {}
      global.location.href = redirect;
    });
  }

  $(function () {
    UI.initTheme();
    Volta.Layout.mount('me');
    render();
    // 登录态下从数据库拉取当前用户的地址（地址表 ssc_dizhi，按 member_id 隔离）
    if (User.refreshAddresses) User.refreshAddresses();
    // API 异步刷新后重绘（persist → emit → onChange）
    if (User.onChange) User.onChange(function () { render(); });
  });
})(window);
