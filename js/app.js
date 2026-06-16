/* ========== App (ES5) ========== */

var App = {};

App.init = function() {
  // First ensure data is synced from IndexedDB
  Data.syncFromDB(function() {
    // Apply theme
    Themes.init();

    // Update sidebar
    Sidebar.updateUser();

    // Restore background photo
    Settings.restoreBgPhoto();

    // Restore card opacity
    Settings.restoreCardOpacity();

    // Restore card frost
    Settings.restoreCardFrost();

    // Load dashboard
    Dashboard.init();

    // Init notes
    Notes.init();

    // Init music
    Music.init();

    // Init settings
    Settings.init();

    // Navigate to dashboard
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

// Boot
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
