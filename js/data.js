/* ========== Data Layer v3 — localStorage 主力 + GitHub 异步同步 ==========
   1. 所有数据优先读写 localStorage（即时、可靠）
   2. GitHub 同步在后台进行，不阻塞任何操作
   3. 无论 Token/GitHub 什么状态，页面永远正常显示
*/

var Data = {};

// localStorage key
Data.LS_KEY = 'my_homepage_data';

// GitHub 配置（可选）
Data.GH_OWNER = '';
Data.GH_REPO = '';
Data.GH_TOKEN = '';
Data.GH_BRANCH = 'main';
Data.GH_FILE = 'data/data.json';
Data.GH_SHA = null;

// ---- 常量 ----
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
  var now = new Date().toISOString();
  return {
    users: { default: { id: 'default', nickname: '我', avatar: '\u{1F60A}', avatarType: 'emoji', createdAt: now } },
    currentUser: 'default',
    theme: 'midnight',
    settings: { autoPlay: false, cardOpacity: 80, cardFrost: 60, backgroundPhotos: [], activeBackground: '' },
    notes: {},
    todos: {},
    countdowns: {},
    music: []
  };
};

// ===== 核心：load / save（永远可靠） =====

Data.load = function() {
  try {
    var raw = localStorage.getItem(Data.LS_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      // 确保必要字段存在
      if (parsed.notes !== undefined && parsed.users !== undefined) {
        return parsed;
      }
    }
  } catch (e) {}
  return Data.getDefaultData();
};

Data.save = function(data) {
  try {
    localStorage.setItem(Data.LS_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage 可能满，忽略
  }
  // 异步备份到 GitHub（不阻塞，失败不影响页面）
  if (Data.isGHAvailable()) {
    setTimeout(function() { Data._syncToGH(data); }, 100);
  }
};

// 启动时调用：读取本地数据后，尝试从 GitHub 拉取最新版
Data.boot = function(callback) {
  var localData = Data.load();
  // 立即用本地数据渲染（永远优先）
  callback(localData);
  // 然后异步尝试 GitHub 同步
  if (Data.isGHAvailable()) {
    Data._fetchFromGH(function(ghData) {
      if (ghData) {
        // 比较本地和 GitHub，取最新的（按数据条目数估算）
        var localCount = 0;
        for (var k in (localData.notes||{})) if (localData.notes.hasOwnProperty(k)) localCount++;
        for (var k2 in (localData.todos||{})) if (localData.todos.hasOwnProperty(k2)) localCount++;
        var ghCount = 0;
        for (var k3 in (ghData.notes||{})) if (ghData.notes.hasOwnProperty(k3)) ghCount++;
        for (var k4 in (ghData.todos||{})) if (ghData.todos.hasOwnProperty(k4)) ghCount++;
        // 如果 GitHub 数据更多，才覆盖本地
        if (ghCount > localCount) {
          Data.save(ghData);
          if (typeof App !== 'undefined' && App.reinit) {
            App.reinit();
          }
        }
      }
    });
  }
};

// ===== GitHub 配置 =====

Data.setGHConfig = function(owner, repo, token) {
  Data.GH_OWNER = owner;
  Data.GH_REPO = repo;
  Data.GH_TOKEN = token;
  try { localStorage.setItem('gh_config', JSON.stringify({ owner: owner, repo: repo, token: token })); } catch (e) {}
  // 保存配置后立即从 GitHub 拉一次
  Data._fetchFromGH(function(ghData) {
    if (ghData) {
      Data.save(ghData);
      if (typeof App !== 'undefined' && App.reinit) App.reinit();
    }
  });
};

Data.loadGHConfig = function() {
  if (Data.GH_OWNER) return;
  try {
    var raw = localStorage.getItem('gh_config');
    if (raw) {
      var c = JSON.parse(raw);
      Data.GH_OWNER = c.owner;
      Data.GH_REPO = c.repo;
      Data.GH_TOKEN = c.token;
    }
  } catch (e) {}
};

Data.isGHAvailable = function() {
  Data.loadGHConfig();
  return !!(Data.GH_OWNER && Data.GH_REPO && Data.GH_TOKEN);
};

Data.getGHConfig = function() {
  Data.loadGHConfig();
  if (Data.GH_OWNER) return { owner: Data.GH_OWNER, repo: Data.GH_REPO, token: Data.GH_TOKEN };
  return null;
};

// ===== GitHub API 请求 =====

Data._ghRequest = function(method, endpoint, body, callback) {
  var cfg = Data.getGHConfig();
  if (!cfg) { if (callback) callback('no_config'); return; }
  var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/' + endpoint;
  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + cfg.token);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  if (body) xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() { if (callback) callback(null, xhr); };
  xhr.onerror = function() { if (callback) callback('network'); };
  xhr.send(body ? JSON.stringify(body) : null);
};

