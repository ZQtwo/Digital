/**
 * api-client.js —— 统一 API 客户端
 * jQuery $.ajax 封装，所有请求自动带 Accept: application/json
 * 命名空间：Volta.API
 *   Volta.API.Public   —— 无需 token
 *   Volta.API.Member   —— 需要 Bearer token（自动从 localStorage 取）
 * 全局事件：volta:api-error   （{code, message}）
 */
(function (global) {
  global.Volta = global.Volta || {};

  // API 基址：动态适配当前页面 origin
  // 这样不管用户在 localhost:8080 还是 127.0.0.1:8000 都能正确 fetch
  var API_BASE = (window.location.origin || 'http://localhost:8080') + '/shuma';
  var TOKEN_KEY = 'volta.token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  /**
   * 统一请求封装
   * @param {string} path    路径（如 /products）
   * @param {object} options {method, data, params, auth}
   * @returns {Promise}     resolve(data) 或 reject({code, message, raw})
   */
  function request(path, options) {
    options = options || {};
    var url = API_BASE + path;
    var method = (options.method || 'GET').toUpperCase();
    var headers = { 'Accept': 'application/json' };
    if (options.auth !== false && getToken()) {
      headers['Authorization'] = 'Bearer ' + getToken();
    }

    var ajaxOpts = {
      url: url,
      type: method,
      headers: headers,
      dataType: 'json',
      crossDomain: true
    };

    // GET：query 参数
    if (method === 'GET' || method === 'HEAD') {
      if (options.params) {
        ajaxOpts.data = options.params;
      }
    } else {
      // POST/PUT/DELETE：JSON body
      headers['Content-Type'] = 'application/json';
      ajaxOpts.data = options.data ? JSON.stringify(options.data) : '';
      ajaxOpts.contentType = 'application/json';
    }

    return new Promise(function (resolve, reject) {
      $.ajax(ajaxOpts).done(function (resp) {
        // 统一格式 {code:0, message, data}
        if (resp && resp.code === 0) {
          resolve(resp.data);
        } else {
          var err = {
            code: (resp && resp.code) || 500,
            message: (resp && resp.message) || '请求失败',
            raw: resp
          };
          global.dispatchEvent(new CustomEvent('volta:api-error', { detail: err }));
          reject(err);
        }
      }).fail(function (xhr) {
        var parsed = null;
        try { parsed = xhr.responseJSON || JSON.parse(xhr.responseText); } catch (e) {}
        var err = {
          code: (parsed && parsed.code) || xhr.status || 0,
          message: (parsed && parsed.message) || xhr.statusText || '网络错误',
          raw: parsed || xhr.responseText
        };
        // 401 自动清 token
        if (xhr.status === 401) {
          setToken(null);
        }
        global.dispatchEvent(new CustomEvent('volta:api-error', { detail: err }));
        reject(err);
      });
    });
  }

  // ===== 公共 API（无需登录） =====
  var Public = {
    home:      function ()                { return request('/home'); },
    banners:   function (position)        { return request('/banners', { params: { position: position || 'home_top' } }); },
    categories:function ()                { return request('/categories'); },
    brands:    function ()                { return request('/brands'); },
    products:  function (params)          { return request('/products', { params: params || {} }); },
    product:   function (id)              { return request('/products/' + id); },
    reviews:   function (id, params)      { return request('/products/' + id + '/reviews', { params: params || {} }); },

    // 认证
    login:    function (phone, password) { return request('/auth/login', { method: 'POST', data: { phone: phone, password: password }, auth: false }); },
    register: function (name, phone, password) {
      return request('/auth/register', { method: 'POST', data: { name: name, phone: phone, password: password }, auth: false });
    }
  };

  // ===== 会员 API（需要 token） =====
  var Member = {
    // 认证
    me:     function ()           { return request('/auth/me'); },
    logout: function ()           { return request('/auth/logout', { method: 'POST' }); },

    // 个人资料
    updateProfile: function (data) { return request('/profile', { method: 'PUT', data: data }); },
    updatePassword: function (oldPwd, newPwd) {
      return request('/profile/password', { method: 'PUT', data: { oldPassword: oldPwd, newPassword: newPwd } });
    },

    // 收藏
    favorites:    function ()     { return request('/favorites'); },
    favoriteIds:  function ()     { return request('/favorites/ids'); },
    favToggle:    function (productId) { return request('/favorites/toggle', { method: 'POST', data: { productId: productId } }); },

    // 评价
    submitReview: function (data) { return request('/reviews', { method: 'POST', data: data }); },

    // 地址
    addresses:  function ()       { return request('/addresses'); },
    addAddress: function (data)   { return request('/addresses', { method: 'POST', data: data }); },
    updateAddress: function (id, data) { return request('/addresses/' + id, { method: 'PUT', data: data }); },
    removeAddress: function (id)  { return request('/addresses/' + id, { method: 'DELETE' }); },
    setDefaultAddress: function (id) { return request('/addresses/' + id + '/default', { method: 'PUT' }); },

    // 购物车（前缀 cart-api 避开 Blade /cart 路由）
    cart:       function ()        { return request('/cart-api'); },
    cartCount:  function ()        { return request('/cart-api/count'); },
    cartAdd:    function (productId, quantity, specSnapshot) {
      var data = { productId: productId, quantity: quantity || 1 };
      if (specSnapshot) data.specSnapshot = specSnapshot;
      return request('/cart-api', { method: 'POST', data: data });
    },
    cartUpdate: function (id, quantity) {
      return request('/cart-api/' + id, { method: 'PUT', data: { quantity: quantity } });
    },
    cartRemove: function (id)      { return request('/cart-api/' + id, { method: 'DELETE' }); },
    cartClear:  function ()        { return request('/cart-api', { method: 'DELETE' }); },

    // 订单
    orders:  function (params)    { return request('/orders', { params: params || {} }); },
    order:   function (orderNo)   { return request('/orders/' + orderNo); },
    createOrder: function (payload) { return request('/orders', { method: 'POST', data: payload }); },
    payOrder:   function (orderNo, payMethod) { return request('/orders/' + orderNo + '/pay', { method: 'POST', data: { payMethod: payMethod } }); },
    cancelOrder:function (orderNo, reason) {
      return request('/orders/' + orderNo + '/cancel', { method: 'POST', data: reason ? { reason: reason } : {} });
    },
    confirmOrder: function (orderNo) { return request('/orders/' + orderNo + '/confirm', { method: 'POST' }); },
    deleteOrder:  function (orderNo) { return request('/orders/' + orderNo, { method: 'DELETE' }); }
  };

  global.Volta.API = {
    BASE: API_BASE,
    Public: Public,
    Member: Member,
    setToken: setToken,
    getToken: getToken
  };
})(window);
