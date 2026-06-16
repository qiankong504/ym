/* ========== Todos Module (ES5) ========== */

var Todos = {};

Todos.openAddModal = function(date) {
  date = date || '';
  if (!date) {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    date = y + '-' + m + '-' + d;
  }

  var html = '<h3>添加待办事项</h3>' +
    '<label>日期</label><input type="date" id="todo-date-input" value="' + date + '">' +
    '<label>内容</label><textarea id="todo-text-input" rows="3" placeholder="写待办事项..."></textarea>' +
    '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Todos.saveTodo()">保存</button></div>';

  Modal.open(html);
};

Todos.saveTodo = function() {
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
  Dashboard.renderToday();
  Dashboard.renderActivity();
  // If calendar is open, refresh its detail view
  if (Calendar.selectedDate) {
    Calendar.showDetail(Calendar.selectedDate);
    Calendar.render();
  }
  Toast.show('待办已添加', 'success');
};

Todos.toggleTodo = function(id) {
  var d = Data.load();
  var todos = d.todos || {};
  if (todos[id]) {
    todos[id].done = !todos[id].done;
    todos[id].lastEditedBy = d.currentUser;
    todos[id].lastEditedAt = Data.now();
    d.todos = todos;
    Data.save(d);
    Dashboard.renderToday();
    // Refresh calendar if open
    if (Calendar.selectedDate) {
      Calendar.showDetail(Calendar.selectedDate);
      Calendar.render();
    }
    Toast.show(todos[id].done ? '已完成' : '已取消', 'info');
  } else {
    Toast.show('待办不存在', 'error');
  }
};

Todos.deleteTodo = function(id) {
  Modal.confirm('确定要删除这条待办吗？', function() {
    var d = Data.load();
    var todos = d.todos || {};
    if (todos[id]) {
      delete todos[id];
      d.todos = todos;
      Data.save(d);
      Dashboard.renderToday();
      // Refresh calendar if open
      if (Calendar.selectedDate) {
        Calendar.showDetail(Calendar.selectedDate);
        Calendar.render();
      }
      Toast.show('已删除', 'info');
    }
  });
};
