/* ========== Data Layer — GitHub + localStorage 双通道 ==========
   优先从 GitHub 读取，所有人共享数据
   如果 GitHub 不可用（首次/离线）则降级到 localStorage
   写入时同时写入 GitHub 和 localStorage
*/

var Data = {};

Data.GITHUB_OWNER = '';
Data.GITHUB_REPO = '';
Data.GITHUB_TOKEN = '';
Data.GITHUB_BRANCH = 'main';
Data.DATA_FILE = 'data/data.json';

Data.cache = null;
Data.ghReady = false;
Data.onReady = [];

Data.LS_KEY = 'my_homepage_data';

// ---- 配置 ----
Data.MOODS = [
  { id: 'happy', emoji: '\u{1F60A}', label: '开心' },
  { id: 'calm', emoji: '\u{1F60C}', label: '平静' },
  { id: 'sad', emoji: '\u{1F622}', label: '难过' },
  { id: 'angry', emoji: '\u{1F620}', label: '生气' },
  { id: 'excited', emoji: '\u{1F929}', label: '兴奋' },
  { id: 'tired', emoji: '\u{1F634}', label: '累了' },
  { id: 'love', emoji: '\u{1F970}', label: '甜蜜' },
  { id: 'anxious', emoji: '\u{1F630}', label: '焦虑' }
];
Data.THEMES = [
  { id: 'midnight', name: 'Midnight', color: '#7c5cbf' },
  { id: 'aurora', name: 'Aurora', color: '#2ecc71' },
  { id: 'sunset', name: 'Sunset', color: '#e67e22' },
  { id: 'ocean', name: 'Ocean', color: '#3498db' },
  { id: 'cherry', name: 'Cherry', color: '#e74c3c' },
  { id: 'cyberpunk', name: 'Cyberpunk', color: '#ff00ff' },
  { id: 'forest', name: 'Forest', color: '#27ae60' },
  { id: 'minimal', name: 'Minimal', color: '#555555' }
];
Data.DEFAULT_AVATARS = ['\u{1F600}', '\u{1F60E}', '\u{1F60A}', '\u{1F60B}', '\u{1F60C}', '\u{1F60D}', '\u{1F61C}', '\u{1F60F}', '\u{1F636}', '\u{1F92A}', '\u{1F600}'];

Data.getDefaultData = function() {
  return {
    users: {
      default: {
        id: 'default', nickname: '我', avatar: '\u{1F60A}',
        avatarType: 'emoji', createdAt: new Date().toISOString()
      }
    },
    currentUser: 'default', theme: 'midnight',
    settings: { autoPlay: false, cardOpacity: 80, cardFrost: 60, backgroundPhotos: [], activeBackground: '' },
    notes: {}, todos: {}, countdowns: {}, music: []
  };
};

// ===== GitHub API =====

Data.setGitHubConfig = function(owner, repo, token) {
  Data.GITHUB_OWNER = owner;
  Data.GITHUB_REPO = repo;
  Data.GITHUB_TOKEN = token;
  try { localStorage.setItem('gh_config', JSON.stringify({ owner: owner, repo: repo, token: token })); } catch (e) {}
};

Data.getGitHubConfig = function() {
  if (Data.GITHUB_OWNER) return { owner: Data.GITHUB_OWNER, repo: Data.GITHUB_REPO, token: Data.GITHUB_TOKEN };
  try {
    var raw = localStorage.getItem('gh_config');
    if (raw) {
      var c = JSON.parse(raw);
      Data.GITHUB_OWNER = c.owner; Data.GITHUB_REPO = c.repo; Data.GITHUB_TOKEN = c.token;
      return c;
    }
  } catch (e) {}
  return null;
};

Data.isGitHubConfigured = function() {
  return !!(Data.GITHUB_OWNER && Data.GITHUB_REPO && Data.GITHUB_TOKEN);
};

Data.githubFetch = function(method, endpoint, body, callback) {
  var cfg = Data.getGitHubConfig();
  if (!cfg) { if (callback) callback('未配置'); return; }
  var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/' + endpoint;
  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + cfg.token);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  if (body) xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() { if (callback) callback(null, xhr); };
  xhr.onerror = function() { if (callback) callback('网络错误'); };
  xhr.send(body ? JSON.stringify(body) : null);
};

// ===== 从 GitHub 读取 =====

Data.fetchFromGitHub = function(callback) {
  if (!Data.isGitHubConfigured()) {
    if (callback) callback(null);
    return;
  }
  Data.githubFetch('GET', 'contents/' + Data.DATA_FILE, null, function(err, xhr) {
    if (err || !xhr || xhr.status === 404) {
      if (callback) callback(null);
      return;
    }
    if (xhr.status === 200) {
      try {
        var resp = JSON.parse(xhr.responseText);
        var content = atob(resp.content);
        Data.cache = JSON.parse(content);
        Data.fileSha = resp.sha;
        Data.ghReady = true;
        // sync to localStorage for fallback
        try { localStorage.setItem(Data.LS_KEY, content); } catch (e) {}
        if (callback) callback(Data.cache);
        return;
      } catch (e) {}
    }
    if (callback) callback(null);
  });
};

Data.fileSha = null;

// ===== 写入 GitHub =====

Data.saveToGitHub = function(data, callback) {
  if (!Data.isGitHubConfigured()) { if (callback) callback(); return; }
  var content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  var body = { message: '更新 ' + new Date().toISOString().slice(0, 16), content: content, branch: 'main' };
  if (Data.fileSha) body.sha = Data.fileSha;
  Data.githubFetch('PUT', 'contents/' + Data.DATA_FILE, body, function(err, xhr) {
    if (xhr && xhr.status === 201) {
      try { Data.fileSha = JSON.parse(xhr.responseText).content.sha; } catch (e) {}
    }
    if (callback) callback();
  });
};

// ===== 上传照片到 GitHub =====

Data.uploadPhotoToGitHub = function(photoId, base64Data, callback) {
  if (!Data.isGitHubConfigured()) { if (callback) callback('未配置'); return; }
  var parts = base64Data.split(',');
  var mime = 'image/png';
  if (base64Data.indexOf('jpeg') > 0) mime = 'image/jpeg';
  if (base64Data.indexOf('webp') > 0) mime = 'image/webp';
  if (base64Data.indexOf('gif') > 0) mime = 'image/gif';
  var raw = parts.length > 1 ? parts[1] : base64Data;
  var ext = mime === 'image/png' ? 'png' : 'jpg';
  var path = 'data/photos/' + photoId + '.' + ext;
  Data.githubFetch('PUT', 'contents/' + path, {
    message: '上传照片 ' + photoId, content: raw, branch: 'main'
  }, function(err, xhr) {
    if (xhr && xhr.status === 201) {
      var url = 'https://raw.githubusercontent.com/' + Data.GITHUB_OWNER + '/' + Data.GITHUB_REPO + '/main/' + path;
      if (callback) callback(null, url, path);
    } else {
      if (callback) callback('上传失败');
    }
  });
};

Data.deletePhotoFromGitHub = function(path, callback) {
  if (!Data.isGitHubConfigured()) { if (callback) callback(); return; }
  Data.githubFetch('GET', 'contents/' + path, null, function(err, xhr) {
    if (xhr && xhr.status === 200) {
      try {
        var resp = JSON.parse(xhr.responseText);
        Data.githubFetch('DELETE', 'contents/' + path, { message: '删除照片', sha: resp.sha, branch: 'main' });
      } catch (e) {}
    }
  });
};

// ===== 核心：load / save（双通道） =====

Data.load = function() {
  // 优先使用内存缓存
  if (Data.cache) return Data.cache;
  // 其次读 localStorage（之前存的数据）
  try {
    var raw = localStorage.getItem(Data.LS_KEY);
    if (raw) {
      Data.cache = JSON.parse(raw);
      return Data.cache;
    }
  } catch (e) {}
  // 最后返回默认
  Data.cache = Data.getDefaultData();
  return Data.cache;
};

