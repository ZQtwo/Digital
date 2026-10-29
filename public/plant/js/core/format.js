/**
 * format.js —— 全站共用的格式化工具（jQuery 版）
 */
(function (global) {
  function formatPrice(value) {
    var n = Number(value) || 0;
    return n.toLocaleString('zh-CN', { maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
  }
  function formatSales(value) {
    var n = Number(value) || 0;
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return String(n);
  }
  function formatCount(value) {
    var n = Number(value) || 0;
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }
  function discountOf(price, listPrice) {
    if (!listPrice || listPrice <= price) return null;
    return Math.round((1 - price / listPrice) * 100);
  }
  function maskPhone(phone) {
    var s = String(phone || '');
    if (s.length !== 11) return s;
    return s.slice(0, 3) + '****' + s.slice(7);
  }
  function pad(v) { return String(v).padStart(2, '0'); }
  function formatDateTime(ts) {
    // 兼容秒级时间戳（后端 created_at->timestamp 为秒，<1e12 视为秒 ×1000 转毫秒）
    if (typeof ts === 'number' && ts > 0 && ts < 1e12) ts *= 1000;
    var d = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function formatDate(ts) { return formatDateTime(ts).slice(0, 10); }
  function makeOrderNo() {
    var t = String(Date.now()).slice(-8);
    var r = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return 'VT' + t + r;
  }
  function splitRemain(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    return {
      h: String(Math.floor(total / 3600)).padStart(2, '0'),
      m: String(Math.floor((total % 3600) / 60)).padStart(2, '0'),
      s: String(total % 60).padStart(2, '0')
    };
  }
  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function seededRandom(seed) {
    var a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  global.Volta = global.Volta || {};
  global.Volta.Format = {
    formatPrice: formatPrice,
    formatSales: formatSales,
    formatCount: formatCount,
    discountOf: discountOf,
    maskPhone: maskPhone,
    formatDateTime: formatDateTime,
    formatDate: formatDate,
    makeOrderNo: makeOrderNo,
    splitRemain: splitRemain,
    hashString: hashString,
    seededRandom: seededRandom
  };
})(window);
