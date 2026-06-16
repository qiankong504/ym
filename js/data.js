/* ========== Data Layer — GitHub + IndexedDB 混合 ==========
   所有人共享同一份数据，存储在仓库的 data/data.json
   IndexedDB 作为本地缓存加速读取
   上传照片存为 data/photos/{id}.jpg，通过 GitHub API 写入
   需要设置页中填入 GitHub Token
*/

var Data = {};

Data.GITHUB_OWNER = '';
Data.GITHUB_REPO = '';
Data.GITHUB_TOKEN = '';
Data.GITHUB_BRANCH = 'main';
Data.DATA_FILE = 'data/data.json';

Data.cache = null;
Data.initialized = false;
Data.onReady = [];

// ---- Mood Options ----
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
        id: 'default',
        nickname: '我',
        avatar: '\u{1F60A}',
        avatarType: 'emoji',
        createdAt: new Date().toISOString()
      }
    },
    currentUser: 'default',
    theme: 'midnight',
    settings: {
      autoPlay: false,
      cardOpacity: 80,
      cardFrost: 60,
      backgroundPhotos: [],
      activeBackground: ''
    },
    notes: {},
    todos: {},
    countdowns: {},
    music: []
  };
};

// ===== GitHub API =====

Data.setGitHubConfig = function(owner, repo, token) {
  Data.GITHUB_OWNER = owner;
  Data.GITHUB_REPO = repo;
  Data.GITHUB_TOKEN = token;
  // Save to localStorage so it persists
  try {
    localStorage.setItem('gh_config', JSON.stringify({ owner: owner, repo: repo, token: token }));
  } catch (e) {}
};

Data.getGitHubConfig = function() {
  if (Data.GITHUB_OWNER) {
    return { owner: Data.GITHUB_OWNER, repo: Data.GITHUB_REPO, token: Data.GITHUB_TOKEN };
  }
  try {
    var raw = localStorage.getItem('gh_config');
    if (raw) {
      var cfg = JSON.parse(raw);
      Data.GITHUB_OWNER = cfg.owner;
      Data.GITHUB_REPO = cfg.repo;
      Data.GITHUB_TOKEN = cfg.token;
      return cfg;
    }
  } catch (e) {}
  return null;
};

Data.isGitHubConfigured = function() {
  return !!(Data.GITHUB_OWNER && Data.GITHUB_REPO && Data.GITHUB_TOKEN);
};

Data.githubApi = function(method, endpoint, body, callback) {
  var cfg = Data.getGitHubConfig();
  if (!cfg) { if (callback) callback('未配置 GitHub Token'); return; }
  var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/' + endpoint;
  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + cfg.token);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  if (body) {
    xhr.setRequestHeader('Content-Type', 'application/json');
  }
  xhr.onload = function() {
    if (callback) callback(null, xhr);
  };
  xhr.onerror = function() {
    if (callback) callback('网络错误');
  };
  xhr.send(body ? JSON.stringify(body) : null);
};

// ===== Read data from GitHub =====

Data.fetchFromGitHub = function(callback) {
  Data.githubApi('GET', 'contents/' + Data.DATA_FILE, null, function(err, xhr) {
    if (err || xhr.status === 404) {
      // File doesn't exist yet — start fresh
      Data.cache = Data.getDefaultData();
      if (callback) callback(Data.cache);
      return;
    }
    if (xhr.status === 200) {
      try {
        var resp = JSON.parse(xhr.responseText);
        var content = atob(resp.content);
        Data.cache = JSON.parse(content);
        // Cache sha for later updates
        Data.fileSha = resp.sha;
        if (callback) callback(Data.cache);
      } catch (e) {
        Data.cache = Data.getDefaultData();
        if (callback) callback(Data.cache);
      }
    } else {
      Data.cache = Data.getDefaultData();
      if (callback) callback(Data.cache);
    }
  });
};

Data.fileSha = null; // SHA of current data file on GitHub, needed for updates

// ===== Write data to GitHub =====

Data.saveToGitHub = function(data, callback) {
  Data.cache = data;
  var content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  var body = {
    message: '更新数据 ' + new Date().toISOString().slice(0, 16),
    content: content,
    branch: 'main'
  };
  if (Data.fileSha) body.sha = Data.fileSha;

  Data.githubApi('PUT', 'contents/' + Data.DATA_FILE, body, function(err, xhr) {
    if (xhr && xhr.status === 201) {
      // Update sha from response
      try {
        var resp = JSON.parse(xhr.responseText);
        Data.fileSha = resp.content.sha;
      } catch (e) {}
      if (callback) callback(null);
    } else if (xhr && xhr.status === 422) {
      // sha mismatch — re-fetch and retry once
      Data.fetchFromGitHub(function() {
        Data.saveToGitHub(data, callback);
      });
    } else {
      if (callback) callback('保存失败: ' + (xhr ? xhr.statusText : ''));
    }
  });
};

// ===== Upload photo file to GitHub =====

