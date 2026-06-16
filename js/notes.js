/* ========== Notes Module (ES5) — 可点击详情 + 自由标签分类 ========== */

var Notes = {};

Notes.categories = [];

// 加载自定义分类
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
      if (searchText && n.text.toLowerCase().indexOf(searchText) === -1) continue;
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

    // 截断预览文字
    var previewText = Notes.escapeHtml(item.text);
    if (previewText.length > 60) {
      previewText = previewText.slice(0, 60) + '...';
    }

    var html = '<div class="note-card" onclick="Notes.openDetail(\'' + item._id + '\')">';
    if (catLabel) html += '<span class="note-cat-tag">' + catLabel + '</span>';
    html += '<div class="note-text">' + previewText + '</div>';

    if (item.photo) {
      html += '<img class="note-photo" src="' + item.photo + '" onclick="event.stopPropagation();PhotoViewer.open(this.src)">';
    }

    html += '<div class="note-meta">';
    html += '<div class="note-author">👤 ' + creator.nickname + ' · ' + createdStr;
    if (isEdited) {
      var editor = item.lastEditedBy ? Data.getUserDisplay(item.lastEditedBy) : null;
      var editStr = item.lastEditedAt.slice(0, 16).replace('T', ' ');
      html += ' · ✏️ ' + (editor ? editor.nickname : '') + ' ' + editStr;
    }
    html += '</div>';
    html += '<div class="note-actions">';
    html += '<button onclick="event.stopPropagation();Notes.openEditModal(\'' + item._id + '\')">编辑</button>';
    html += '<button class="delete" onclick="event.stopPropagation();Notes.deleteNote(\'' + item._id + '\')">删除</button>';
    html += '</div></div></div>';

    el.innerHTML += html;
  }
};

Notes.getCategory = function(catId) {
  if (!catId) return null;
  for (var i = 0; i < Notes.categories.length; i++) {
    if (Notes.categories[i].id === catId) return Notes.categories[i];
  }
  return null;
};

// ===== 点击查看详情 =====

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
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">';
  html += '<span class="note-cat-tag" style="font-size:13px;">' + catLabel + '</span>';
  html += '</div>';
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
  html += '<button class="btn btn-secondary" onclick="Notes.openEditModal(\'' + id + '\');Modal.close()">编辑</button>';
  html += '<button class="btn btn-secondary" onclick="Modal.close()">关闭</button>';
  html += '</div></div>';

  Modal.open(html);
};

// ===== 添加/编辑 =====

Notes.openAddModal = function() {
  Notes.loadCategories();
  var catOptions = Notes.buildCatOptions('');

  var html = '<h3>写碎碎念</h3>' +
    '<label>分类</label><div style="display:flex;gap:6px;flex-wrap:wrap;">' +
    '<select id="note-cat-select" style="flex:1;padding:9px 12px;background:rgba(0,0,0,0.35);border:1px solid rgba(139,108,207,0.2);border-radius:10px;color:#f0ecf8;font-size:13px;outline:none;">' + catOptions + '</select>' +
    '<button class="btn btn-secondary" style="padding:6px 10px;font-size:12px;" onclick="Notes.manageCategories()">管理</button>' +
    '</div>' +
    '<label>内容</label><textarea id="note-text-input" rows="6" placeholder="写点什么..." style="font-size:15px;line-height:1.6;"></textarea>' +
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
  Notes.selectedCategory = '';
  Notes.selectedPhoto = '';
};

Notes.selectedCategory = '';
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

  var catSelect = document.getElementById('note-cat-select');
  var category = catSelect ? catSelect.value : '';

  var d = Data.load();
  var notes = d.notes || {};
  var id = Data.generateId();
  var now = Data.now();
  notes[id] = {
    text: text.value.trim(),
    category: category,
    photo: Notes.selectedPhoto || '',
    createdBy: d.currentUser,
    createdAt: now,
    lastEditedBy: d.currentUser,
    lastEditedAt: now
  };
  d.notes = notes;
  Data.save(d);
  Modal.close();
  Notes.loadCategories();
  Notes.render();
  Toast.show('碎碎念已保存', 'success');
};

Notes.openEditModal = function(id) {
  var d = Data.load();
  var notes = d.notes || {};
  var item = notes[id];
  if (!item) return;

  Notes.loadCategories();
  var catOptions = Notes.buildCatOptions(item.category || '');

  var photoHtml = '';
  if (item.photo) {
    photoHtml = '<img id="note-photo-preview" class="photo-preview" src="' + item.photo + '" style="display:block">';
  } else {
    photoHtml = '<img id="note-photo-preview" class="photo-preview" style="display:none">';
  }

  var html = '<h3>编辑碎碎念</h3>' +
    '<label>分类</label><div style="display:flex;gap:6px;flex-wrap:wrap;">' +
    '<select id="note-cat-select" style="flex:1;padding:9px 12px;background:rgba(0,0,0,0.35);border:1px solid rgba(139,108,207,0.2);border-radius:10px;color:#f0ecf8;font-size:13px;outline:none;">' + catOptions + '</select>' +
    '<button class="btn btn-secondary" style="padding:6px 10px;font-size:12px;" onclick="Notes.manageCategories()">管理</button>' +
    '</div>' +
    '<label>内容</label><textarea id="note-text-input" rows="6" style="font-size:15px;line-height:1.6;">' + Notes.escapeHtml(item.text) + '</textarea>' +
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
  Notes.selectedCategory = item.category || '';
  Notes.selectedPhoto = item.photo || '';
};

Notes.updateNote = function(id) {
  var text = document.getElementById('note-text-input');
  if (!text || !text.value.trim()) {
    Toast.show('请输入内容', 'error');
    return;
  }

  var catSelect = document.getElementById('note-cat-select');
  var category = catSelect ? catSelect.value : '';

  var d = Data.load();
  var notes = d.notes || {};
  if (!notes[id]) return;
  notes[id].text = text.value.trim();
  notes[id].category = category;
  notes[id].photo = Notes.selectedPhoto || '';
  notes[id].lastEditedBy = d.currentUser;
  notes[id].lastEditedAt = Data.now();
  d.notes = notes;
  Data.save(d);
  Modal.close();
  Notes.loadCategories();
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

// ===== 分类管理 =====

Notes.manageCategories = function() {
  Notes.loadCategories();
  var listHtml = '';
  for (var i = 0; i < Notes.categories.length; i++) {
    listHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">';
    listHtml += '<span style="flex:1;font-size:14px;">' + Notes.categories[i].label + '</span>';
    listHtml += '<button class="btn btn-secondary" style="padding:3px 8px;font-size:11px;" onclick="Notes.deleteCategory(\'' + Notes.categories[i].id + '\')">删除</button>';
    listHtml += '</div>';
  }

  var html = '<h3>管理分类</h3>' +
    '<div style="margin-bottom:12px;">' + listHtml + '</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<input type="text" id="new-cat-name" placeholder="新分类名称" style="flex:1;padding:9px 12px;background:rgba(0,0,0,0.35);border:1px solid rgba(139,108,207,0.2);border-radius:10px;color:#f0ecf8;font-size:13px;outline:none;">' +
    '<button class="btn btn-primary" onclick="Notes.addCategory()">添加</button>' +
    '</div>' +
    '<div class="btn-row"><button class="btn btn-secondary" onclick="Modal.close()">完成</button></div>';

  Modal.open(html);
};

Notes.addCategory = function() {
  var input = document.getElementById('new-cat-name');
  if (!input || !input.value.trim()) {
    Toast.show('请输入分类名称', 'error');
    return;
  }
  Notes.loadCategories();
  var id = 'cat_' + Data.generateId();
  Notes.categories.push({ id: id, label: input.value.trim() });
  Notes.saveCategories();
  Notes.manageCategories(); // 刷新管理弹窗
  Toast.show('分类已添加', 'success');
};

Notes.deleteCategory = function(catId) {
  Notes.loadCategories();
  for (var i = 0; i < Notes.categories.length; i++) {
    if (Notes.categories[i].id === catId) {
      Notes.categories.splice(i, 1);
      break;
    }
  }
  Notes.saveCategories();
  Notes.manageCategories(); // 刷新管理弹窗
  Toast.show('已删除', 'info');
};

// ===== 初始化 =====

Notes.init = function() {
  Notes.loadCategories();
  // 填充分类筛选下拉
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
