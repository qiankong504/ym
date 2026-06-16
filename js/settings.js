/* ========== Settings Module (ES5) ========== */

var Settings = {};

Settings.init = function() {
  Themes.renderGrid();
  Settings.renderUsers();
  Settings.renderBgPhotos();
  Settings.restoreBgPhoto();
  Settings.restoreCardOpacity();
  Settings.restoreCardFrost();
  var d = Data.load();
  var settings = d.settings || {};
  var autoplayCheck = document.getElementById('toggle-autoplay');
  if (autoplayCheck) autoplayCheck.checked = settings.autoPlay === true;
};

// ===== Card Opacity =====
// Injects a <style> tag into head to override --bg-card and --bg-card-hover alpha
// to all themed elements, since it's the last style in head it has highest priority

Settings.getOpacityStyleTag = function() {
  var tag = document.getElementById('s-opacity');
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 's-opacity';
    document.head.appendChild(tag);
  }
  return tag;
};

Settings.setCardOpacity = function(value) {
  var d = Data.load();
  if (!d.settings) d.settings = {};
  d.settings.cardOpacity = parseInt(value, 10);
  Data.save(d);
  Settings.applyCardOpacity(value);
  var valEl = document.getElementById('card-opacity-value');
  if (valEl) valEl.textContent = value + '%';
};

Settings.applyCardOpacity = function(value) {
  var op = parseInt(value, 10);
  var a = op / 100;
  var ah = Math.min(a + 0.15, 0.9);
  var tag = Settings.getOpacityStyleTag();
  // Use ::after trick: override all --bg-card and --bg-card-hover usages
  // by redeclaring --card-alpha and --card-alpha-hover on :root
  tag.textContent = ':root{--card-alpha:' + a + ';--card-alpha-hover:' + ah + ';}';
};

Settings.restoreCardOpacity = function() {
  var d = Data.load();
  var settings = d.settings || {};
  var opacity = settings.cardOpacity;
  if (opacity === undefined || opacity === null) opacity = 80;
  var slider = document.getElementById('card-opacity');
  var valEl = document.getElementById('card-opacity-value');
  if (slider) slider.value = opacity;
  if (valEl) valEl.textContent = opacity + '%';
  Settings.applyCardOpacity(opacity);
};

Settings.getFrostStyleTag = function() {
  var tag = document.getElementById('s-frost');
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 's-frost';
    document.head.appendChild(tag);
  }
  return tag;
};

Settings.setCardFrost = function(value) {
  var d = Data.load();
  if (!d.settings) d.settings = {};
  d.settings.cardFrost = parseInt(value, 10);
  Data.save(d);
  Settings.applyCardFrost(value);
  var valEl = document.getElementById('card-frost-value');
  if (valEl) valEl.textContent = value;
};

Settings.applyCardFrost = function(value) {
  var frost = parseInt(value, 10);
  var blurPx = Math.round(frost / 100 * 50);
  var tag = Settings.getFrostStyleTag();
  tag.textContent = '.card,.clock-card,.weather-card,.note-card,.music-list-item,.countdown-card,.countdown-mini-card,.todo-item,.settings-section,.today-section.card,.recent-activity.card,#calendar-widget,.calendar-detail{backdrop-filter:blur(' + blurPx + 'px)!important;-webkit-backdrop-filter:blur(' + blurPx + 'px)!important}';
};

Settings.restoreCardFrost = function() {
  var d = Data.load();
  var settings = d.settings || {};
  var frost = settings.cardFrost;
  if (frost === undefined || frost === null) frost = 60;
  var slider = document.getElementById('card-frost');
  var valEl = document.getElementById('card-frost-value');
  if (slider) slider.value = frost;
  if (valEl) valEl.textContent = frost;
  Settings.applyCardFrost(frost);
};


// ===== Background Photos (upload only, no presets) =====

Settings.uploadBgPhoto = function() {
  document.getElementById('bg-photo-input').click();
};

