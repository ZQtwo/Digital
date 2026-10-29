/**
 * store-user.js —— 用户态：模拟登录、收藏、优惠券、订单（jQuery 版）
 * 与 Vue 版字段完全一致：localStorage key = 'volta.user'
 */
(function (global) {
  var Storage = global.Volta.Storage;
  var Format = global.Volta.Format;
  var USER_KEY = 'volta.user';
  var DEFAULT_STATE = { profile: null, favorites: [], orders: [], coupons: [], lastAddress: null };

  var state = Storage.readLS(USER_KEY, DEFAULT_STATE) || JSON.parse(JSON.stringify(DEFAULT_STATE));
  var couponBase = 0;
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function persist() { Storage.writeLS(USER_KEY, state); emit(); }

  function isLogin() { return !!state.profile; }
  function nickname() { return state.profile ? state.profile.nickname : '访客'; }
  function favoriteCount() { return state.favorites.length; }
  function orderCount() { return state.orders.length; }
  function usableCoupons() {
    var now = Date.now();
    return state.coupons.filter(function (c) {
      return !c.used && c.expireAt > now && c.threshold <= couponBase;
    });
  }
  function setCouponBase(amount) { couponBase = Number(amount) || 0; emit(); }

  function login(phone, nicknameInput) {
    state.profile = {
      phone: phone,
      nickname: (nicknameInput || '').trim() || ('VOLTA_' + String(phone).slice(-4)),
      level: '银牌会员',
      joinedAt: Date.now()
    };
    persist();
  }
  function logout() { state.profile = null; persist(); }
  function isFavorite(id) { return state.favorites.indexOf(id) !== -1; }
  function toggleFavorite(id) {
    if (isFavorite(id)) {
      state.favorites = state.favorites.filter(function (x) { return x !== id; });
      persist();
      return false;
    }
    state.favorites = [id].concat(state.favorites);
    persist();
    return true;
  }
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
  function saveAddress(address) { state.lastAddress = Object.assign({}, address); persist(); }
  function createOrder(payload) {
    var id = Format.makeOrderNo();
    state.orders = [Object.assign({ id: id, ts: Date.now(), status: '待付款' }, payload)].concat(state.orders);
    if (payload.couponId) markCouponUsed(payload.couponId);
    persist();
    return id;
  }
  function updateOrder(id, payload) {
    var t = state.orders.find(function (o) { return o.id === id; });
    if (!t) return false;
    Object.assign(t, payload);
    persist();
    return true;
  }
  function getOrder(id) { return state.orders.find(function (o) { return o.id === id; }) || null; }
  function setOrderStatus(id, status) {
    var t = state.orders.find(function (o) { return o.id === id; });
    if (t) { t.status = status; persist(); }
  }
  function rateOrder(id, rating, review, anonymous) {
    var t = state.orders.find(function (o) { return o.id === id; });
    if (!t) return false;
    t.rated = true; t.rating = Number(rating) || 5; t.review = (review || '').trim(); t.anonymous = !!anonymous;
    persist();
    return true;
  }
  function removeOrder(id) {
    state.orders = state.orders.filter(function (o) { return o.id !== id; });
    persist();
  }
  function resetAll() {
    state.profile = null; state.favorites = []; state.orders = []; state.coupons = []; state.lastAddress = null;
    persist();
  }

  global.Volta = global.Volta || {};
  global.Volta.User = {
    get profile() { return state.profile; },
    get favorites() { return state.favorites; },
    get orders() { return state.orders; },
    get coupons() { return state.coupons; },
    get lastAddress() { return state.lastAddress; },
    isLogin: isLogin, nickname: nickname, favoriteCount: favoriteCount, orderCount: orderCount,
    usableCoupons: usableCoupons, setCouponBase: setCouponBase,
    login: login, logout: logout, isFavorite: isFavorite, toggleFavorite: toggleFavorite,
    hasCoupon: hasCoupon, claimCoupon: claimCoupon, markCouponUsed: markCouponUsed,
    saveAddress: saveAddress, createOrder: createOrder, updateOrder: updateOrder,
    getOrder: getOrder, setOrderStatus: setOrderStatus, rateOrder: rateOrder,
    removeOrder: removeOrder, resetAll: resetAll,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
