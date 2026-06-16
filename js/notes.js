/* ========== Notes Module ========== */

var Notes = {};

Notes.categories = [];

Notes.loadCategories = function() {
  var d = Data.load();
  if (d.settings && d.settings.noteCategories && d.settings.noteCategories.length > 0) {
    Notes.categories = d.settings.noteCategories;
  } else {
    Notes.categories = [
      { id: 'life', label: '生活' },
      { id: 'work', label: '工作' },
      { id: 'study', label: '学习' },
      { id: 'travel', label: '旅行' },
      { id: 'other', label: '其他' }
    ];
  }
};

Notes.saveCategories = function() {
  var d = Data.load();
  if (!d.settings) d.settings = {};
  d.settings.noteCategories = Notes.categories;
  Data.save(d);
};

Notes.render = function() {
  var d = Data.load();
  var notes = d.notes || {};
  var search = document.getElementById('notes-search');
  var catFilter = document.getElementById('notes-cat-filter');
  var searchText = search ? search.value.toLowerCase() : '';
  var filterCat = catFilter ? catFilter.value : 'all';

  Notes.loadCategories();

  var list = [];
  for (var key in notes) {
    if (notes.hasOwnProperty(key)) {
      var n = notes[key];
      n._id = key;
      if (searchText && n.text && n.text.toLowerCase().indexOf(searchText) === -1) continue;
      if (filterCat !== 'all' && n.category !== filterCat) continue;
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
    var cat = Notes.getCategory(item.category);
    var catLabel = cat ? cat.label : '';
    var creator = Data.getUserDisplay(item.createdBy);
    var createdStr = item.createdAt.slice(0, 16).replace('T', ' ');
    var isEdited = item.lastEditedAt && item.lastEditedAt !== item.createdAt;

    var previewText = Notes.escapeHtml(item.text);
    if (previewText.length > 60) previewText = previewText.slice(0, 60) + '...';

    var cardHtml = '<div class="note-card" onclick="Notes.openDetail(\'' + item._id + '\')">';
    if (catLabel) cardHtml += '<span class="note-cat-tag">' + catLabel + '</span>';
    cardHtml += '<div class="note-text">' + previewText + '</div>';
    if (item.photo) {
      cardHtml += '<img class="note-photo" src="' + item.photo + '" onclick="event.stopPropagation();PhotoViewer.open(this.src)">';
    }
    cardHtml += '<div class="note-meta"><div class="note-author">👤 ' + creator.nickname + ' · ' + createdStr;
    if (isEdited) {
      var editor = item.lastEditedBy ? Data.getUserDisplay(item.lastEditedBy) : null;
      var editStr = item.lastEditedAt.slice(0, 16).replace('T', ' ');
      cardHtml += ' · ✏️ ' + (editor ? editor.nickname : '') + ' ' + editStr;
    }
    cardHtml += '</div><div class="note-actions">';
    cardHtml += '<button onclick="event.stopPropagation();Notes.openEditModal(\'' + item._id + '\')">编辑</button>';
    cardHtml += '<button class="delete" onclick="event.stopPropagation();Notes.deleteNote(\'' + item._id + '\')">删除</button>';
    cardHtml += '</div></div></div>';

    el.innerHTML += cardHtml;
  }
};

Notes.getCategory = function(catId) {
  if (!catId) return null;
  for (var i = 0; i < Notes.categories.length; i++) {
    if (Notes.categories[i].id === catId) return Notes.categories[i];
  }
  return null;
};

Notes.escapeHtml = function(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
};

// ===== 详情弹窗 =====

Notes.openDetail = function(id) {
  var d = Data.load();
  var notes = d.notes || {};
  var item = notes[id];
  if (!item) return;

  var cat = Notes.getCategory(item.category);
  var catLabel = cat ? cat.label : '未分类';
  var creator = Data.getUserDisplay(item.createdBy);
  var createdStr = item.createdAt.slice(0, 16).replace('T', ' ');
  var isEdited = item.lastEditedAt && item.lastEditedAt !== item.createdAt;

  var html = '<div class="note-detail-modal">';
  html += '<span class="note-cat-tag" style="font-size:13px;display:inline-block;margin-bottom:12px;">' + catLabel + '</span>';
  html += '<div style="font-size:15px;line-height:1.8;color:var(--text-primary);white-space:pre-wrap;word-wrap:break-word;max-height:300px;overflow-y:auto;">' + Notes.escapeHtml(item.text) + '</div>';
  if (item.photo) {
    html += '<img class="note-photo" src="' + item.photo + '" style="max-width:100%;max-height:300px;margin-top:12px;border-radius:10px;cursor:pointer" onclick="PhotoViewer.open(\'' + item.photo + '\')">';
  }
  html += '<div style="margin-top:14px;font-size:11px;color:var(--text-secondary);border-top:1px solid var(--border-color);padding-top:10px;">';
  html += '👤 ' + creator.nickname + ' · ' + createdStr;
  if (isEdited) {
    var editor = item.lastEditedBy ? Data.getUserDisplay(item.lastEditedBy) : null;
    var editStr = item.lastEditedAt.slice(0, 16).replace('T', ' ');
    html += ' · ✏️ ' + (editor ? editor.nickname : '') + ' ' + editStr;
  }
  html += '</div>';
  html += '<div class="btn-row" style="margin-top:16px;">';
  html += '<button class="btn btn-secondary" onclick="Notes.openEditModal(\'' + id + '\');setTimeout(function(){Modal.close()},50)">编辑</button>';
  html += '<button class="btn btn-secondary" onclick="Modal.close()">关闭</button>';
  html += '</div></div>';
  Modal.open(html);
};

// ===== 添加 =====

Notes.openAddModal = function() {
  Notes.loadCategories();
  var catOptions = Notes.buildCatOptions('');
  var now = new Date();
  var defaultDate = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  var defaultTime = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  var html = '<h3>写碎碎念</h3>' +
    '<label>日期</label><input type="text" id="note-date-display" value="' + defaultDate + '" readonly style="width:100%;padding:9px 12px;background:rgba(0,0,0,0.2);border:1px solid rgba(139,108,207,0.15);border-radius:10px;color:var(--text-secondary);font-size:13px;outline:none;font-family:inherit;">' +
    '<label>时间（可选）</label><input type="text" id="note-time-display" value="' + defaultTime + '" readonly style="width:100%;padding:9px 12px;background:rgba(0,0,0,0.2);border:1px solid rgba(139,108,207,0.15);border-radius:10px;color:var(--text-secondary);font-size:13px;outline:none;font-family:inherit;">' +
    '<label>分类</label><div style="display:flex;gap:6px;flex-wrap:wrap;">' +
    '<select id="note-cat-select" style="flex:1;padding:9px 12px;background:rgba(0,0,0,0.35);border:1px solid rgba(139,108,207,0.2);border-radius:10px;color:#f0ecf8;font-size:13px;outline:none;">' + catOptions + '</select>' +
    '<button class="btn btn-secondary" style="padding:6px 10px;font-size:12px;" onclick="Notes.manageCategories()">管理</button></div>' +
    '<label>内容</label><textarea id="note-text-input" rows="6" placeholder="写点什么..." style="width:100%;font-size:15px;line-height:1.6;padding:11px 14px;background:rgba(0,0,0,0.35);border:1px solid rgba(139,108,207,0.2);border-radius:10px;color:#f0ecf8;outline:none;font-family:inherit;resize:vertical;"></textarea>' +
    '<label>照片（可选）</label><div class="photo-upload-area">' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'note-photo-input\').click()">📷 添加照片</button>' +
    '<input type="file" id="note-photo-input" accept="image/*" onchange="Notes.previewPhoto(event)">' +
    '<img id="note-photo-preview" class="photo-preview" style="display:none"></div>' +
    '<div class="btn-row"><button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Notes.saveNote()">保存</button></div>';

  Modal.open(html);
  Notes.selectedPhoto = '';
};

Notes.selectedPhoto = '';

Notes.buildCatOptions = function(selectedId) {
  var opts = '<option value="">未分类</option>';
  for (var i = 0; i < Notes.categories.length; i++) {
    var sel = Notes.categories[i].id === selectedId ? ' selected' : '';
    opts += '<option value="' + Notes.categories[i].id + '"' + sel + '>' + Notes.categories[i].label + '</option>';
  }
  return opts;
};

Notes.previewPhoto = function(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('note-photo-preview');
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    Notes.selectedPhoto = e.target.result;
  };
  reader.readAsDataURL(file);
};

Notes.saveNote = function() {
  var text = document.getElementById('note-text-input');
  if (!text || !text.value.trim()) { Toast.show('请输入内容', 'error'); return; }

  var now = new Date();
  var dateVal = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  var timeVal = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  var catSelect = document.getElementById('note-cat-select');
  var category = catSelect ? catSelect.value : '';

  var d = Data.load();
  var notes = d.notes || {};
  var id = Data.generateId();
  // 用用户选择的日期时间替代自动的 now
  var chosenAt = dateVal + 'T' + timeVal + ':00';

  notes[id] = {
    text: text.value.trim(),
    category: category,
    photo: Notes.selectedPhoto || '',
    createdBy: d.currentUser,
    createdAt: chosenAt,
    lastEditedBy: d.currentUser,
    lastEditedAt: chosenAt
  };
  d.notes = notes;
  Data.save(d);
  Modal.close();
  Notes.render();
  Toast.show('碎碎念已保存', 'success');
};

// ===== 编辑 =====

Notes.openEditModal = function(id) {
  var d = Data.load();
  var notes = d.notes || {};
  var item = notes[id];
  if (!item) return;

  Notes.loadCategories();
  var catOptions = Notes.buildCatOptions(item.category || '');

  // 从 createdAt 解析日期和时间
  var dt = item.createdAt ? item.createdAt.replace('T', ' ') : '';
  var dateVal = dt.slice(0, 10);
  var timeVal = dt.slice(11, 16);

  var photoHtml = item.photo ? '<img id="note-photo-preview" class="photo-preview" src="' + item.photo + '" style="display:block">' : '<img id="note-photo-preview" class="photo-preview" style="display:none">';

  var html = '<h3>编辑碎碎念</h3>' +
    '<label>日期</label><input type="text" id="note-date-display" value="' + dateVal + '" readonly style="width:100%;padding:9px 12px;background:rgba(0,0,0,0.2);border:1px solid rgba(139,108,207,0.15);border-radius:10px;color:var(--text-secondary);font-size:13px;outline:none;font-family:inherit;">' +
    '<label>时间（可选）</label><input type="text" id="note-time-display" value="' + timeVal + '" readonly style="width:100%;padding:9px 12px;background:rgba(0,0,0,0.2);border:1px solid rgba(139,108,207,0.15);border-radius:10px;color:var(--text-secondary);font-size:13px;outline:none;font-family:inherit;">' +
    '<label>分类</label><div style="display:flex;gap:6px;flex-wrap:wrap;">' +
    '<select id="note-cat-select" style="flex:1;padding:9px 12px;background:rgba(0,0,0,0.35);border:1px solid rgba(139,108,207,0.2);border-radius:10px;color:#f0ecf8;font-size:13px;outline:none;">' + catOptions + '</select>' +
    '<button class="btn btn-secondary" style="padding:6px 10px;font-size:12px;" onclick="Notes.manageCategories()">管理</button></div>' +
    '<label>内容</label><textarea id="note-text-input" rows="6" style="width:100%;font-size:15px;line-height:1.6;padding:11px 14px;background:rgba(0,0,0,0.35);border:1px solid rgba(139,108,207,0.2);border-radius:10px;color:#f0ecf8;outline:none;font-family:inherit;resize:vertical;">' + Notes.escapeHtml(item.text) + '</textarea>' +
    '<label>照片（可选）</label><div class="photo-upload-area">' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'note-photo-input\').click()">📷 更换照片</button>' +
    '<input type="file" id="note-photo-input" accept="image/*" onchange="Notes.previewPhoto(event)">' +
    photoHtml + '</div>' +
    '<div class="btn-row"><button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Notes.updateNote(\'' + id + '\')">保存</button></div>';

  Modal.open(html);
  Notes.selectedPhoto = item.photo || '';
};