Settings.saveBgPhoto = function(event) {
  var file = event.target.files[0];
  if (!file) return;

  // Allow multiple uploads — each call appends
  var d = Data.load();
  if (!d.settings) d.settings = {};
  if (!d.settings.backgroundPhotos) d.settings.backgroundPhotos = [];

  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    d.settings.backgroundPhotos.push({
      id: Data.generateId(),
      name: file.name,
      data: dataUrl
    });
    d.settings.activeBackground = dataUrl;
    Data.save(d);
    Settings.renderBgPhotos();
    Settings.applyBgPhoto(dataUrl);
    Toast.show('背景照片已添加', 'success');
  };
  reader.readAsDataURL(file);
  // Reset input so the same file can be selected again
  event.target.value = '';
};

Settings.renderBgPhotos = function() {
  var d = Data.load();
  var settings = d.settings || {};
  var photos = settings.backgroundPhotos || [];
  var active = settings.activeBackground || '';
  var el = document.getElementById('bg-photo-manager');
  if (!el) return;

  el.innerHTML = '';

  if (photos.length === 0) {
    el.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 0;">暂无背景照片，点击上方按钮上传</div>';
    return;
  }

  var grid = document.createElement('div');
  grid.className = 'bg-photo-grid';

  for (var i = 0; i < photos.length; i++) {
    var p = photos[i];
    var isActive = p.data === active;
    var item = document.createElement('div');
    item.className = 'bg-photo-item' + (isActive ? ' active' : '');
    item.onclick = (function(photoData) {
      return function() {
        Settings.selectBgPhoto(photoData);
      };
    })(p.data);

    item.innerHTML = '<img src="' + p.data + '" alt="' + p.name + '">' +
      '<div class="bg-photo-check">✓</div>' +
      '<button class="bg-photo-delete" onclick="event.stopPropagation(); Settings.deleteBgPhoto(\'' + p.id + '\')">✕</button>';

    grid.appendChild(item);
  }

  el.appendChild(grid);
};

Settings.selectBgPhoto = function(dataUrl) {
  var d = Data.load();
  if (!d.settings) d.settings = {};
  d.settings.activeBackground = dataUrl;
  Data.save(d);
  Settings.renderBgPhotos();
  Settings.applyBgPhoto(dataUrl);
  Toast.show('背景已切换', 'success');
};

Settings.deleteBgPhoto = function(photoId) {
  var d = Data.load();
  if (!d.settings || !d.settings.backgroundPhotos) return;
  var photos = d.settings.backgroundPhotos;
  var wasActive = false;
  for (var i = 0; i < photos.length; i++) {
    if (photos[i].id === photoId) {
      if (photos[i].data === d.settings.activeBackground) wasActive = true;
      photos.splice(i, 1);
      break;
    }
  }
  d.settings.backgroundPhotos = photos;
  if (wasActive) {
    d.settings.activeBackground = photos.length > 0 ? photos[photos.length - 1].data : '';
  }
  Data.save(d);
  Settings.renderBgPhotos();
  if (wasActive) {
    if (d.settings.activeBackground) {
      Settings.applyBgPhoto(d.settings.activeBackground);
    } else {
      Settings.clearBgPhoto();
    }
  }
  Toast.show('已删除', 'info');
};

Settings.applyBgPhoto = function(dataUrl) {
  var overlay = document.querySelector('.bg-overlay');
  if (!overlay) return;
  if (dataUrl) {
    overlay.style.background = '';
    overlay.style.backgroundImage = 'url("' + dataUrl + '")';
    overlay.style.backgroundSize = 'cover';
    overlay.style.backgroundPosition = 'center';
    overlay.style.backgroundRepeat = 'no-repeat';
    overlay.classList.add('has-custom-bg');
  } else {
    Settings.clearBgPhoto();
  }
};

Settings.clearBgPhoto = function() {
  var overlay = document.querySelector('.bg-overlay');
  if (!overlay) return;
  overlay.style.backgroundImage = '';
  overlay.style.background = '';
  overlay.classList.remove('has-custom-bg');
};

Settings.restoreBgPhoto = function() {
  var d = Data.load();
  var settings = d.settings || {};
  var active = settings.activeBackground || '';
  if (active) Settings.applyBgPhoto(active);
};

// ===== Users =====

Settings.renderUsers = function() {
  var d = Data.load();
  var users = d.users || {};
  var current = d.currentUser;
  var el = document.getElementById('user-manager');
  if (!el) return;

  el.innerHTML = '';
  for (var key in users) {
    if (users.hasOwnProperty(key)) {
      var u = users[key];
      var avatarHtml = '';
      if (u.avatarType === 'emoji') {
        avatarHtml = u.avatar || '😀';
      } else {
        avatarHtml = '<img src="' + u.avatar + '">';
      }
      var isActive = key === current;
      var div = document.createElement('div');
      div.className = 'user-card' + (isActive ? ' active-user' : '');
      div.innerHTML = '<div class="user-avatar">' + avatarHtml + '</div>' +
        '<div class="user-info">' +
        '<div class="user-name">' + u.nickname + (isActive ? ' (当前)' : '') + '</div>' +
        '<div class="user-meta">ID: ' + key + '</div></div>' +
        '<div class="user-actions">' +
        (!isActive ? '<button class="switch-btn" onclick="Settings.switchUser(\'' + key + '\')">切换</button>' : '') +
        '<button class="edit-btn" onclick="Settings.editUser(\'' + key + '\')">编辑</button>' +
        (key !== 'default' ? '<button class="delete-btn" onclick="Settings.deleteUser(\'' + key + '\')">删除</button>' : '') +
        '</div>';
      el.appendChild(div);
    }
  }
};

Settings.addUser = function() {
  var emojiGrid = '';
  var avatars = Data.DEFAULT_AVATARS;
  for (var i = 0; i < avatars.length; i++) {
    emojiGrid += '<div class="avatar-emoji-option" data-emoji="' + avatars[i] + '" onclick="Settings.selectAvatarEmoji(this, \'' + avatars[i] + '\')">' + avatars[i] + '</div>';
  }
  var html = '<h3>添加用户</h3>' +
    '<label>昵称</label><input type="text" id="new-user-nickname" placeholder="昵称">' +
    '<label>头像</label><div class="avatar-options"><div class="avatar-preview" id="avatar-preview">' + avatars[0] + '</div><div>' +
    '<button class="btn btn-secondary" onclick="Settings.uploadAvatar()">📷 上传照片</button>' +
    '<input type="file" id="avatar-upload-input" accept="image/*" style="display:none" onchange="Settings.previewUploadAvatar(event)">' +
    '</div></div><label>选择 Emoji 头像</label><div class="avatar-emoji-grid">' + emojiGrid + '</div>' +
    '<div class="btn-row"><button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Settings.saveNewUser()">保存</button></div>';
  Modal.open(html);
  Settings.newUserAvatar = avatars[0];
  Settings.newUserAvatarType = 'emoji';
};

Settings.newUserAvatar = '';
Settings.newUserAvatarType = 'emoji';

Settings.selectAvatarEmoji = function(el, emoji) {
  var grid = el.parentNode;
  if (!grid) return;
  var options = grid.querySelectorAll('.avatar-emoji-option');
  for (var i = 0; i < options.length; i++) options[i].className = 'avatar-emoji-option';
  el.className = 'avatar-emoji-option selected';
  var preview = document.getElementById('avatar-preview');
  if (preview) { preview.textContent = emoji; preview.style.fontSize = '40px'; }
  Settings.newUserAvatar = emoji;
  Settings.newUserAvatarType = 'emoji';
};

Settings.uploadAvatar = function() { document.getElementById('avatar-upload-input').click(); };

Settings.previewUploadAvatar = function(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('avatar-preview');
    if (preview) {
      preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">';
      preview.style.fontSize = '';
    }
    Settings.newUserAvatar = e.target.result;
    Settings.newUserAvatarType = 'upload';
  };
  reader.readAsDataURL(file);
};

Settings.saveNewUser = function() {
  var nicknameEl = document.getElementById('new-user-nickname');
  if (!nicknameEl || !nicknameEl.value.trim()) { Toast.show('请输入昵称', 'error'); return; }
  var d = Data.load();
  var users = d.users || {};
  var id = Data.generateId();
  users[id] = { id: id, nickname: nicknameEl.value.trim(), avatar: Settings.newUserAvatar || '😀', avatarType: Settings.newUserAvatarType || 'emoji', createdAt: Data.now() };
  d.users = users;
  Data.save(d);
  Modal.close();
  Settings.renderUsers();
  Sidebar.updateUser();
  Toast.show('用户已添加', 'success');
};

Settings.switchUser = function(userId) {
  var d = Data.load();
  d.currentUser = userId;
  Data.save(d);
  Settings.renderUsers();
  Sidebar.updateUser();
  Toast.show('已切换到: ' + d.users[userId].nickname, 'success');
};

Settings.editUser = function(userId) {
  var d = Data.load();
  var user = d.users[userId];
  if (!user) return;
  var emojiGrid = '';
  var avatars = Data.DEFAULT_AVATARS;
  for (var i = 0; i < avatars.length; i++) {
    var sel = user.avatar === avatars[i] ? ' selected' : '';
    emojiGrid += '<div class="avatar-emoji-option' + sel + '" data-emoji="' + avatars[i] + '" onclick="Settings.selectAvatarEmoji(this, \'' + avatars[i] + '\')">' + avatars[i] + '</div>';
  }
  var avatarPreviewContent = user.avatarType === 'emoji' ? (user.avatar || '😀') : '<img src="' + user.avatar + '" style="width:100%;height:100%;object-fit:cover;">';
  var html = '<h3>编辑用户</h3>' +
    '<label>昵称</label><input type="text" id="edit-user-nickname" value="' + user.nickname + '">' +
    '<label>头像</label><div class="avatar-options"><div class="avatar-preview" id="avatar-preview">' + avatarPreviewContent + '</div><div>' +
    '<button class="btn btn-secondary" onclick="Settings.uploadAvatar()">📷 上传照片</button>' +
    '<input type="file" id="avatar-upload-input" accept="image/*" style="display:none" onchange="Settings.previewUploadAvatar(event)">' +
    '</div></div><label>选择 Emoji 头像</label><div class="avatar-emoji-grid">' + emojiGrid + '</div>' +
    '<div class="btn-row"><button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Settings.saveEditUser(\'' + userId + '\')">保存</button></div>';
  Modal.open(html);
  Settings.newUserAvatar = user.avatar;
  Settings.newUserAvatarType = user.avatarType;
};

Settings.saveEditUser = function(userId) {
  var nicknameEl = document.getElementById('edit-user-nickname');
  if (!nicknameEl || !nicknameEl.value.trim()) { Toast.show('请输入昵称', 'error'); return; }
  var d = Data.load();
  var users = d.users || {};
  if (!users[userId]) return;
  users[userId].nickname = nicknameEl.value.trim();
  users[userId].avatar = Settings.newUserAvatar || users[userId].avatar;
  users[userId].avatarType = Settings.newUserAvatarType || users[userId].avatarType;
  d.users = users;
  Data.save(d);
  Modal.close();
  Settings.renderUsers();
  Sidebar.updateUser();
  Toast.show('用户已更新', 'success');
};

Settings.deleteUser = function(userId) {
  if (userId === 'default') { Toast.show('不能删除默认用户', 'error'); return; }
  Modal.confirm('确定要删除这个用户吗？', function() {
    var d = Data.load();
    var users = d.users || {};
    if (users[userId]) {
      delete users[userId];
      if (d.currentUser === userId) d.currentUser = 'default';
      d.users = users;
      Data.save(d);
      Settings.renderUsers();
      Sidebar.updateUser();
      Toast.show('用户已删除', 'info');
    }
  });
};

// ===== Toggles =====

Settings.toggleAutoplay = function() {
  var cb = document.getElementById('toggle-autoplay');
  var d = Data.load();
  if (!d.settings) d.settings = {};
  d.settings.autoPlay = cb.checked;
  Data.save(d);
};