// ===== 从 GitHub 读取数据 =====

Data._fetchFromGH = function(callback) {
  Data._ghRequest('GET', 'contents/' + Data.GH_FILE, null, function(err, xhr) {
    if (err || !xhr || xhr.status !== 200) {
      if (callback) callback(null);
      return;
    }
    try {
      var resp = JSON.parse(xhr.responseText);
      var content = decodeURIComponent(escape(atob(resp.content)));
      var data = JSON.parse(content);
      if (data.notes !== undefined && data.users !== undefined) {
        Data.GH_SHA = resp.sha;
        if (callback) callback(data);
        return;
      }
    } catch (e) {}
    if (callback) callback(null);
  });
};

// ===== 写入 GitHub =====

Data._syncToGH = function(data) {
  Data._ghRequest('GET', 'contents/' + Data.GH_FILE, null, function(err, xhr) {
    var sha = null;
    if (xhr && xhr.status === 200) {
      try { sha = JSON.parse(xhr.responseText).sha; } catch (e) {}
    }
    var content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    var body = { message: '更新 ' + new Date().toISOString().slice(0, 16), content: content, branch: 'main' };
    if (sha) body.sha = sha;
    Data._ghRequest('PUT', 'contents/' + Data.GH_FILE, body, function() {});
  });
};

// ===== 上传照片到 GitHub =====

Data.uploadPhotoToGH = function(photoId, base64Data, callback) {
  if (!Data.isGHAvailable()) { if (callback) callback('no_config'); return; }
  var parts = base64Data.split(',');
  var mime = 'image/png';
  if (base64Data.indexOf('jpeg') > 0) mime = 'image/jpeg';
  if (base64Data.indexOf('webp') > 0) mime = 'image/webp';
  if (base64Data.indexOf('gif') > 0) mime = 'image/gif';
  var raw = parts.length > 1 ? parts[1] : base64Data;
  var ext = mime === 'image/png' ? 'png' : 'jpg';
  var path = 'data/photos/' + photoId + '.' + ext;
  Data._ghRequest('PUT', 'contents/' + path, {
    message: '上传照片 ' + photoId, content: raw, branch: 'main'
  }, function(err, xhr) {
    if (!err && xhr && xhr.status === 201) {
      var url = 'https://raw.githubusercontent.com/' + Data.GH_OWNER + '/' + Data.GH_REPO + '/main/' + path;
      if (callback) callback(null, url, path);
    } else {
      if (callback) callback('upload_fail');
    }
  });
};

Data.deletePhotoFromGH = function(path) {
  if (!Data.isGHAvailable()) return;
  Data._ghRequest('GET', 'contents/' + path, null, function(err, xhr) {
    if (!err && xhr && xhr.status === 200) {
      try {
        var resp = JSON.parse(xhr.responseText);
        Data._ghRequest('DELETE', 'contents/' + path, { message: '删除照片', sha: resp.sha, branch: 'main' }, function() {});
      } catch (e) {}
    }
  });
};

// ===== 工具函数 =====

Data.currentUser = function() { return Data.load().currentUser || 'default'; };
Data.getUser = function(uid) { var d = Data.load(); return d.users[uid] || d.users['default']; };
Data.getUserDisplay = function(uid) { var u = Data.getUser(uid); return u || { nickname: '?', avatar: '\u{1F600}', avatarType: 'emoji' }; };
Data.generateId = function() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); };
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
  limit = limit || 20; var d = Data.load(), acts = [];
  for (var k in (d.notes||{})) if (d.notes.hasOwnProperty(k)) { var n=d.notes[k]; acts.push({ type:'note',text:n.text,time:n.createdAt,userId:n.createdBy,id:k }); if (n.lastEditedAt && n.lastEditedAt!==n.createdAt) acts.push({ type:'edit',text:n.text,time:n.lastEditedAt,userId:n.lastEditedBy,id:k }); }
  for (var k2 in (d.todos||{})) if (d.todos.hasOwnProperty(k2)) { var t=d.todos[k2]; acts.push({ type:'todo',text:t.text,time:t.createdAt,userId:t.createdBy,id:k2 }); }
  for (var k3 in (d.countdowns||{})) if (d.countdowns.hasOwnProperty(k3)) { var c=d.countdowns[k3]; acts.push({ type:'countdown',text:c.name,time:c.createdAt,userId:c.createdBy,id:k3 }); }
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
        Data.save(imported);
        Toast.show('数据导入成功，页面即将刷新...','success');
        setTimeout(function() { App.init(); }, 500);
      } else { Toast.show('数据格式无效','error'); }
    } catch (err) { Toast.show('导入失败','error'); }
  };
  reader.readAsText(file); event.target.value='';
};