Data.save = function(data) {
  Data.cache = data;
  // 立即写入 localStorage（即时生效）
  try { localStorage.setItem(Data.LS_KEY, JSON.stringify(data)); } catch (e) {}
  // 异步同步到 GitHub（不阻塞）
  if (Data.isGitHubConfigured()) {
    Data.saveToGitHub(data);
  }
};

// ===== 启动流程：先读本地，再尝试 GitHub 同步 =====

Data.ready = function(callback) {
  Data.onReady.push(callback);
  if (Data._starting) return;
  Data._starting = true;

  // 第一步：立即加载本地数据，让页面先展示
  var localData = Data.load();
  for (var i = 0; i < Data.onReady.length; i++) {
    Data.onReady[i](localData);
  }

  // 第二步：尝试从 GitHub 拉取最新数据（覆盖本地）
  Data.fetchFromGitHub(function(ghData) {
    if (ghData) {
      Data.cache = ghData;
      // 重新初始化所有模块
      App.reinit();
    }
  });
};

// ===== 图片路径修复：如果是旧数据(base64)，保持原样；如果是 GitHub URL 直接使用 =====

Data.resolvePhotoUrl = function(data) {
  if (!data) return '';
  // 如果是 GitHub raw URL 或 data URL，直接返回
  if (data.indexOf('http') === 0 || data.indexOf('data:') === 0) return data;
  // 否则作为路径处理
  return data;
};

// ===== 工具函数 =====

Data.currentUser = function() {
  var d = Data.load(); return d.currentUser || 'default';
};
Data.getUser = function(userId) {
  var d = Data.load(); return d.users[userId] || d.users['default'];
};
Data.getUserDisplay = function(userId) {
  var u = Data.getUser(userId);
  return u || { nickname: '?', avatar: '\u{1F600}', avatarType: 'emoji' };
};
Data.generateId = function() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
};
Data.now = function() { return new Date().toISOString(); };

Data.getToday = function() {
  var d = Data.load();
  var now = new Date();
  var ds = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  var notes = [], todos = [];
  for (var k in (d.notes||{})) if (d.notes.hasOwnProperty(k) && d.notes[k].createdAt && d.notes[k].createdAt.indexOf(ds)===0) notes.push(d.notes[k]);
  for (var k2 in (d.todos||{})) if (d.todos.hasOwnProperty(k2) && d.todos[k2].date === ds) todos.push(d.todos[k2]);
  return { notes: notes, todos: todos };
};

Data.getActivity = function(limit) {
  limit = limit || 20;
  var d = Data.load(), acts = [];
  for (var k in (d.notes||{})) if (d.notes.hasOwnProperty(k)) {
    var n = d.notes[k]; acts.push({ type:'note', text:n.text, time:n.createdAt, userId:n.createdBy, id:k });
    if (n.lastEditedAt && n.lastEditedAt !== n.createdAt) acts.push({ type:'edit', text:n.text, time:n.lastEditedAt, userId:n.lastEditedBy, id:k });
  }
  for (var k2 in (d.todos||{})) if (d.todos.hasOwnProperty(k2)) { var t=d.todos[k2]; acts.push({ type:'todo', text:t.text, time:t.createdAt, userId:t.createdBy, id:k2 }); }
  for (var k3 in (d.countdowns||{})) if (d.countdowns.hasOwnProperty(k3)) { var c=d.countdowns[k3]; acts.push({ type:'countdown', text:c.name, time:c.createdAt, userId:c.createdBy, id:k3 }); }
  acts.sort(function(a,b){return b.time.localeCompare(a.time);});
  return acts.slice(0, limit);
};

Data.exportData = function() {
  var d = Data.load();
  var blob = new Blob([JSON.stringify(d,null,2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='xy_data_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  Toast.show('数据导出成功','success');
};

Data.importData = function(event) {
  var file = event.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      if (imported.users && imported.notes !== undefined) {
        Data.cache = imported; Data.save(imported);
        Toast.show('数据导入成功，正在同步...','success');
        App.init();
      } else { Toast.show('数据格式无效','error'); }
    } catch (err) { Toast.show('导入失败','error'); }
  };
  reader.readAsText(file); event.target.value='';
};