Notes.updateNote = function(id) {
  var text = document.getElementById('note-text-input');
  if (!text || !text.value.trim()) { Toast.show('请输入内容', 'error'); return; }

  var catSelect = document.getElementById('note-cat-select');
  var category = catSelect ? catSelect.value : '';

  var d = Data.load();
  var notes = d.notes || {};
  if (!notes[id]) return;
  notes[id].text = text.value.trim();
  notes[id].category = category;
  notes[id].photo = Notes.selectedPhoto || '';
  // 保留创建时间，只更新编辑信息
  notes[id].lastEditedBy = d.currentUser;
  notes[id].lastEditedAt = Data.now();
  d.notes = notes;
  Data.save(d);
  Modal.close();
  Notes.render();
  Toast.show('碎碎念已更新', 'success');
};

// ===== 删除 =====

Notes.deleteNote = function(id) {
  Modal.confirm('确定要删除这条碎碎念吗？', function() {
    var d = Data.load();
    var notes = d.notes || {};
    if (notes[id]) { delete notes[id]; d.notes = notes; Data.save(d); Notes.render(); Toast.show('已删除', 'info'); }
  });
};

// ===== 分类管理 =====

Notes.manageCategories = function() {
  Notes.loadCategories();
  var listHtml = '';
  for (var i = 0; i < Notes.categories.length; i++) {
    listHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">' +
      '<span style="flex:1;font-size:14px;">' + Notes.categories[i].label + '</span>' +
      '<button class="btn btn-secondary" style="padding:3px 8px;font-size:11px;" onclick="Notes.deleteCategory(\'' + Notes.categories[i].id + '\')">删除</button></div>';
  }
  var html = '<h3>管理分类</h3><div style="margin-bottom:12px;">' + listHtml + '</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<input type="text" id="new-cat-name" placeholder="新分类名称" style="flex:1;padding:9px 12px;background:rgba(0,0,0,0.35);border:1px solid rgba(139,108,207,0.2);border-radius:10px;color:#f0ecf8;font-size:13px;outline:none;">' +
    '<button class="btn btn-primary" onclick="Notes.addCategory()">添加</button></div>' +
    '<div class="btn-row"><button class="btn btn-secondary" onclick="Modal.close()">完成</button></div>';
  Modal.open(html);
};

Notes.addCategory = function() {
  var input = document.getElementById('new-cat-name');
  if (!input || !input.value.trim()) { Toast.show('请输入分类名称', 'error'); return; }
  Notes.loadCategories();
  Notes.categories.push({ id: 'cat_' + Data.generateId(), label: input.value.trim() });
  Notes.saveCategories();
  Notes.manageCategories();
  Toast.show('分类已添加', 'success');
};

Notes.deleteCategory = function(catId) {
  Notes.loadCategories();
  for (var i = 0; i < Notes.categories.length; i++) {
    if (Notes.categories[i].id === catId) { Notes.categories.splice(i, 1); break; }
  }
  Notes.saveCategories();
  Notes.manageCategories();
  Toast.show('已删除', 'info');
};

// ===== 初始化 =====

Notes.init = function() {
  Notes.loadCategories();
  var select = document.getElementById('notes-cat-filter');
  if (select) {
    select.innerHTML = '<option value="all">全部分类</option>';
    for (var i = 0; i < Notes.categories.length; i++) {
      var opt = document.createElement('option');
      opt.value = Notes.categories[i].id;
      opt.textContent = Notes.categories[i].label;
      select.appendChild(opt);
    }
  }
  Notes.render();
};
