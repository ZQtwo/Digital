/**
 * store-orders.js —— 后台订单管理（API 版）
 *
 * 数据源：GET /shuma/api/admin/orders (后台 Sanctum token)
 * 状态操作：PUT /shuma/api/admin/orders/{orderNo}/status
 *
 * 订单状态机（code → label）：
 *   pending_pay → pending_ship → shipped → completed
 *   可取消状态：pending_pay / pending_ship / shipped → cancelled
 */
(function (global) {
  var $ = global.jQuery;

  /** 订单状态统一映射（code → { label, tone }） */
  var ORDER_STATUSES = {
    pending_pay: { label: '待付款', tone: 'accent' },
    pending_ship: { label: '待发货', tone: 'accent' },
    shipped: { label: '待收货', tone: 'info' },
    completed: { label: '已完成', tone: 'success' },
    cancelled: { label: '已取消', tone: 'muted' }
  };

  /** 后台 API 基址 */
  function apiBase() {
    return global.location.origin + '/shuma/api/admin';
  }

  /** 取后台 token（多 key fallback + 读 store-admin.js 的 getToken） */
  function adminToken() {
    // 1. 优先读 store-admin.js 暴露的 Volta.Admin.getToken()（最权威）
    if (global.Volta && global.Volta.Admin && typeof global.Volta.Admin.getToken === 'function') {
      var t = global.Volta.Admin.getToken();
      if (t) return String(t);
    }
    // 2. 直接读 localStorage（按优先级链）
    var t = global.localStorage.getItem('volta.admin.token')
      || global.localStorage.getItem('volta.adminToken')
      || global.localStorage.getItem('admin_token')
      || global.localStorage.getItem('volta.admin')
      || '';
    // 3. 如果是 session JSON 对象，尝试解析 token 字段
    if (t && t[0] === '{' && t.indexOf('token') !== -1) {
      try { var obj = JSON.parse(t); if (obj.token) t = obj.token; } catch (e) {}
    }
    return String(t);
  }

  /** 后台 fetch */
  function adminFetch(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    opts.headers['Authorization'] = 'Bearer ' + adminToken();
    opts.headers['Content-Type'] = 'application/json';
    opts.headers['Accept'] = 'application/json';
    return fetch(apiBase() + url, opts).then(function (r) {
      if (r.status === 401) throw new Error('后台登录已失效，请重新登录');
      return r.json();
    });
  }

  /** 从后端订单 → 前端可用格式 */
  function mapOrder(o) {
    return {
      id: o.orderNo,
      orderNo: o.orderNo,
      status: o.status,
      statusLabel: o.statusLabel,
      totalAmount: o.totalAmount,
      payAmount: o.payAmount,
      discountAmount: o.discountAmount || 0,
      freight: o.freight || 0,
      payMethod: o.payMethod,
      receiverName: o.receiverName,
      receiverPhone: o.receiverPhone,
      receiverAddress: o.receiverAddress,
      shipping: {
        address: (o.receiverName || '') + ' ' + (o.receiverPhone || '') + ' ' + (o.receiverAddress || '')
      },
      customer: {
        name: o.receiverName || '',
        phone: o.receiverPhone || ''
      },
      createdAt: o.createdAt,
      ts: new Date(o.createdAt).getTime(),
      items: (o.items || []).map(function (it) {
        return {
          id: it.id,
          productId: it.productId,
          skuCode: it.skuCode,
          name: it.name,
          price: it.price,
          qty: it.quantity,
          quantity: it.quantity,
        };
      })
    };
  }

  /** 全局缓存（避免每次 render 都 fetch） */
  var _cache = { list: [], ts: 0 };
  var CACHE_TTL = 5000; // 5 秒

  /** 拉全量订单（force=true 跳过缓存，轮询用） */
  function fetchAll(force) {
    var now = Date.now();
    if (!force && _cache.list.length && (now - _cache.ts) < CACHE_TTL) {
      return Promise.resolve(_cache.list);
    }
    return adminFetch('/orders?pageSize=100').then(function (d) {
      if (d.code === 0 && d.data && d.data.list) {
        _cache.list = d.data.list.map(mapOrder);
        _cache.ts = now;
        return _cache.list;
      }
      throw new Error(d.message || '拉取订单失败');
    });
  }

  /** 拉统计 */
  function fetchStats() {
    return adminFetch('/stats/orders').then(function (d) {
      if (d.code === 0 && d.data) return d.data;
      throw new Error(d.message || '拉取统计失败');
    });
  }

  /** 全部订单（按时间倒序）——带缓存 */
  function list() {
    return _cache.list.slice().sort(function (a, b) {
      return (b.ts || 0) - (a.ts || 0);
    });
  }

  /** 根据 orderNo 查单 */
  function get(id) {
    return _cache.list.find(function (o) { return o.orderNo === id || o.id === id; }) || null;
  }

  /** 刷新列表（强制） */
  function refresh() {
    _cache.ts = 0;
    return fetchAll();
  }

  /**
   * 修改订单状态（调后台 API）
   * @param {string} orderNo 订单号
   * @param {string} status 新状态 (pending_ship / shipped / completed / cancelled)
   * @returns {Promise<{ok:boolean, message?:string}>}
   */
  function setStatus(orderNo, status, extra) {
    if (!ORDER_STATUSES[status]) return Promise.resolve({ ok: false, message: '未知状态：' + status });

    var payload = { status: status };
    if (extra) { Object.assign(payload, extra); }

    return adminFetch('/orders/' + encodeURIComponent(orderNo) + '/status', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }).then(function (d) {
      if (d.code === 0) {
        _cache.ts = 0; // 让下次 render 重新拉
        return { ok: true };
      }
      return { ok: false, message: d.message || '操作失败' };
    }).catch(function (err) {
      return { ok: false, message: err.message || '网络错误' };
    });
  }

  /** 统计（从缓存算 + 后端拉）——先本地，异步更新 */
  function stats() {
    var arr = list();
    var byStatus = { pending_pay: 0, pending_ship: 0, shipped: 0, completed: 0, cancelled: 0 };
    var totalAmount = 0;
    arr.forEach(function (o) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.status !== 'cancelled') totalAmount += Number(o.totalAmount || 0);
    });
    return {
      total: arr.length,
      byStatus: byStatus,
      pendingCount: (byStatus.pending_pay || 0) + (byStatus.pending_ship || 0),
      shippedCount: byStatus.shipped || 0,
      completedCount: byStatus.completed || 0,
      cancelledCount: byStatus.cancelled || 0,
      totalAmount: totalAmount
    };
  }

  /** 后台启动预拉（等 DOM ready + adminAuth 成功后） */
  global.Volta = global.Volta || {};
  global.Volta.Orders = {
    ORDER_STATUSES: ORDER_STATUSES,
    list: list,
    get: get,
    setStatus: setStatus,
    stats: stats,
    refresh: refresh,
    fetchAll: fetchAll
  };

  // 自动预拉
  $(function () {
    if (adminToken()) fetchAll().catch(function () {});
  });
})(window);
