/* ========== Calendar (ES5) ========== */

var Calendar = {};

Calendar.currentYear = 0;
Calendar.currentMonth = 0;
Calendar.selectedDate = '';

Calendar.init = function() {
  var now = new Date();
  Calendar.currentYear = now.getFullYear();
  Calendar.currentMonth = now.getMonth();
  Calendar.render();
};

// Helper: ensure todo has an _id for reference
Calendar.ensureTodoId = function(todo, key) {
  if (!todo._id) {
    todo._id = key;
  }
  return todo._id;
};

Calendar.render = function() {
  var el = document.getElementById('calendar-widget');
  if (!el) return;

  var d = Data.load();
  var notes = d.notes || {};
  var todos = d.todos || {};

  // Build date sets for dots
  var noteDates = {};
  for (var key in notes) {
    if (notes.hasOwnProperty(key)) {
      var nd = notes[key].createdAt.slice(0, 10);
      noteDates[nd] = true;
    }
  }
  var todoDates = {};
  for (var key2 in todos) {
    if (todos.hasOwnProperty(key2)) {
      var td = todos[key2].date;
      if (td) todoDates[td] = true;
    }
  }

  var y = Calendar.currentYear;
  var m = Calendar.currentMonth;
  var firstDay = new Date(y, m, 1).getDay();
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var daysInPrev = new Date(y, m, 0).getDate();

  var monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  var weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

  var html = '';
  html += '<div class="cal-header">';
  html += '<button class="cal-nav-btn" onclick="Calendar.prevMonth()">‹</button>';
  html += '<h3>' + y + '年 ' + monthNames[m] + '</h3>';
  html += '<button class="cal-nav-btn" onclick="Calendar.nextMonth()">›</button>';
  html += '</div>';

  html += '<div class="cal-weekdays">';
  for (var w = 0; w < 7; w++) {
    html += '<div>' + weekdayNames[w] + '</div>';
  }
  html += '</div>';

  html += '<div class="cal-days">';

  // Previous month days
  var start = (firstDay === 0) ? 6 : firstDay - 1;
  for (var i = start - 1; i >= 0; i--) {
    html += '<div class="cal-day other-month">' + (daysInPrev - i) + '</div>';
  }

  // Current month days
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var classes = 'cal-day';
    if (dateStr === todayStr) classes += ' today';
    if (dateStr === Calendar.selectedDate) classes += ' selected';
    if (noteDates[dateStr]) classes += ' has-note';
    if (todoDates[dateStr]) classes += ' has-todo';
    html += '<div class="' + classes + '" onclick="Calendar.selectDay(\'' + dateStr + '\')">' + d + '</div>';
  }

  // Next month days
  var totalCells = start + daysInMonth;
  var remaining = (7 - totalCells % 7) % 7;
  for (var j = 1; j <= remaining; j++) {
    html += '<div class="cal-day other-month">' + j + '</div>';
  }

  html += '</div>';

  el.innerHTML = html;

  // Update detail for selected date
  if (Calendar.selectedDate) {
    Calendar.showDetail(Calendar.selectedDate);
  }
};

Calendar.prevMonth = function() {
  Calendar.currentMonth--;
  if (Calendar.currentMonth < 0) {
    Calendar.currentMonth = 11;
    Calendar.currentYear--;
  }
  Calendar.render();
};

Calendar.nextMonth = function() {
  Calendar.currentMonth++;
  if (Calendar.currentMonth > 11) {
    Calendar.currentMonth = 0;
    Calendar.currentYear++;
  }
  Calendar.render();
};

Calendar.selectDay = function(dateStr) {
  Calendar.selectedDate = dateStr;
  Calendar.showDetail(dateStr);
  Calendar.render();
};

