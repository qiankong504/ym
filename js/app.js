/* ========== App (ES5) ========== */

var App = {};

App.init = function() {
  // Data.ready 会先加载本地数据，再异步从 GitHub 同步
  // 所以页面会先显示本地数据，不会空白
  Data.ready(function() {
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

// 当 GitHub 同步完成后，重新刷新页面内容
App.reinit = function() {
  var page = document.querySelector('.page.active');
  var id = page ? page.id.replace('page-', '') : 'dashboard';
  Themes.apply(Data.load().theme || 'midnight');
  Sidebar.updateUser();
  Settings.restoreBgPhoto();
  Dashboard.init();
  Calendar.init();
  Notes.init();
  Countdown.render();
  Music.renderList();
  Settings.renderBgPhotos();
  Settings.restoreGitHubConfig();
  Router.navigate(id);
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
