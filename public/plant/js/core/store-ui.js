/**
 * store-ui.js —— 全局界面状态（jQuery 版）：主题、Toast、筛选抽屉、搜索历史、入场序列
 */
(function (global) {
  var Storage = global.Volta.Storage;
  var THEME_KEY = 'volta.theme';
  var SEARCH_KEY = 'volta.search-history';
  var state = { theme: 'dark', searchHistory: [], entered: false, toasts: [] };
  var toastSeq = 0;
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  function applyTheme(next) {
    state.theme = next;
    document.documentElement.dataset.theme = next;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#08090C' : '#F4F2ED');
    emit();
  }
  function initTheme() {
    var saved = Storage.readLS(THEME_KEY, null);
    applyTheme(saved === 'light' || saved === 'dark' ? saved : 'dark');
    state.searchHistory = Storage.readLS(SEARCH_KEY, []);
    emit();
  }
  function toggleTheme() {
    var next = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Storage.writeLS(THEME_KEY, next);
    toast(next === 'dark' ? '已切换到夜间模式' : '已切换到日间模式');
  }
  function isDark() { return state.theme === 'dark'; }

  function toast(message, type, duration) {
    type = type || 'info'; duration = duration || 2400;
    var id = ++toastSeq;
    state.toasts.push({ id: id, message: message, type: type });
    emit();
    window.setTimeout(function () { dismissToast(id); }, duration);
    return id;
  }
  function dismissToast(id) {
    state.toasts = state.toasts.filter(function (t) { return t.id !== id; });
    emit();
  }

  // 筛选抽屉
  function openFilterDrawer() { state.filterDrawerOpen = true; emit(); }
  function closeFilterDrawer() { state.filterDrawerOpen = false; emit(); }

  // 搜索历史
  function pushSearch(keyword) {
    var kw = String(keyword || '').trim();
    if (!kw) return;
    var next = [kw].concat(state.searchHistory.filter(function (k) { return k !== kw; })).slice(0, 8);
    state.searchHistory = next;
    Storage.writeLS(SEARCH_KEY, next);
    emit();
  }
  function clearSearchHistory() { state.searchHistory = []; Storage.writeLS(SEARCH_KEY, []); emit(); }

  function markEntered() { state.entered = true; emit(); }

  global.Volta = global.Volta || {};
  global.Volta.UI = {
    get theme() { return state.theme; },
    get toasts() { return state.toasts; },
    get searchHistory() { return state.searchHistory; },
    get entered() { return state.entered; },
    get filterDrawerOpen() { return state.filterDrawerOpen; },
    isDark: isDark, initTheme: initTheme, toggleTheme: toggleTheme,
    toast: toast, dismissToast: dismissToast,
    openFilterDrawer: openFilterDrawer, closeFilterDrawer: closeFilterDrawer,
    pushSearch: pushSearch, clearSearchHistory: clearSearchHistory,
    markEntered: markEntered,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);