Calendar.showDetail = function(dateStr) {
  var d = Data.load();
  var notes = d.notes || {};
  var todos = d.todos || {};

  var dayNotes = [];
  var dayTodos = [];

  for (var key in notes) {
    if (notes.hasOwnProperty(key)) {
      var n = notes[key];
      if (n.createdAt && n.createdAt.slice(0, 10) === dateStr) {
        n._key = key;
        dayNotes.push(n);
      }
    }
  }

  for (var key2 in todos) {
    if (todos.hasOwnProperty(key2)) {
      var t = todos[key2];
      if (t.date === dateStr) {
        t._key = key2;
        // Ensure _id exists for reliable references
        if (!t._id) t._id = key2;
        dayTodos.push(t);
      }
    }
  }

  var titleEl = document.getElementById('cal-day-title');
  var notesEl = document.getElementById('cal-day-notes');
  var todosEl = document.getElementById('cal-day-todos');

  if (!titleEl || !notesEl || !todosEl) return;

  titleEl.textContent = dateStr + ' 的记录';

  // Notes section
  notesEl.innerHTML = '';
  if (dayNotes.length === 0) {
    notesEl.innerHTML = '<div class="cal-detail-empty">没有碎碎念</div>';
  } else {
    for (var i = 0; i < dayNotes.length; i++) {
      var n = dayNotes[i];
      var mood = Data.MOODS.find(function(m) { return m.id === n.mood; });
      var emoji = mood ? mood.emoji : '';
      var user = Data.getUserDisplay(n.createdBy);
      var div = document.createElement('div');
      div.className = 'note-card';
      div.style.marginBottom = '8px';
      div.innerHTML = '<div class="note-text">' + emoji + ' ' + n.text + '</div>' +
        '<div class="note-meta"><span>' + user.nickname + '</span></div>';
      notesEl.appendChild(div);
    }
  }

  // Todos section
  todosEl.innerHTML = '';

  // Add todo button for this date
  var addBtn = document.createElement('div');
  addBtn.className = 'cal-todo-add';
  addBtn.innerHTML = '<button class="btn btn-secondary" style="width:100%;margin-bottom:10px;" onclick="Calendar.addTodoForDate(\'' + dateStr + '\')">➕ 添加待办</button>';
  todosEl.appendChild(addBtn);

  if (dayTodos.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'cal-detail-empty';
    empty.textContent = '没有待办事项';
    todosEl.appendChild(empty);
  } else {
    for (var j = 0; j < dayTodos.length; j++) {
      var t = dayTodos[j];
      var user2 = Data.getUserDisplay(t.createdBy);

      var div = document.createElement('div');
      div.className = 'todo-item';
      div.style.marginBottom = '6px';

      var checkDiv = document.createElement('div');
      checkDiv.className = 'todo-checkbox' + (t.done ? ' checked' : '');
      checkDiv.onclick = (function(tid, tdate) {
        return function() {
          Todos.toggleTodo(tid);
          // Refresh after a tiny delay so data saves
          setTimeout(function() {
            Calendar.showDetail(tdate);
            Calendar.render();
          }, 50);
        };
      })(t._id, dateStr);

      var textSpan = document.createElement('span');
      textSpan.className = 'todo-text' + (t.done ? ' done' : '');
      textSpan.textContent = t.text;

      var delBtn = document.createElement('button');
      delBtn.className = 'todo-delete';
      delBtn.textContent = '✕';
      delBtn.onclick = (function(tid, tdate) {
        return function(e) {
          e.stopPropagation();
          Todos.deleteTodo(tid);
          setTimeout(function() {
            Calendar.showDetail(tdate);
            Calendar.render();
          }, 50);
        };
      })(t._id, dateStr);

      div.appendChild(checkDiv);
      div.appendChild(textSpan);
      if (user2) {
        var authorSpan = document.createElement('span');
        authorSpan.style.cssText = 'font-size:11px;color:var(--text-secondary);margin-right:6px;';
        authorSpan.textContent = user2.nickname;
        div.appendChild(authorSpan);
      }
      div.appendChild(delBtn);
      todosEl.appendChild(div);
    }
  }
};

// Add todo for a specific date from calendar
Calendar.addTodoForDate = function(dateStr) {
  var html = '<h3>添加待办事项</h3>' +
    '<label>日期</label><input type="date" id="todo-date-input" value="' + dateStr + '">' +
    '<label>内容</label><textarea id="todo-text-input" rows="3" placeholder="写待办事项..."></textarea>' +
    '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Calendar.saveTodoForDate()">保存</button></div>';

  Modal.open(html);
};

Calendar.saveTodoForDate = function() {
  var dateEl = document.getElementById('todo-date-input');
  var textEl = document.getElementById('todo-text-input');
  if (!textEl || !textEl.value.trim()) {
    Toast.show('请输入内容', 'error');
    return;
  }
  if (!dateEl || !dateEl.value) {
    Toast.show('请选择日期', 'error');
    return;
  }

  var d = Data.load();
  var todos = d.todos || {};
  var id = Data.generateId();
  var now = Data.now();
  todos[id] = {
    text: textEl.value.trim(),
    date: dateEl.value,
    done: false,
    createdBy: d.currentUser,
    createdAt: now,
    lastEditedBy: d.currentUser,
    lastEditedAt: now,
    _id: id
  };
  d.todos = todos;
  Data.save(d);
  Modal.close();
  // Refresh calendar detail view
  Calendar.showDetail(dateEl.value);
  Calendar.render();
  Dashboard.renderToday();
  Dashboard.renderActivity();
  Toast.show('待办已添加', 'success');
};
