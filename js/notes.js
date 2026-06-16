/* ========== Notes Module (ES5) ========== */

var Notes = {};

Notes.render = function() {
  var d = Data.load();
  var notes = d.notes || {};
  var search = document.getElementById('notes-search');
  var moodFilter = document.getElementById('notes-mood-filter');
  var searchText = search ? search.value.toLowerCase() : '';
  var filterMood = moodFilter ? moodFilter.value : 'all';

  var list = [];
  for (var key in notes) {
    if (notes.hasOwnProperty(key)) {
      var n = notes[key];
      if (searchText && n.text.toLowerCase().indexOf(searchText) === -1) continue;
      if (filterMood !== 'all' && n.mood !== filterMood) continue;
      n._id = key;
      list.push(n);
    }
  }

  list.sort(function(a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  var el = document.getElementById('notes-list');
  if (!el) return;

  el.innerHTML = '';
  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state">暂无碎碎念</div>';
    return;
  }

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var mood = Data.MOODS.find(function(m) { return m.id === item.mood; });
    var moodEmoji = mood ? mood.emoji : '';
    var moodLabel = mood ? mood.label : '';
    var creator = Data.getUserDisplay(item.createdBy);
    var editor = item.lastEditedBy ? Data.getUserDisplay(item.lastEditedBy) : null;
    var createdStr = item.createdAt.slice(0, 16).replace('T', ' ');
    var editedStr = item.lastEditedAt && item.lastEditedAt !== item.createdAt ? item.lastEditedAt.slice(0, 16).replace('T', ' ') : '';

    var html = '<div class="note-card">';
    if (moodEmoji) html += '<div class="note-mood" title="' + moodLabel + '">' + moodEmoji + '</div>';
    html += '<div class="note-text">' + Notes.escapeHtml(item.text) + '</div>';

    if (item.photo) {
      html += '<img class="note-photo" src="' + item.photo + '" onclick="PhotoViewer.open(this.src)">';
    }

    html += '<div class="note-meta">';
    html += '<div class="note-author">👤 ' + creator.nickname + ' · ' + createdStr;
    if (editedStr) {
      html += ' · ✏️ ' + (editor ? editor.nickname : '') + ' ' + editedStr;
    }
    html += '</div>';
    html += '<div class="note-actions">';
    html += '<button onclick="Notes.openEditModal(\'' + item._id + '\')">编辑</button>';
    html += '<button class="delete" onclick="Notes.deleteNote(\'' + item._id + '\')">删除</button>';
    html += '</div></div></div>';

    el.innerHTML += html;
  }
};

Notes.escapeHtml = function(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
};

Notes.openAddModal = function() {
  var moodOptions = '';
  for (var i = 0; i < Data.MOODS.length; i++) {
    var m = Data.MOODS[i];
    moodOptions += '<div class="mood-option" data-mood="' + m.id + '" onclick="Notes.selectMood(this, \'' + m.id + '\')">' + m.emoji + '</div>';
  }

  var html = '<h3>写碎碎念</h3>' +
    '<label>心情</label><div class="mood-selector" id="note-mood-selector">' + moodOptions + '</div>' +
    '<label>内容</label><textarea id="note-text-input" rows="4" placeholder="写点什么..."></textarea>' +
    '<label>照片（可选）</label>' +
    '<div class="photo-upload-area">' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'note-photo-input\').click()">📷 添加照片</button>' +
    '<input type="file" id="note-photo-input" accept="image/*" onchange="Notes.previewPhoto(event)">' +
    '<img id="note-photo-preview" class="photo-preview" style="display:none">' +
    '</div>' +
    '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Notes.saveNote()">保存</button></div>';

  Modal.open(html);
  Notes.selectedMood = '';
  Notes.selectedPhoto = '';
};

Notes.selectedMood = '';
Notes.selectedPhoto = '';

Notes.selectMood = function(el, moodId) {
  var selector = document.getElementById('note-mood-selector');
  if (!selector) return;
  var options = selector.querySelectorAll('.mood-option');
  for (var i = 0; i < options.length; i++) {
    options[i].className = 'mood-option';
  }
  el.className = 'mood-option selected';
  Notes.selectedMood = moodId;
};

Notes.previewPhoto = function(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('note-photo-preview');
    if (preview) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
    Notes.selectedPhoto = e.target.result;
  };
  reader.readAsDataURL(file);
};

Notes.saveNote = function() {
  var text = document.getElementById('note-text-input');
  if (!text || !text.value.trim()) {
    Toast.show('请输入内容', 'error');
    return;
  }
  if (!Notes.selectedMood) {
    Toast.show('请选择心情', 'error');
    return;
  }

  var d = Data.load();
  var notes = d.notes || {};
  var id = Data.generateId();
  var now = Data.now();
  notes[id] = {
    text: text.value.trim(),
    mood: Notes.selectedMood,
    photo: Notes.selectedPhoto || '',
    createdBy: d.currentUser,
    createdAt: now,
    lastEditedBy: d.currentUser,
    lastEditedAt: now
  };
  d.notes = notes;
  Data.save(d);
  Modal.close();
  Notes.render();
  Toast.show('碎碎念已保存', 'success');
};

Notes.openEditModal = function(id) {
  var d = Data.load();
  var notes = d.notes || {};
  var item = notes[id];
  if (!item) return;

  var moodOptions = '';
  for (var i = 0; i < Data.MOODS.length; i++) {
    var m = Data.MOODS[i];
    var selected = m.id === item.mood ? ' selected' : '';
    moodOptions += '<div class="mood-option' + selected + '" data-mood="' + m.id + '" onclick="Notes.selectMood(this, \'' + m.id + '\')">' + m.emoji + '</div>';
  }

  var photoHtml = '';
  if (item.photo) {
    photoHtml = '<img id="note-photo-preview" class="photo-preview" src="' + item.photo + '" style="display:block">';
  } else {
    photoHtml = '<img id="note-photo-preview" class="photo-preview" style="display:none">';
  }

  var html = '<h3>编辑碎碎念</h3>' +
    '<label>心情</label><div class="mood-selector" id="note-mood-selector">' + moodOptions + '</div>' +
    '<label>内容</label><textarea id="note-text-input" rows="4">' + Notes.escapeHtml(item.text) + '</textarea>' +
    '<label>照片（可选）</label>' +
    '<div class="photo-upload-area">' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'note-photo-input\').click()">📷 更换照片</button>' +
    '<input type="file" id="note-photo-input" accept="image/*" onchange="Notes.previewPhoto(event)">' +
    photoHtml +
    '</div>' +
    '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Notes.updateNote(\'' + id + '\')">保存</button></div>';

  Modal.open(html);
  Notes.selectedMood = item.mood;
  Notes.selectedPhoto = item.photo || '';
};

Notes.updateNote = function(id) {
  var text = document.getElementById('note-text-input');
  if (!text || !text.value.trim()) {
    Toast.show('请输入内容', 'error');
    return;
  }
  if (!Notes.selectedMood) {
    Toast.show('请选择心情', 'error');
    return;
  }

  var d = Data.load();
  var notes = d.notes || {};
  if (!notes[id]) return;
  notes[id].text = text.value.trim();
  notes[id].mood = Notes.selectedMood;
  notes[id].photo = Notes.selectedPhoto || '';
  notes[id].lastEditedBy = d.currentUser;
  notes[id].lastEditedAt = Data.now();
  d.notes = notes;
  Data.save(d);
  Modal.close();
  Notes.render();
  Toast.show('碎碎念已更新', 'success');
};

Notes.deleteNote = function(id) {
  Modal.confirm('确定要删除这条碎碎念吗？', function() {
    var d = Data.load();
    var notes = d.notes || {};
    if (notes[id]) {
      delete notes[id];
      d.notes = notes;
      Data.save(d);
      Notes.render();
      Toast.show('已删除', 'info');
    }
  });
};

// Initialize mood filter dropdown
Notes.init = function() {
  var select = document.getElementById('notes-mood-filter');
  if (!select) return;
  select.innerHTML = '<option value="all">全部情绪</option>';
  for (var i = 0; i < Data.MOODS.length; i++) {
    var opt = document.createElement('option');
    opt.value = Data.MOODS[i].id;
    opt.textContent = Data.MOODS[i].emoji + ' ' + Data.MOODS[i].label;
    select.appendChild(opt);
  }
  Notes.render();
};
