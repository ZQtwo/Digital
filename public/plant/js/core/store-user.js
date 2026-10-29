/**
 * store-user.js —— 用户态：登录/收藏/地址/订单
 * API 优先 + localStorage fallback
 * localStorage key = 'volta.user'
 * token key = 'volta.token'（由 api-client.js 管理）
 */
(function (global) {
  var Storage = global.Volta.Storage;
  var Format = global.Volta.Format;
  var API = global.Volta.API;
  var Data = global.Volta.Data;

  var USER_KEY = 'volta.user';
  var DEFAULT_STATE = {
    profile: null, favorites: [], orders: [], coupons: [], lastAddress: null,
    addresses: [
      { id: 'addr_1', receiverName: '张三', phone: '138****1234', province: '北京市', city: '北京市', district: '朝阳区', region: '北京市 朝阳区', detail: '建国路88号SOHO现代城A座1201室', isDefault: true },
      { id: 'addr_2', receiverName: '张三', phone: '138****1234', province: '上海市', city: '上海市', district: '浦东新区', region: '上海市 浦东新区', detail: '陆家嘴环路1000号恒生银行大厦25F', isDefault: false }
    ],
    settings: {
      push: true, sms: true, email: false, privacy: true, history: true, theme: 'auto'
    },
    security: {
      loginPassword: null, payPassword: null, boundPhone: null,
      verified: { name: '', idCard: '' },
      authorizations: [
        { id: 'auth_volta_wx', appName: 'VOLTA 微信小程序', scope: '头像、昵称、公开信息', grantedAt: Date.now() - 86400000 * 30 },
        { id: 'auth_volta_alipay', appName: 'VOLTA 支付宝生活号', scope: '头像、昵称', grantedAt: Date.now() - 86400000 * 15 }
      ]
    }
  };

  var state = Storage.readLS(USER_KEY, null) || JSON.parse(JSON.stringify(DEFAULT_STATE));
  // 兼容老版本数据：补上新增字段
  if (!state.addresses) state.addresses = JSON.parse(JSON.stringify(DEFAULT_STATE.addresses));
  if (!state.settings) state.settings = JSON.parse(JSON.stringify(DEFAULT_STATE.settings));
  if (!state.security) state.security = JSON.parse(JSON.stringify(DEFAULT_STATE.security));
  if (!state.security.verified) state.security.verified = { name: '', idCard: '' };
  if (!state.security.authorizations) state.security.authorizations = JSON.parse(JSON.stringify(DEFAULT_STATE.security.authorizations));
  if (!Storage.readLS(USER_KEY, null) || !Storage.readLS(USER_KEY, null).addresses || !Storage.readLS(USER_KEY, null).settings || !Storage.readLS(USER_KEY, null).security) {
    Storage.writeLS(USER_KEY, state);
  }
  var couponBase = 0;
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function persist() { Storage.writeLS(USER_KEY, state); emit(); }

  // ===== 判断是否登录 =====
  // 优先 token，fallback profile 存在
  function isLogin() {
    if (API && API.getToken && API.getToken()) return true;
    return !!state.profile;
  }

  // ===== skuCode → DB productId 辅助 =====
  function toDbProductId(skuCode) {
    if (Data && typeof Data.getDbProductId === 'function') {
      var id = Data.getDbProductId(skuCode);
      if (id !== null && id !== undefined) return id;
    }
    // 兜底：直接从 products 找
    if (Data && Data.products) {
      var p = Data.products.find(function (x) { return x.id === skuCode; });
      if (p && p.dbId) return p.dbId;
    }
    return null;
  }

  function nickname() {
    return state.profile ? state.profile.name : '访客';
  }
  function favoriteCount() { return state.favorites.length; }
  function orderCount() { return state.orders.length; }
  function usableCoupons() {
    var now = Date.now();
    return state.coupons.filter(function (c) {
      return !c.used && c.expireAt > now && c.threshold <= couponBase;
    });
  }
  function setCouponBase(amount) { couponBase = Number(amount) || 0; emit(); }

  /* ======================== 登录 / 注册 / 退出 ======================== */

  /**
   * 登录：只走后端 API，数据库不存在则拒绝
   */
  function login(phone, password) {
    return new Promise(function (resolve) {
      if (!API || !API.Public) {
        resolve({ ok: false, error: '登录服务暂不可用，请刷新页面重试' });
        return;
      }
      API.Public.login(phone, password).then(function (data) {
        API.setToken(data.token);
        state.profile = {
          id: data.member.id,
          phone: data.member.phone,
          name: data.member.name,
          level: data.member.level || '普通会员',
          levelCode: data.member.levelCode,
          totalSpent: data.member.totalSpent,
          orderCount: data.member.orderCount,
          balance: data.member.balance,
          points: data.member.points,
          joinedAt: data.member.createdAt
        };
        persist();
        syncAfterLogin().then(function () {
          resolve({ ok: true, member: data.member });
        });
      }).catch(function (err) {
        var msg = (err && err.message) || '登录失败';
        if (err && err.code === 401) msg = '手机号或密码错误';
        if (err && err.code === 403) msg = '账号已被限制登录，请联系客服';
        resolve({ ok: false, error: msg });
      });
    });
  }

  function register(name, phone, password) {
    return new Promise(function (resolve) {
      if (!API || !API.Public) {
        resolve({ ok: false, error: '注册服务暂不可用，请刷新页面重试' });
        return;
      }
      API.Public.register(name, phone, password).then(function (data) {
        API.setToken(data.token);
        state.profile = {
          id: data.member.id, phone: data.member.phone, name: data.member.name,
          level: data.member.level || '普通会员',
          joinedAt: data.member.createdAt
        };
        persist();
        syncAfterLogin().then(function () {
          resolve({ ok: true, member: data.member });
        });
      }).catch(function (err) {
        var msg = (err && err.message) || '注册失败';
        resolve({ ok: false, error: msg });
      });
    });
  }

  function logout() {
    if (API && API.Member && API.getToken()) {
      API.Member.logout().catch(function () {}); // 即使失败也本地退出
    }
    API && API.setToken(null);
    state.profile = null;
    state.favorites = [];
    state.orders = [];
    persist();
    // 只清前端购物车状态（让角标消失），**不动后端数据库**（用户再登录能看到之前加的商品）
    if (global.Volta.Cart && typeof global.Volta.Cart.resetFrontend === 'function') {
      global.Volta.Cart.resetFrontend();
    }
  }

  /** 登录后批量同步：会员信息 + 收藏 + 地址 + 购物车
   *  返回 Promise.all（所有请求 settle 后 resolve），让调用方可以 await 再跳转，
   *  避免浏览器 location.href 跳转导致在飞 fetch 被 ERR_ABORTED。
   */
  function syncAfterLogin() {
    if (!API || !API.Member) return Promise.resolve();

    var jobs = [];

    jobs.push(API.Member.me().then(function (data) {
      if (state.profile && data.member) {
        state.profile.name = data.member.name;
        state.profile.phone = data.member.phone;
        state.profile.level = data.member.level || state.profile.level;
        state.profile.totalSpent = data.member.totalSpent;
        state.profile.orderCount = data.member.orderCount;
        state.profile.balance = data.member.balance;
        state.profile.points = data.member.points;
      }
      state._stats = data.stats;
      persist();
    }).catch(function () {}));

    jobs.push(API.Member.favoriteIds().then(function (data) {
      state.favorites = (data && data.ids) ? data.ids.map(function (id) {
        if (Data && typeof Data.getSkuByDbId === 'function') {
          var sku = Data.getSkuByDbId(id);
          if (sku) return sku;
        }
        return String(id);
      }) : [];
      persist();
    }).catch(function () {}));

    jobs.push(API.Member.addresses().then(function (data) {
      state.addresses = (data && data.list) ? data.list : [];
      persist();
    }).catch(function () {}));

    jobs.push(API.Member.orders({ pageSize: 20 }).then(function (data) {
      state.orders = (data && data.list) ? data.list : [];
      persist();
    }).catch(function () {}));

    if (global.Volta.Cart && typeof global.Volta.Cart.syncFromApi === 'function') {
      jobs.push(global.Volta.Cart.syncFromApi().catch(function () {}));
    }

    // 用 allSettled（如果没 allSettled 就用 all）
    if (Promise.allSettled) return Promise.allSettled(jobs);
    return Promise.all(jobs).catch(function () {});
  }

  /* ======================== 收藏 ======================== */

  function isFavorite(id) { return state.favorites.indexOf(id) !== -1; }

  function toggleFavorite(id) {
    var localResult = isFavorite(id); // 取反前状态
    // 乐观更新
    var newVal;
    if (localResult) {
      state.favorites = state.favorites.filter(function (x) { return x !== id; });
      newVal = false;
    } else {
      state.favorites = [id].concat(state.favorites);
      newVal = true;
    }
    persist();

    // 如果有 token，同步到后端
    if (API && API.Member && API.getToken()) {
      var dbId = toDbProductId(id);
      if (dbId) {
        API.Member.favToggle(dbId).then(function (data) {
          // 后端幂等返回最终状态
          // 刷新 favorites ids
          API.Member.favoriteIds().then(function (idsData) {
            state.favorites = (idsData && idsData.ids) ? idsData.ids.map(function (dbid) {
              if (Data && typeof Data.getSkuByDbId === 'function') {
                return Data.getSkuByDbId(dbid) || String(dbid);
              }
              return String(dbid);
            }) : [];
            persist();
          }).catch(function () {});
        }).catch(function () {});
      }
    }

    return newVal;
  }

  /* ======================== 优惠券（纯前端，后端暂无） ======================== */

  function hasCoupon(templateId) {
    var now = Date.now();
    return state.coupons.some(function (c) { return c.id === templateId && !c.used && c.expireAt > now; });
  }
  function claimCoupon(template) {
    if (hasCoupon(template.id)) return false;
    var now = Date.now();
    state.coupons = [{
      id: template.id, title: template.title, amount: template.amount,
      threshold: template.threshold, scope: template.scope, desc: template.desc,
      claimedAt: now, expireAt: now + template.days * 86400000, used: false
    }].concat(state.coupons);
    persist();
    return true;
  }
  function markCouponUsed(couponId) {
    var t = state.coupons.find(function (c) { return c.id === couponId; });
    if (t) { t.used = true; persist(); }
  }

  /* ======================== 地址簿 CRUD ======================== */

  function listAddresses() { return state.addresses.slice(); }
  function getDefaultAddress() { return state.addresses.find(function (a) { return a.isDefault; }) || state.addresses[0] || null; }
  function getAddress(id) { return state.addresses.find(function (a) { return String(a.id) === String(id); }) || null; }

  function _addrApiReady() { return API && API.Member && API.getToken(); }

  function addAddress(addr) {
    // 前端字段 → 后端字段
    var payload = {
      receiverName: addr.receiverName || addr.name,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail: addr.detail,
      isDefault: !!addr.isDefault
    };

    if (_addrApiReady()) {
      // 数据库模式：POST 成功后从后端刷新列表；失败抛错（页面 toast 提示），不写本地脏数据
      return API.Member.addAddress(payload).then(function (data) {
        refreshAddressesFromApi();
        return data && data.id;
      });
    }
    return Promise.resolve(_addAddressLocal(payload));
  }

  function _addAddressLocal(payload) {
    var id = 'addr_' + Date.now();
    var region = [payload.province, payload.city, payload.district].filter(Boolean).join(' ');
    var newAddr = Object.assign({ id: id, region: region, isDefault: state.addresses.length === 0 }, payload);
    if (newAddr.isDefault) {
      state.addresses.forEach(function (a) { a.isDefault = false; });
    }
    state.addresses = state.addresses.concat([newAddr]);
    persist();
    return id;
  }

  function updateAddress(id, patch) {
    var addr = getAddress(id);
    if (!addr) return false;
    Object.assign(addr, patch);

    // 前端 → 后端字段映射
    var apiPatch = {};
    if (patch.receiverName !== undefined || patch.name !== undefined) apiPatch.receiverName = patch.receiverName || patch.name || addr.receiverName;
    if (patch.phone !== undefined) apiPatch.phone = patch.phone;
    if (patch.province !== undefined) apiPatch.province = patch.province;
    if (patch.city !== undefined) apiPatch.city = patch.city;
    if (patch.district !== undefined) apiPatch.district = patch.district;
    if (patch.detail !== undefined) apiPatch.detail = patch.detail;
    if (patch.isDefault === true) apiPatch.isDefault = true;

    if (patch.isDefault) {
      state.addresses.forEach(function (a) { if (String(a.id) !== String(id)) a.isDefault = false; });
    }
    persist();

    if (_addrApiReady()) {
      var realId = addr.id;
      // 如果 addr.id 是 'addr_xxx' 形式（本地生成），需要先拿到 API 的整数 id
      var numericId = parseInt(realId, 10);
      if (!isNaN(numericId) && String(numericId) === String(realId)) {
        API.Member.updateAddress(numericId, apiPatch).then(function () {
          if (apiPatch.isDefault) refreshAddressesFromApi();
        }).catch(function () {});
      } else {
        refreshAddressesFromApi();
      }
    }
    return true;
  }

  function removeAddress(id) {
    var addr = getAddress(id);
    if (!addr) return false;
    var wasDefault = addr.isDefault;
    var realId = addr.id;
    state.addresses = state.addresses.filter(function (a) { return String(a.id) !== String(id); });
    if (wasDefault && state.addresses.length > 0) {
      state.addresses[0].isDefault = true;
    }
    persist();

    if (_addrApiReady()) {
      var numericId = parseInt(realId, 10);
      if (!isNaN(numericId) && String(numericId) === String(realId)) {
        API.Member.removeAddress(numericId).then(function () {
          refreshAddressesFromApi();
        }).catch(function () {});
      } else {
        refreshAddressesFromApi();
      }
    }
    return true;
  }

  function setDefaultAddress(id) {
    state.addresses.forEach(function (a) { a.isDefault = (String(a.id) === String(id)); });
    persist();

    if (_addrApiReady()) {
      var addr = getAddress(id);
      if (addr) {
        var numericId = parseInt(addr.id, 10);
        if (!isNaN(numericId) && String(numericId) === String(addr.id)) {
          API.Member.setDefaultAddress(numericId).then(function () {
            refreshAddressesFromApi();
          }).catch(function () {});
        } else {
          refreshAddressesFromApi();
        }
      }
    }
  }

  function refreshAddressesFromApi() {
    if (!_addrApiReady()) return Promise.resolve();
    // 返回 Promise：checkout 等页面需要等地址簿加载完再初始化选中地址
    return API.Member.addresses().then(function (data) {
      // 空列表也赋值：删光最后一个地址后 UI 才能同步清空
      // 映射后端字段 → 前端统一字段（卡片用 name/region，编辑表单同源）
      state.addresses = ((data && data.list) || []).map(function (r) {
        return {
          id: r.id,
          name: r.name || r.receiverName || '',
          phone: r.phone || '',
          region: r.region || r.fullRegion || [r.province, r.city, r.district].filter(Boolean).join(' '),
          province: r.province || '',
          city: r.city || '',
          district: r.district || '',
          detail: r.detail || '',
          isDefault: !!r.isDefault
        };
      });
      persist();
    }).catch(function () {});
  }

  /* ======================== 订单 ======================== */

  function createOrder(payload) {
    // payload: { items: [{skuCode, quantity, options}], addressId, couponId, remark, payMethod }
    return new Promise(function (resolve) {
      var localOrderId = Format.makeOrderNo();

      // 构造本地草稿（先算好字段）
      var localItems = (payload.items || []).map(function (it) {
        var p = Data.getProduct(it.skuCode || it.productId);
        return {
          productId: it.skuCode || it.productId,
          name: p ? p.name : '',
          price: p ? p.price : 0,
          quantity: it.quantity,
          subtotal: (p ? p.price : 0) * it.quantity,
          options: it.options || []
        };
      });
      var totalAmount = localItems.reduce(function (s, it) { return s + it.subtotal; }, 0);
      var couponId = payload.couponId || null;
      var couponAmount = 0;
      var coupon = couponId ? state.coupons.find(function (c) { return c.id === couponId && !c.used; }) : null;
      if (coupon) couponAmount = coupon.amount;
      var freight = totalAmount >= 299 ? 0 : 12;
      var payAmount = Math.max(0, totalAmount - couponAmount) + freight;

      // 加入本地 pending 订单（先加进去让 UI 能显示）
      var localOrder = {
        orderNo: localOrderId,
        ts: Date.now(),
        status: 'pending_pay',
        statusLabel: '待付款',
        totalAmount: totalAmount,
        discountAmount: couponAmount,
        freight: freight,
        payAmount: payAmount,
        payMethod: payload.payMethod || 'wechat',
        itemCount: localItems.reduce(function (s, it) { return s + it.quantity; }, 0),
        items: localItems,
        receiverName: '', receiverPhone: '', receiverAddress: '',
        remark: payload.remark || null
      };
      state.orders = [localOrder].concat(state.orders);
      persist();

      // 后端 payload 转换：直接传 skuCode（后端已支持 skuCode → DB id 转换）
      var apiItems = localItems.map(function (it) {
        return {
          productId: it.productId, // 前端的 skuCode 或 DB id，后端自动识别
          skuCode: it.productId,    // 同时传 skuCode，后端双保险
          quantity: it.quantity,
          options: it.options || []
        };
      });

      // addressId 处理：前端存的可能是 'addr_xxx'（本地）也可能是整数
      var addrId = payload.addressId;
      var addrNumId = parseInt(addrId, 10);
      var realAddrId;
      if (!isNaN(addrNumId) && String(addrNumId) === String(addrId)) {
        realAddrId = addrNumId;
      } else {
        // 本地生成的 addr_xxx，用默认地址
        var def = getDefaultAddress();
        realAddrId = def ? def.id : addrId;
        var realAddrNumId = parseInt(realAddrId, 10);
        if (!isNaN(realAddrNumId) && String(realAddrNumId) === String(realAddrId)) {
          realAddrId = realAddrNumId;
        }
      }

      if (API && API.Member && API.getToken()) {
        API.Member.createOrder({
          items: apiItems,
          addressId: realAddrId,
          couponId: coupon ? parseInt(couponId, 10) : null,
          remark: payload.remark || null,
          payMethod: payload.payMethod || 'wechat'
        }).then(function (data) {
          // 后端返回 { orderNo, payAmount }
          var idx = state.orders.findIndex(function (o) { return o.orderNo === localOrderId; });
          if (idx !== -1) {
            state.orders[idx].orderNo = data.orderNo;
            state.orders[idx].payAmount = data.payAmount;
            state.orders[idx].statusLabel = '待付款';
          }
          if (coupon) markCouponUsed(couponId);
          persist();
          // 关键：等真实订单数据（完整地址快照+完整商品+正确 statusLabel）拉回本地后再 resolve，
          // 否则 confirm 页本地命中空地址草稿，收货信息显示为空
          return refreshOrdersFromApi().then(function () {
            resolve({ ok: true, orderNo: data.orderNo, payAmount: data.payAmount, mode: 'api' });
          });
        }).catch(function (err) {
          // API 失败但本地订单已创建，降级为纯本地（补齐 statusLabel 防止按钮不显示）
          if (idx !== -1) state.orders[idx].statusLabel = '待付款';
          persist();
          resolve({ ok: true, orderNo: localOrderId, payAmount: payAmount, mode: 'local_fallback', error: err && err.message });
        });
      } else {
        if (coupon) markCouponUsed(couponId);
        // 本地也补齐 statusLabel + 地址（从用户已选地址取）
        var defAddr = getDefaultAddress();
        localOrder.statusLabel = '待付款';
        if (defAddr) {
          localOrder.receiverName = defAddr.name;
          localOrder.receiverPhone = defAddr.phone;
          localOrder.receiverAddress = (defAddr.region || '') + ' ' + (defAddr.detail || '');
        }
        resolve({ ok: true, orderNo: localOrderId, payAmount: payAmount, mode: 'local' });
      }
    });
  }

  function updateOrder(id, payload) {
    var t = state.orders.find(function (o) { return o.orderNo === id || o.id === id; });
    if (t) {
      Object.assign(t, payload);
    } else {
      // 找不到 → 直接 push（防止确认页从后端拉到数据后找不到缓存项）
      var newOrder = Object.assign({ id: id, orderNo: id, items: [], status: 'pending_pay', statusLabel: '待付款' }, payload);
      state.orders.unshift(newOrder);
    }
    persist();
    return true;
  }

  function getOrder(id) {
    return state.orders.find(function (o) { return o.orderNo === id || o.id === id; }) || null;
  }

  function setOrderStatus(id, status) {
    var t = state.orders.find(function (o) { return o.orderNo === id || o.id === id; });
    if (t) { t.status = status; persist(); }
  }

  function payOrder(id, payMethod) {
    var t = getOrder(id);
    if (!t) return Promise.resolve({ ok: false });

    if (API && API.Member && API.getToken()) {
      return new Promise(function (resolve) {
        API.Member.payOrder(id, payMethod || 'wechat').then(function () {
          t.status = 'pending_ship';
          t.statusLabel = '待发货';
          t.payMethod = payMethod || 'wechat';
          persist();
          resolve({ ok: true, mode: 'api' });
        }).catch(function (err) {
          // API 失败，本地 fallback
          t.status = 'pending_ship';
          t.statusLabel = '待发货';
          t.payMethod = payMethod || 'wechat';
          persist();
          resolve({ ok: true, mode: 'local_fallback' });
        });
      });
    }
    t.status = 'pending_ship';
    t.statusLabel = '待发货';
    t.payMethod = payMethod || 'wechat';
    persist();
    return Promise.resolve({ ok: true, mode: 'local' });
  }

  function cancelOrder(id, reason) {
    var t = getOrder(id);
    if (!t) return false;
    var oldStatus = t.status;
    t.status = 'cancelled';
    t.statusLabel = '已取消';
    persist();

    if (API && API.Member && API.getToken()) {
      API.Member.cancelOrder(id, reason).then(function () {
        refreshOrdersFromApi();
      }).catch(function () {
        t.status = oldStatus; // 撤销
        persist();
      });
    }
    return true;
  }

  function rateOrder(id, rating, review, anonymous) {
    var t = getOrder(id);
    if (!t) return Promise.reject(new Error('订单不存在'));

    // 无 token（本地 mock 订单）：保持旧行为只写本地
    if (!API || !API.Member || !API.getToken()) {
      t.rated = true; t.rating = Number(rating) || 5; t.review = (review || '').trim(); t.anonymous = !!anonymous;
      persist();
      return Promise.resolve({ local: true });
    }

    // 已登录：写数据库评价表（ssc_pingjia），订单里每个未评价明细各提交一条
    var orderNo = t.orderNo || t.id;
    var items = (t.items || []).filter(function (it) { return !it.commentId; });
    if (!items.length) return Promise.reject(new Error('该商品已评价过'));

    var seq = Promise.resolve();
    items.forEach(function (it) {
      seq = seq.then(function () {
        return API.Member.submitReview({
          orderNo: orderNo,
          orderItemId: it.id,
          rating: Number(rating) || 5,
          content: (review || '').trim(),
          anonymous: !!anonymous
        });
      });
    });

    return seq.then(function () {
      // 本地同步一份（数据库以 refreshOrdersFromApi 拉回的为准）
      t.rated = true; t.rating = Number(rating) || 5; t.review = (review || '').trim(); t.anonymous = !!anonymous;
      persist();
      return refreshOrdersFromApi().then(function () { return { local: false }; });
    });
  }

  function removeOrder(id) {
    state.orders = state.orders.filter(function (o) { return o.orderNo !== id && o.id !== id; });
    persist();

    if (API && API.Member && API.getToken()) {
      API.Member.deleteOrder(id).then(function () {
        refreshOrdersFromApi();
      }).catch(function () {});
    }
  }

  function refreshOrdersFromApi() {
    if (!API || !API.Member || !API.getToken()) return Promise.resolve();
    return API.Member.orders({ pageSize: 50 }).then(function (data) {
      if (data && data.list) {
        // 后端返回 {status, statusLabel, orderNo, ...}，前端期望 status=中文标签, id=orderNo
        state.orders = data.list.map(function (o) {
          // 评价绑定：comment_id 来自数据库评价表 ssc_pingjia
          var items = (o.items || []).map(function (it) {
            return {
              id: it.id,
              productId: it.productId,
              skuCode: it.skuCode,
              name: it.name,
              price: it.price,
              qty: it.quantity,
              quantity: it.quantity,
              options: it.options || {},
              art: it.art,
              artSeed: it.artSeed,
              commentId: it.commentId || null,
              rated: !!it.commentId,
              rating: it.commentRating || null,
              review: it.commentContent || null,
              anonymous: !!it.commentAnonymous
            };
          });
          // 订单级评价状态：所有明细都有 commentId 才算已评价；评分/内容取第一条已评价明细回显
          var ratedItem = null;
          for (var i = 0; i < items.length; i++) {
            if (items[i].commentId) { ratedItem = items[i]; break; }
          }
          return {
            id: o.orderNo,
            orderNo: o.orderNo,
            ts: o.ts,
            status: o.statusLabel || o.status,  // 前端按钮条件用中文标签
            statusLabel: o.statusLabel,
            total: o.payAmount,
            subtotal: (o.totalAmount || 0),
            totalAmount: o.totalAmount,
            payAmount: o.payAmount,
            discount: (o.discountAmount || 0),
            discountAmount: o.discountAmount,
            shipping: (o.freight || 0),
            freight: o.freight,
            payMethod: o.payMethodLabel || o.payMethod,
            address: {
              name: o.receiverName || '',
              phone: o.receiverPhone || '',
              region: '',
              detail: o.receiverAddress || '',
            },
            receiverName: o.receiverName,
            receiverPhone: o.receiverPhone,
            receiverAddress: o.receiverAddress,
            items: items,
            rated: items.length > 0 && items.every(function (it) { return it.commentId; }),
            rating: ratedItem ? ratedItem.rating : null,
            review: ratedItem ? ratedItem.review : null,
            anonymous: ratedItem ? ratedItem.anonymous : false
          };
        });
        persist();
      }
    }).catch(function () {});
  }

  function saveAddress(address) { state.lastAddress = Object.assign({}, address); persist(); }

  function resetAll() {
    API && API.setToken(null);
    state.profile = null; state.favorites = []; state.orders = []; state.coupons = []; state.lastAddress = null;
    state.addresses = JSON.parse(JSON.stringify(DEFAULT_STATE.addresses));
    state.settings = JSON.parse(JSON.stringify(DEFAULT_STATE.settings));
    persist();
  }

  /* ======================== 设置 ======================== */
  function getSettings() { return Object.assign({}, state.settings); }
  function updateSetting(key, value) {
    if (key in state.settings) { state.settings[key] = value; persist(); }
  }
  function updateSettings(patch) {
    Object.keys(patch).forEach(function (k) { if (k in state.settings) state.settings[k] = patch[k]; });
    persist();
  }

  /* ======================== 安全 ======================== */
  function getSecurity() {
    var s = state.security;
    return {
      loginPasswordSet: !!s.loginPassword,
      payPasswordSet: !!s.payPassword,
      boundPhone: s.boundPhone || (state.profile ? state.profile.phone : null),
      verified: !!s.verified && !!s.verified.name && !!s.verified.idCard,
      verifiedName: s.verified ? s.verified.name : '',
      authorizations: s.authorizations.slice()
    };
  }
  function setLoginPassword(pwd) {
    if (pwd && API && API.Member && API.getToken()) {
      // 有后端 → 更新密码需要旧密码，这里前端只做标记
    }
    state.security.loginPassword = pwd ? '_set_' + Date.now() : null;
    persist();
  }
  function setPayPassword(pwd) {
    state.security.payPassword = pwd ? '_set_' + Date.now() : null;
    persist();
  }
  function setBoundPhone(phone) { state.security.boundPhone = phone || null; persist(); }
  function setVerified(name, idCard) {
    state.security.verified = { name: (name || '').trim(), idCard: (idCard || '').trim() };
    persist();
  }
  function revokeAuth(id) {
    state.security.authorizations = state.security.authorizations.filter(function (a) { return a.id !== id; });
    persist();
  }
  function deactivateAccount() {
    resetAll();
    Storage.removeLS(USER_KEY);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    Storage.writeLS(USER_KEY, state);
  }

  global.Volta = global.Volta || {};
  global.Volta.User = {
    get profile() { return state.profile; },
    get favorites() { return state.favorites; },
    get orders() { return state.orders; },
    get coupons() { return state.coupons; },
    get lastAddress() { return state.lastAddress; },
    get addresses() { return state.addresses; },
    isLogin: isLogin, nickname: nickname, favoriteCount: favoriteCount, orderCount: orderCount,
    usableCoupons: usableCoupons, setCouponBase: setCouponBase,
    login: login, register: register, logout: logout,
    isFavorite: isFavorite, toggleFavorite: toggleFavorite,
    hasCoupon: hasCoupon, claimCoupon: claimCoupon, markCouponUsed: markCouponUsed,
    saveAddress: saveAddress, createOrder: createOrder, updateOrder: updateOrder,
    getOrder: getOrder, setOrderStatus: setOrderStatus, payOrder: payOrder,
    cancelOrder: cancelOrder, rateOrder: rateOrder, removeOrder: removeOrder,
    refreshOrders: refreshOrdersFromApi,
    refreshAddresses: refreshAddressesFromApi,
    resetAll: resetAll,
    listAddresses: listAddresses, getDefaultAddress: getDefaultAddress, getAddress: getAddress,
    addAddress: addAddress, updateAddress: updateAddress, removeAddress: removeAddress, setDefaultAddress: setDefaultAddress,
    getSettings: getSettings, updateSetting: updateSetting, updateSettings: updateSettings,
    getSecurity: getSecurity, setLoginPassword: setLoginPassword, setPayPassword: setPayPassword,
    setBoundPhone: setBoundPhone, setVerified: setVerified, revokeAuth: revokeAuth,
    deactivateAccount: deactivateAccount,
    onChange: function (fn) { listeners.push(fn); }
  };

  // 页面加载时：如果有 token，自动静默同步
  global.addEventListener('DOMContentLoaded', function () {
    if (API && API.getToken()) {
      syncAfterLogin();
    }
  });
})(window);