Data.uploadPhotoToGitHub = function(photoId, base64Data, callback) {
  // Strip data:image/...;base64, prefix
  var parts = base64Data.split(',');
  var mimeType = 'image/png';
  if (base64Data.indexOf('image/jpeg') > 0) mimeType = 'image/jpeg';
  if (base64Data.indexOf('image/webp') > 0) mimeType = 'image/webp';
  if (base64Data.indexOf('image/gif') > 0) mimeType = 'image/gif';
  var rawData = parts.length > 1 ? parts[1] : base64Data;

  var path = 'data/photos/' + photoId + '.' + (mimeType === 'image/png' ? 'png' : 'jpg');
  var body = {
    message: '上传照片 ' + photoId,
    content: rawData,
    branch: 'main'
  };
  Data.githubApi('PUT', 'contents/' + path, body, function(err, xhr) {
    if (xhr && xhr.status === 201) {
      // Return the raw GitHub URL
      var url = 'https://raw.githubusercontent.com/' + Data.GITHUB_OWNER + '/' + Data.GITHUB_REPO + '/main/' + path;
      if (callback) callback(null, url, path);
    } else {
      if (callback) callback('上传失败');
    }
  });
};

Data.deletePhotoFromGitHub = function(path, callback) {
  Data.githubApi('GET', 'contents/' + path, null, function(err, xhr) {
    if (xhr && xhr.status === 200) {
      try {
        var resp = JSON.parse(xhr.responseText);
        var body = { message: '删除照片', sha: resp.sha, branch: 'main' };
        Data.githubApi('DELETE', 'contents/' + path, body, function(err2, xhr2) {
          if (callback) callback(err2);
        });
      } catch (e) { if (callback) callback('解析错误'); }
    } else { if (callback) callback('未找到文件'); }
  });
};

// ===== load / save — to be called after GitHub sync =====

Data.load = function() {
  return Data.cache || Data.getDefaultData();
};

Data.save = function(data) {
  Data.cache = data;
  // Sync to GitHub in background
  Data.saveToGitHub(data);
};

// ===== Ready system: wait for GitHub data before booting =====

Data.ready = function(callback) {
  if (Data.initialized) {
    callback(Data.cache);
    return;
  }
  Data.onReady.push(callback);
  if (!Data.initialized) {
    Data.initialized = true;
    Data.init();
  }
};

Data.init = function() {
  Data.fetchFromGitHub(function(data) {
    Data.cache = data;
    var onReady = Data.onReady;
    Data.onReady = [];
    for (var i = 0; i < onReady.length; i++) {
      onReady[i](data);
    }
  });
};

// ===== Utility =====

Data.currentUser = function() {
  var d = Data.load();
  return d.currentUser || 'default';
};

Data.getUser = function(userId) {
  var d = Data.load();
  return d.users[userId] || d.users['default'];
};

Data.getUserDisplay = function(userId) {
  var u = Data.getUser(userId);
  if (!u) return { nickname: '?', avatar: '\u{1F600}', avatarType: 'emoji' };
  return u;
};

Data.generateId = function() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
};

Data.now = function() {
  return new Date().toISOString();
};

Data.getToday = function() {
  var d = Data.load();
  var today = new Date();
  var y = today.getFullYear();
  var m = String(today.getMonth() + 1).padStart(2, '0');
  var day = String(today.getDate()).padStart(2, '0');
  var dateStr = y + '-' + m + '-' + day;
  var notes = [];
  var dNotes = d.notes || {};
  for (var key in dNotes) {
    if (dNotes.hasOwnProperty(key)) {
      var n = dNotes[key];
      if (n.createdAt && n.createdAt.indexOf(dateStr) === 0) notes.push(n);
    }
  }
  var todos = [];
  var dTodos = d.todos || {};
  for (var key2 in dTodos) {
    if (dTodos.hasOwnProperty(key2)) {
      var t = dTodos[key2];
      if (t.date === dateStr) todos.push(t);
    }
  }
  return { notes: notes, todos: todos };
};

Data.getActivity = function(limit) {
  limit = limit || 20;
  var d = Data.load();
  var activities = [];
  var dNotes = d.notes || {};
  for (var key in dNotes) {
    if (dNotes.hasOwnProperty(key)) {
      var n = dNotes[key];
      activities.push({ type: 'note', text: n.text, time: n.createdAt, userId: n.createdBy, id: key });
      if (n.lastEditedAt && n.lastEditedAt !== n.createdAt) {
        activities.push({ type: 'edit', text: n.text, time: n.lastEditedAt, userId: n.lastEditedBy, id: key });
      }
    }
  }
  var dTodos = d.todos || {};
  for (var key2 in dTodos) {
    if (dTodos.hasOwnProperty(key2)) {
      var t = dTodos[key2];
      activities.push({ type: 'todo', text: t.text, time: t.createdAt, userId: t.createdBy, id: key2 });
    }
  }
  var dCount = d.countdowns || {};
  for (var key3 in dCount) {
    if (dCount.hasOwnProperty(key3)) {
      var c = dCount[key3];
      activities.push({ type: 'countdown', text: c.name, time: c.createdAt, userId: c.createdBy, id: key3 });
    }
  }
  activities.sort(function(a, b) { return b.time.localeCompare(a.time); });
  return activities.slice(0, limit);
};

Data.exportData = function() {
  var d = Data.load();
  var blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'my_homepage_data_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  Toast.show('数据导出成功', 'success');
};

Data.importData = function(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      if (imported.users && imported.notes !== undefined) {
        Data.cache = imported;
        Data.save(imported);
        Toast.show('数据导入成功，正在同步到 GitHub...', 'success');
        App.init();
      } else {
        Toast.show('数据格式无效', 'error');
      }
    } catch (err) {
      Toast.show('导入失败', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
};
