/* ========== Router (ES5) ========== */

var Router = {};

Router.pages = {
  dashboard: { title: '首页', init: 'Dashboard.init' },
  calendar: { title: '日历·待办', init: 'Calendar.init' },
  notes: { title: '碎碎念', init: 'Notes.init' },
  countdown: { title: '倒计时', init: 'Countdown.render' },
  music: { title: '音乐', init: 'Music.init' },
  settings: { title: '设置', init: 'Settings.init' }
};

Router.navigate = function(page) {
  // Validate page
  if (!Router.pages[page]) page = 'dashboard';

  // Hide all pages
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.remove('active');
  }

  // Show target page
  var target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // Update title
  var titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = Router.pages[page].title;

  // Update sidebar
  Sidebar.highlight(page);

  // Close mobile sidebar
  App.closeSidebar();

  // Initialize page
  var initFn = Router.pages[page].init;
  if (initFn) {
    var parts = initFn.split('.');
    var obj = window[parts[0]];
    if (obj && typeof obj[parts[1]] === 'function') {
      obj[parts[1]]();
    }
  }
};
