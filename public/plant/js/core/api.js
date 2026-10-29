/**
 * api.js —— 纯数据层：从 Laravel 后端 fetch 数据
 * 绝对 URL，async/await，不回退 mock
 * API 基址：http://127.0.0.1:8000/shuma
 */
(function (global) {
  global.Volta = global.Volta || {};

  // 动态适配：当前页面所在 origin + /shuma 路由前缀
  // 这样不管用户在 localhost:8080 还是 127.0.0.1:8000 都能正确 fetch
  var API_BASE = (window.location.origin || 'http://localhost:8080') + '/shuma/api';
  var TOKEN_KEY = 'volta.token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  async function request(path, options) {
    options = options || {};
    var url = API_BASE + path;
    var headers = Object.assign(
      { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      options.headers || {}
    );
    var token = getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    var init = {
      method: options.method || 'GET',
      headers: headers,
      credentials: 'omit'
    };
    if (options.body) {
      init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    var res, json;
    try {
      res = await fetch(url, init);
    } catch (e) {
      throw new Error('网络错误：无法连接到 ' + url);
    }
    try {
      json = await res.json();
    } catch (e) {
      throw new Error('服务器返回了非 JSON 数据 (HTTP ' + res.status + ')');
    }

    if (res.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
    }

    return {
      ok: res.ok && json.code === 0,
      code: json.code,
      message: json.message,
      data: json.data,
      status: res.status
    };
  }

  function makePromise(path, options) {
    return request(path, options);
  }

  // === Public（被 store-user.js/bootstrap-data.js 调用） ===
  var Public = {
    home: function () { return makePromise('/home'); },
    products: function (params) {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return makePromise('/products' + qs);
    },
    categories: function () { return makePromise('/categories'); },
    brands: function () { return makePromise('/brands'); },
    // 商品评价列表（公开接口，数据库 ssc_pingjia）
    productReviews: function (productId, params) {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return makePromise('/products/' + encodeURIComponent(productId) + '/reviews' + qs);
    },

    // 可领取的优惠券模板（公开接口，数据库 ssc_youhuiquan_moban）
    couponTemplates: function () { return makePromise('/coupons/templates'); },

    // store-user.js 调：login(phone, password) → resolve 直接给 {token, member}
    login: function (phone, password) {
      return request('/auth/login', {
        method: 'POST',
        body: { phone: phone, password: password }
      }).then(function (res) {
        if (res.ok) return res.data; // {token, member}
        var err = new Error(res.message || '登录失败');
        err.code = res.code;
        throw err;
      }).catch(function (err) {
        // 把 request 抛的也统一 message
        if (!err.message) err.message = '网络错误';
        throw err;
      });
    },

    // store-user.js 调：register(name, phone, password) → resolve 直接给 {token, member}
    register: function (name, phone, password) {
      return request('/auth/register', {
        method: 'POST',
        body: { name: name, phone: phone, password: password }
      }).then(function (res) {
        if (res.ok) return res.data;
        var err = new Error(res.message || '注册失败');
        err.code = res.code;
        throw err;
      }).catch(function (err) {
        if (!err.message) err.message = '网络错误';
        throw err;
      });
    },
  };

  // === Auth ===
  var Auth = {
    register: function (body) { return makePromise('/auth/register', { method: 'POST', body: body }); },
    login: function (body) { return makePromise('/auth/login', { method: 'POST', body: body }); },
    me: function () { return makePromise('/auth/me'); },
    logout: function () { return makePromise('/auth/logout', { method: 'POST' }); },
    setToken: function (t) {
      if (t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (_) {} }
      else { try { localStorage.removeItem(TOKEN_KEY); } catch (_) {} }
    },
    getToken: getToken,
  };

  // === Member — 全部自动解包到 .data（store-user.js/store-cart.js 期望拿到后端原始 data） ===
  // helper: 调 request → 成功返回 res.data，失败 throw Error
  function memberReq(path, options) {
    return request(path, options).then(function (res) {
      if (res.ok) return res.data;
      var err = new Error(res.message || '请求失败');
      err.code = res.code;
      throw err;
    });
  }

  var Member = {
    // 用户信息
    me: function () { return memberReq('/auth/me'); },
    logout: function () { return memberReq('/auth/logout', { method: 'POST' }); },

    // 购物车
    cart: function () { return memberReq('/cart-api'); },
    cartAdd: function (productDbId, qty, specSnapshot) {
      return memberReq('/cart-api', { method: 'POST', body: { productId: productDbId, quantity: qty, specSnapshot: specSnapshot } });
    },
    cartRemove: function (cartItemId) {
      return memberReq('/cart-api/' + cartItemId, { method: 'DELETE' });
    },
    cartUpdate: function (cartItemId, qty) {
      return memberReq('/cart-api/' + cartItemId, { method: 'PUT', body: { quantity: qty } });
    },
    cartClear: function () { return memberReq('/cart-api', { method: 'DELETE' }); },
    cartCount: function () { return memberReq('/cart-api/count'); },

    // 地址
    addresses: function () { return memberReq('/addresses'); },
    addAddress: function (body) { return memberReq('/addresses', { method: 'POST', body: body }); },
    updateAddress: function (id, body) { return memberReq('/addresses/' + id, { method: 'PUT', body: body }); },
    removeAddress: function (id) { return memberReq('/addresses/' + id, { method: 'DELETE' }); },
    setDefaultAddress: function (id) { return memberReq('/addresses/' + id + '/default', { method: 'PUT' }); },

    // 收藏
    favorites: function () { return memberReq('/favorites'); },
    favoriteIds: function () { return memberReq('/favorites/ids'); },
    toggleFavorite: function (body) { return memberReq('/favorites/toggle', { method: 'POST', body: body }); },
    favToggle: function (dbId) {
      return memberReq('/favorites/toggle', { method: 'POST', body: { product_id: dbId } });
    },

    // 订单
    orders: function (params) {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return memberReq('/orders' + qs);
    },
    createOrder: function (body) { return memberReq('/orders', { method: 'POST', body: body }); },
    updateOrder: function (orderNo, body) {
      return memberReq('/orders/' + encodeURIComponent(orderNo), { method: 'PUT', body: body });
    },
    showOrder: function (orderNo) { return memberReq('/orders/' + encodeURIComponent(orderNo)); },
    payOrder: function (orderNo, payMethod) {
      return memberReq('/orders/' + orderNo + '/pay', { method: 'POST', body: { payMethod: payMethod || 'wechat' } });
    },
    cancelOrder: function (orderNo, reason) {
      return memberReq('/orders/' + orderNo + '/cancel', { method: 'POST', body: { reason: reason || '' } });
    },
    deleteOrder: function (orderNo) {
      return memberReq('/orders/' + orderNo, { method: 'DELETE' });
    },
    confirmOrder: function (orderNo) { return memberReq('/orders/' + orderNo + '/confirm', { method: 'POST' }); },

    // 提交评价（写数据库评价表 ssc_pingjia）
    submitReview: function (body) {
      return memberReq('/reviews', { method: 'POST', body: body });
    },
  };

  global.Volta.API = {
    BASE: API_BASE,
    request: request,
    getToken: getToken,
    setToken: Auth.setToken,
    Public: Public,
    Auth: Auth,
    Member: Member,
  };
})(window);
