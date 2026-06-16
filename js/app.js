/* ========== App (ES5) ========== */

var App = {};

App.init = function() {
  // Data.boot 会先加载 localStorage 数据（即时），再后台拉 GitHub（异步）
  // 这样页面永远不会空白
  Data.boot(function() {
    Themes.init();
    Sidebar.updateUser();
    Settings.restoreBgPhoto();
    Settings.restoreCardOpacity();
    Settings.restoreCardFrost();
    Dashboard.init();
    Notes.init();
    Music.init();
    Settings.init();
    Router.navigate('dashboard');
  });
};

// GitHub 同步完成后刷新页面内容
App.reinit = function() {
  Settings.restoreBgPhoto();
  Dashboard.renderToday();
  Dashboard.renderActivity();
  Calendar.render();
  Notes.render();
  Countdown.render();
  Music.renderList();
  Settings.renderBgPhotos();
  Settings.restoreCardOpacity();
  Settings.restoreCardFrost();
  Toast.show('已同步最新数据', 'success');
};

App.navigate = function(page) { Router.navigate(page); };

App.toggleSidebar = function() {
  var s = document.getElementById('sidebar'), o = document.getElementById('sidebar-overlay');
  if (s) s.classList.toggle('open'); if (o) o.classList.toggle('open');
};

App.closeSidebar = function() {
  var s = document.getElementById('sidebar'), o = document.getElementById('sidebar-overlay');
  if (s) s.classList.remove('open'); if (o) o.classList.remove('open');
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });
