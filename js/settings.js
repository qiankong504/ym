/* ========== Settings Module (ES5) ========== */

var Settings = {};

Settings.init = function() {
  Themes.renderGrid();
  Settings.renderUsers();
  Settings.renderBgPhotos();
  Settings.restoreBgPhoto();
  Settings.restoreCardOpacity();
  Settings.restoreCardFrost();
  Settings.restoreGHConfig();
  var d = Data.load();
  var autoplayCheck = document.getElementById('toggle-autoplay');
  if (autoplayCheck) autoplayCheck.checked = (d.settings && d.settings.autoPlay) === true;
};

// ===== GitHub 配置 =====

Settings.saveGitHubConfig = function() {
  var ownerEl = document.getElementById('gh-owner');
  var repoEl = document.getElementById('gh-repo');
  var tokenEl = document.getElementById('gh-token');
  if (!ownerEl || !repoEl || !tokenEl || !ownerEl.value.trim() || !repoEl.value.trim() || !tokenEl.value.trim()) {
    var st = document.getElementById('gh-status');
    if (st) st.textContent = '请填写完整';
    return;
  }
  var st = document.getElementById('gh-status');
  if (st) st.textContent = '保存中，正在同步...';
  // 先保存配置
  Data.GH_OWNER = ownerEl.value.trim();
  Data.GH_REPO = repoEl.value.trim();
  Data.GH_TOKEN = tokenEl.value.trim();
  try { localStorage.setItem('gh_config', JSON.stringify({ owner: Data.GH_OWNER, repo: Data.GH_REPO, token: Data.GH_TOKEN })); } catch (e) {}
  // 立即上传本地数据到 GitHub（将本地已有的日记/照片同步上去）
  var d = Data.load();
  Data._syncToGH(d);
  if (st) st.textContent = '✅ 配置已保存，本地数据已同步';
  Toast.show('本地数据已上传到 GitHub', 'success');
};

Settings.restoreGHConfig = function() {
  var cfg = Data.getGHConfig();
  if (!cfg) return;
  var ownerEl = document.getElementById('gh-owner');
  var repoEl = document.getElementById('gh-repo');
  var tokenEl = document.getElementById('gh-token');
  if (ownerEl) ownerEl.value = cfg.owner;
  if (repoEl) repoEl.value = cfg.repo;
  if (tokenEl) tokenEl.value = cfg.token;
};

// ===== Card Opacity =====

Settings.getOpacityStyleTag = function() {
  var tag = document.getElementById('s-opacity');
  if (!tag) { tag = document.createElement('style'); tag.id = 's-opacity'; document.head.appendChild(tag); }
  return tag;
};

Settings.setCardOpacity = function(value) {
  var d = Data.load();
  if (!d.settings) d.settings = {};
  d.settings.cardOpacity = parseInt(value, 10);
  Data.save(d);
  Settings.applyCardOpacity(value);
  var el = document.getElementById('card-opacity-value');
  if (el) el.textContent = value + '%';
};

Settings.applyCardOpacity = function(value) {
  var op = parseInt(value, 10), a = op / 100, ah = Math.min(a + 0.15, 0.9);
  Settings.getOpacityStyleTag().textContent = ':root{--card-alpha:' + a + ';--card-alpha-hover:' + ah + ';}';
};

Settings.restoreCardOpacity = function() {
  var d = Data.load(), s = d.settings || {}, op = s.cardOpacity;
  if (op === undefined || op === null) op = 80;
  var slider = document.getElementById('card-opacity'), val = document.getElementById('card-opacity-value');
  if (slider) slider.value = op; if (val) val.textContent = op + '%';
  Settings.applyCardOpacity(op);
};

// ===== Card Frost =====

Settings.getFrostStyleTag = function() {
  var tag = document.getElementById('s-frost');
  if (!tag) { tag = document.createElement('style'); tag.id = 's-frost'; document.head.appendChild(tag); }
  return tag;
};

Settings.setCardFrost = function(value) {
  var d = Data.load();
  if (!d.settings) d.settings = {};
  d.settings.cardFrost = parseInt(value, 10);
  Data.save(d);
  Settings.applyCardFrost(value);
  var el = document.getElementById('card-frost-value');
  if (el) el.textContent = value;
};

