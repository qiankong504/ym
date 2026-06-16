/* ========== Sidebar (ES5) ========== */

var Sidebar = {};

Sidebar.updateUser = function() {
  var d = Data.load();
  var user = Data.getUserDisplay(d.currentUser);
  var avatarEl = document.getElementById('sidebar-avatar');
  var nameEl = document.getElementById('sidebar-nickname');

  if (nameEl) nameEl.textContent = user.nickname;

  if (avatarEl) {
    if (user.avatarType === 'emoji') {
      avatarEl.textContent = user.avatar || '😀';
      avatarEl.style.fontSize = '20px';
      avatarEl.innerHTML = '';
      avatarEl.textContent = user.avatar || '😀';
    } else {
      avatarEl.innerHTML = '<img src="' + user.avatar + '">';
      avatarEl.style.fontSize = '';
    }
  }
};

Sidebar.highlight = function(page) {
  var items = document.querySelectorAll('.nav-item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.remove('active');
    if (items[i].getAttribute('data-page') === page) {
      items[i].classList.add('active');
    }
  }
};
