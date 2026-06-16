/* ========== App (ES5) ========== */

var App = {};

App.init = function() {
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

App.navigate = function(page) {
  Router.navigate(page);
};

App.toggleSidebar = function() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
};

App.closeSidebar = function() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });
