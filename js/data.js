/* ========== Data Layer (ES5) — IndexedDB ========== */

var Data = {};

Data.STORAGE_KEY = 'my_homepage_data';
Data.DB_NAME = 'MyHomepageDB';
Data.DB_VERSION = 1;
Data.STORE_NAME = 'main';
Data.db = null;
Data.cache = null; // in-memory cache for fast reads

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

// ---- Theme Definitions ----
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

// ---- Default Emojis ----
Data.DEFAULT_AVATARS = ['\u{1F600}', '\u{1F60E}', '\u{1F60A}', '\u{1F60B}', '\u{1F60C}', '\u{1F60D}', '\u{1F61C}', '\u{1F60F}', '\u{1F636}', '\u{1F92A}', '\u{1F600}'];

// ---- Default Data ----
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
      blur: true,
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

// ---- Open IndexedDB ----
Data.openDB = function(callback) {
  if (Data.db) {
    if (callback) callback(Data.db);
    return;
  }
  var request = indexedDB.open(Data.DB_NAME, Data.DB_VERSION);
  request.onupgradeneeded = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains(Data.STORE_NAME)) {
      db.createObjectStore(Data.STORE_NAME, { keyPath: 'key' });
    }
  };
  request.onsuccess = function(e) {
    Data.db = e.target.result;
    if (callback) callback(Data.db);
  };
  request.onerror = function() {
    // Fallback to localStorage if IndexedDB fails
    Data.fallbackMode = true;
    if (callback) callback(null);
  };
};

Data.fallbackMode = false;

// ---- Load ----
Data.load = function() {
  if (Data.cache) return Data.cache;
  var raw = localStorage.getItem(Data.STORAGE_KEY);
  if (raw) {
    try {
      Data.cache = JSON.parse(raw);
      Data.fallbackMode = true;
      return Data.cache;
    } catch (e) {}
  }
  Data.cache = Data.getDefaultData();
  // Try IndexedDB
  var syncData = null;
  var xhr = indexedDB.open(Data.DB_NAME);
  xhr.onsuccess = function(e) {
    var db = e.target.result;
    if (db.objectStoreNames.contains(Data.STORE_NAME)) {
      var tx = db.transaction(Data.STORE_NAME, 'readonly');
      var store = tx.objectStore(Data.STORE_NAME);
      var getReq = store.get('appData');
      getReq.onsuccess = function() {
        if (getReq.result) {
          Data.cache = getReq.result.data;
          Data.fallbackMode = false;
        }
      };
    }
  };
  return Data.cache;
};

// ---- Save ----
Data.save = function(data) {
  Data.cache = data;
  // Always save to IndexedDB (async, best effort)
  Data.saveAsync(data);
  // Also keep localStorage as fallback (synchronous)
  try {
    localStorage.setItem(Data.STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage might be full — that's OK, IndexedDB is primary
  }
};

Data.saveAsync = function(data) {
  Data.openDB(function(db) {
    if (!db) return;
    try {
      var tx = db.transaction(Data.STORE_NAME, 'readwrite');
      var store = tx.objectStore(Data.STORE_NAME);
      store.put({ key: 'appData', data: data });
    } catch (e) {}
  });
};

// ---- Sync load from IndexedDB (called on boot) ----
Data.syncFromDB = function(callback) {
  Data.openDB(function(db) {
    if (!db) {
      // Already have data from localStorage fallback
      if (callback) callback(Data.cache);
      return;
    }
    try {
      var tx = db.transaction(Data.STORE_NAME, 'readonly');
      var store = tx.objectStore(Data.STORE_NAME);
      var req = store.get('appData');
      req.onsuccess = function() {
        if (req.result) {
          Data.cache = req.result.data;
          Data.fallbackMode = false;
        } else if (!Data.cache) {
          Data.cache = Data.getDefaultData();
        }
        if (callback) callback(Data.cache);
      };
      req.onerror = function() {
        if (callback) callback(Data.cache);
      };
    } catch (e) {
      if (callback) callback(Data.cache);
    }
  });
};

// ---- Helpers ----
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

// ---- Get Data for Today ----
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
      if (n.createdAt && n.createdAt.indexOf(dateStr) === 0) {
        notes.push(n);
      }
    }
  }

  var todos = [];
  var dTodos = d.todos || {};
  for (var key2 in dTodos) {
    if (dTodos.hasOwnProperty(key2)) {
      var t = dTodos[key2];
      if (t.date === dateStr) {
        todos.push(t);
      }
    }
  }

  return { notes: notes, todos: todos };
};

// ---- Activity Feed ----
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

// ---- Export ----
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

// ---- Import ----
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
        Toast.show('数据导入成功', 'success');
        App.init();
      } else {
        Toast.show('数据格式无效', 'error');
      }
    } catch (err) {
      Toast.show('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
};

// ---- Clear ----
Data.clearAll = function() {
  if (confirm('确定要清除所有数据吗？这个操作不可撤销。')) {
    Data.cache = null;
    localStorage.removeItem(Data.STORAGE_KEY);
    Data.openDB(function(db) {
      if (db) {
        try {
          var tx = db.transaction(Data.STORE_NAME, 'readwrite');
          var store = tx.objectStore(Data.STORE_NAME);
          store.clear();
        } catch (e) {}
      }
    });
    Toast.show('数据已清除', 'info');
    App.init();
  }
};