Settings.applyCardFrost = function(value) {
  var f = parseInt(value, 10), bp = Math.round(f / 100 * 50);
  Settings.getFrostStyleTag().textContent = '.card,.clock-card,.weather-card,.note-card,.music-list-item,.countdown-card,.countdown-mini-card,.todo-item,.settings-section,.today-section.card,.recent-activity.card,#calendar-widget,.calendar-detail{backdrop-filter:blur(' + bp + 'px)!important;-webkit-backdrop-filter:blur(' + bp + 'px)!important}';
};

Settings.restoreCardFrost = function() {
  var d = Data.load(), s = d.settings || {}, f = s.cardFrost;
  if (f === undefined || f === null) f = 60;
  var slider = document.getElementById('card-frost'), val = document.getElementById('card-frost-value');
  if (slider) slider.value = f; if (val) val.textContent = f;
  Settings.applyCardFrost(f);
};

// ===== 背景照片 =====

Settings.uploadBgPhoto = function() { document.getElementById('bg-photo-input').click(); };

Settings.saveBgPhoto = function(event) {
  var file = event.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result, pid = Data.generateId();
    var d = Data.load();
    if (!d.settings) d.settings = {};
    if (!d.settings.backgroundPhotos) d.settings.backgroundPhotos = [];
    d.settings.backgroundPhotos.push({ id: pid, name: file.name, data: dataUrl, path: '' });
    d.settings.activeBackground = dataUrl;
    try {
      Data.save(d);
    } catch(e) {
      Toast.show('保存失败：存储空间不足'+e.message,'error'); return;
    }
    Settings.renderBgPhotos();
    Settings.applyBgPhoto(dataUrl);
    Toast.show('背景照片已保存，刷新后仍有效','success');
    // 异步上传到 GitHub
    if (Data.isGHAvailable()) {
      Data.uploadPhotoToGH(pid, dataUrl, function(err, url) {
        if (!err && url) {
          var d2 = Data.load();
          if (d2.settings && d2.settings.backgroundPhotos) {
            for (var i = 0; i < d2.settings.backgroundPhotos.length; i++) {
              if (d2.settings.backgroundPhotos[i].id === pid) {
                d2.settings.backgroundPhotos[i].data = url;
                d2.settings.backgroundPhotos[i].path = 'data/photos/' + pid + '.' + (file.name.match(/\.(\w+)$/) ? file.name.match(/\.(\w+)$/)[1] : 'jpg');
                if (d2.settings.activeBackground === dataUrl) d2.settings.activeBackground = url;
                break;
              }
            }
            Data.save(d2);
            Settings.renderBgPhotos();
            Settings.applyBgPhoto(url);
          }
          Toast.show('照片已同步到 GitHub', 'success');
        }
      });
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};

Settings.renderBgPhotos = function() {
  var d = Data.load(), s = d.settings || {}, photos = s.backgroundPhotos || [], active = s.activeBackground || '';
  var el = document.getElementById('bg-photo-manager');
  if (!el) return;
  el.innerHTML = '';
  if (photos.length === 0) { el.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 0;">暂无背景照片</div>'; return; }
  var grid = document.createElement('div'); grid.className = 'bg-photo-grid';
  for (var i = 0; i < photos.length; i++) {
    var p = photos[i], isActive = p.data === active;
    var item = document.createElement('div');
    item.className = 'bg-photo-item' + (isActive ? ' active' : '');
    (function(pd) { item.onclick = function() { Settings.selectBgPhoto(pd); }; })(p.data);
    item.innerHTML = '<img src="' + p.data + '" alt="' + p.name + '"><div class="bg-photo-check">✓</div><button class="bg-photo-delete" onclick="event.stopPropagation();Settings.deleteBgPhoto(\'' + p.id + '\')">✕</button>';
    grid.appendChild(item);
  }
  el.appendChild(grid);
};

Settings.selectBgPhoto = function(dataUrl) {
  var d = Data.load(); if (!d.settings) d.settings = {};
  d.settings.activeBackground = dataUrl; Data.save(d);
  Settings.renderBgPhotos(); Settings.applyBgPhoto(dataUrl);
  Toast.show('背景已切换','success');
};

Settings.deleteBgPhoto = function(pid) {
  var d = Data.load();
  if (!d.settings || !d.settings.backgroundPhotos) return;
  var photos = d.settings.backgroundPhotos, wasActive = false, path = '';
  for (var i = 0; i < photos.length; i++) {
    if (photos[i].id === pid) { path = photos[i].path || ''; if (photos[i].data === d.settings.activeBackground) wasActive = true; photos.splice(i, 1); break; }
  }
  d.settings.backgroundPhotos = photos;
  if (wasActive) d.settings.activeBackground = photos.length > 0 ? photos[photos.length - 1].data : '';
  Data.save(d);
  if (path && Data.isGHAvailable()) Data.deletePhotoFromGH(path);
  Settings.renderBgPhotos();
  if (wasActive) { if (d.settings.activeBackground) Settings.applyBgPhoto(d.settings.activeBackground); else Settings.clearBgPhoto(); }
  Toast.show('已删除','info');
};

Settings.applyBgPhoto = function(dataUrl) {
  var overlay = document.querySelector('.bg-overlay');
  if (!overlay) return;
  if (dataUrl) {
    overlay.style.background = ''; overlay.style.backgroundImage = 'url("' + dataUrl + '")';
    overlay.style.backgroundSize = 'cover'; overlay.style.backgroundPosition = 'center';
    overlay.classList.add('has-custom-bg');
  } else { Settings.clearBgPhoto(); }
};

Settings.clearBgPhoto = function() {
  var overlay = document.querySelector('.bg-overlay');
  if (!overlay) return;
  overlay.style.backgroundImage = ''; overlay.style.background = ''; overlay.classList.remove('has-custom-bg');
};

Settings.restoreBgPhoto = function() {
  var d = Data.load(), s = d.settings || {}, active = s.activeBackground || '';
  if (active) Settings.applyBgPhoto(active);
};

// ===== 用户 =====

Settings.renderUsers = function() {
  var d = Data.load(), users = d.users || {}, current = d.currentUser;
  var el = document.getElementById('user-manager'); if (!el) return;
  el.innerHTML = '';
  for (var key in users) { if (!users.hasOwnProperty(key)) continue;
    var u = users[key], av = u.avatarType === 'emoji' ? (u.avatar||'😀') : '<img src="'+u.avatar+'">';
    var active = key === current;
    el.innerHTML += '<div class="user-card'+(active?' active-user':'')+'"><div class="user-avatar">'+av+'</div><div class="user-info"><div class="user-name">'+u.nickname+(active?' (当前)':'')+'</div><div class="user-meta">ID:'+key+'</div></div><div class="user-actions">'+
      (!active?'<button class="switch-btn" onclick="Settings.switchUser(\''+key+'\')">切换</button>':'')+
      '<button class="edit-btn" onclick="Settings.editUser(\''+key+'\')">编辑</button>'+
      (key!=='default'?'<button class="delete-btn" onclick="Settings.deleteUser(\''+key+'\')">删除</button>':'')+'</div></div>';
  }
};

Settings.addUser = function() {
  var g = '';
  for (var i=0;i<Data.DEFAULT_AVATARS.length;i++) g+='<div class="avatar-emoji-option" onclick="Settings.selectAvatarEmoji(this,\''+Data.DEFAULT_AVATARS[i]+'\')">'+Data.DEFAULT_AVATARS[i]+'</div>';
  Modal.open('<h3>添加用户</h3><label>昵称</label><input type="text" id="new-user-nickname" placeholder="昵称">'+
    '<label>头像</label><div class="avatar-options"><div class="avatar-preview" id="avatar-preview">'+Data.DEFAULT_AVATARS[0]+'</div><div>'+
    '<button class="btn btn-secondary" onclick="Settings.uploadAvatar()">📷 上传</button>'+
    '<input type="file" id="avatar-upload-input" accept="image/*" style="display:none" onchange="Settings.previewUploadAvatar(event)">'+
    '</div></div><label>选择 Emoji</label><div class="avatar-emoji-grid">'+g+'</div>'+
    '<div class="btn-row"><button class="btn btn-secondary" onclick="Modal.close()">取消</button><button class="btn btn-primary" onclick="Settings.saveNewUser()">保存</button></div>');
  Settings.newUserAvatar = Data.DEFAULT_AVATARS[0]; Settings.newUserAvatarType = 'emoji';
};

Settings.newUserAvatar = ''; Settings.newUserAvatarType = 'emoji';

Settings.selectAvatarEmoji = function(el,emoji) {
  var p = el.parentNode; if (!p) return;
  var opts = p.querySelectorAll('.avatar-emoji-option'); for(var i=0;i<opts.length;i++)opts[i].className='avatar-emoji-option';
  el.className='avatar-emoji-option selected'; var pre=document.getElementById('avatar-preview');
  if(pre){pre.textContent=emoji;pre.style.fontSize='40px';}
  Settings.newUserAvatar=emoji;Settings.newUserAvatarType='emoji';
};

Settings.uploadAvatar = function(){document.getElementById('avatar-upload-input').click();};

Settings.previewUploadAvatar = function(event) {
  var f=event.target.files[0]; if(!f)return;
  var r=new FileReader(); r.onload=function(e){
    var p=document.getElementById('avatar-preview');
    if(p){p.innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;">';p.style.fontSize='';}
    Settings.newUserAvatar=e.target.result;Settings.newUserAvatarType='upload';
  }; r.readAsDataURL(f);
};

Settings.saveNewUser=function(){
  var el=document.getElementById('new-user-nickname');
  if(!el||!el.value.trim()){Toast.show('请输入昵称','error');return;}
  var d=Data.load(),users=d.users||{},id=Data.generateId();
  users[id]={id:id,nickname:el.value.trim(),avatar:Settings.newUserAvatar||'😀',avatarType:Settings.newUserAvatarType||'emoji',createdAt:Data.now()};
  d.users=users;Data.save(d);Modal.close();Settings.renderUsers();Sidebar.updateUser();
  Toast.show('用户已添加','success');
};

Settings.switchUser=function(uid){
  var d=Data.load();d.currentUser=uid;Data.save(d);Settings.renderUsers();Sidebar.updateUser();
  Toast.show('已切换','success');
};

Settings.editUser=function(uid){
  var d=Data.load(),user=d.users[uid];if(!user)return;
  var g='';
  for(var i=0;i<Data.DEFAULT_AVATARS.length;i++){
    var s=user.avatar===Data.DEFAULT_AVATARS[i]?' selected':'';
    g+='<div class="avatar-emoji-option'+s+'" onclick="Settings.selectAvatarEmoji(this,\''+Data.DEFAULT_AVATARS[i]+'\')">'+Data.DEFAULT_AVATARS[i]+'</div>';
  }
  var av=user.avatarType==='emoji'?(user.avatar||'😀'):'<img src="'+user.avatar+'" style="width:100%;height:100%;object-fit:cover;">';
  Modal.open('<h3>编辑用户</h3><label>昵称</label><input type="text" id="edit-user-nickname" value="'+user.nickname+'">'+
    '<label>头像</label><div class="avatar-options"><div class="avatar-preview" id="avatar-preview">'+av+'</div><div>'+
    '<button class="btn btn-secondary" onclick="Settings.uploadAvatar()">📷 上传</button>'+
    '<input type="file" id="avatar-upload-input" accept="image/*" style="display:none" onchange="Settings.previewUploadAvatar(event)">'+
    '</div></div><label>选择 Emoji</label><div class="avatar-emoji-grid">'+g+'</div>'+
    '<div class="btn-row"><button class="btn btn-secondary" onclick="Modal.close()">取消</button><button class="btn btn-primary" onclick="Settings.saveEditUser(\''+uid+'\')">保存</button></div>');
  Settings.newUserAvatar=user.avatar;Settings.newUserAvatarType=user.avatarType;
};

Settings.saveEditUser=function(uid){
  var el=document.getElementById('edit-user-nickname');
  if(!el||!el.value.trim()){Toast.show('请输入昵称','error');return;}
  var d=Data.load(),users=d.users||{};if(!users[uid])return;
  users[uid].nickname=el.value.trim();users[uid].avatar=Settings.newUserAvatar||users[uid].avatar;
  users[uid].avatarType=Settings.newUserAvatarType||users[uid].avatarType;
  d.users=users;Data.save(d);Modal.close();Settings.renderUsers();Sidebar.updateUser();
  Toast.show('已更新','success');
};

Settings.deleteUser=function(uid){
  if(uid==='default'){Toast.show('不能删除默认用户','error');return;}
  Modal.confirm('确定删除？',function(){
    var d=Data.load(),users=d.users||{};if(!users[uid])return;
    delete users[uid];if(d.currentUser===uid)d.currentUser='default';
    d.users=users;Data.save(d);Settings.renderUsers();Sidebar.updateUser();
    Toast.show('已删除','info');
  });
};

// ===== 开关 =====

Settings.toggleAutoplay = function() {
  var cb=document.getElementById('toggle-autoplay'),d=Data.load();
  if(!d.settings)d.settings={};d.settings.autoPlay=cb.checked;Data.save(d);
};
