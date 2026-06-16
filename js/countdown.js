/* ========== Countdown Module (ES5) ========== */

var Countdown = {};

Countdown.calcDays = function(dateStr) {
  var target = new Date(dateStr + 'T00:00:00');
  var now = new Date();
  now.setHours(0, 0, 0, 0);
  var diff = target - now;
  return Math.round(diff / 86400000);
};

Countdown.render = function() {
  var d = Data.load();
  var cd = d.countdowns || {};
  var el = document.getElementById('countdown-list');
  if (!el) return;

  el.innerHTML = '';
  var items = [];
  for (var key in cd) {
    if (cd.hasOwnProperty(key)) {
      cd[key]._id = key;
      items.push(cd[key]);
    }
  }

  items.sort(function(a, b) {
    return a.date.localeCompare(b.date);
  });

  if (items.length === 0) {
    el.innerHTML = '<div class="empty-state">暂无倒计时</div>';
    return;
  }

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var diff = Countdown.calcDays(item.date);
    var abs = Math.abs(diff);
    var isPast = diff < 0;
    var label = isPast ? '已过' : '还剩';
    var badgeClass = isPast ? 'past' : 'future';
    var badgeText = isPast ? '已过去' : '倒计时';

    var html = '<div class="countdown-card' + (isPast ? ' passed' : '') + '">';
    html += '<button class="countdown-delete" onclick="Countdown.deleteCountdown(\'' + item._id + '\')">✕</button>';
    html += '<div class="countdown-number">' + abs + '</div>';
    html += '<div class="countdown-label">' + item.name + '</div>';
    html += '<div class="countdown-date">' + item.date + ' ' + label + ' ' + abs + ' 天</div>';
    html += '<div class="countdown-badge ' + badgeClass + '">' + badgeText + '</div>';
    html += '</div>';

    el.innerHTML += html;
  }
};

Countdown.openAddModal = function() {
  var html = '<h3>添加倒计时事件</h3>' +
    '<label>事件名称</label><input type="text" id="countdown-name-input" placeholder="事件名称">' +
    '<label>日期</label><input type="date" id="countdown-date-input">' +
    '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Countdown.saveCountdown()">保存</button></div>';

  Modal.open(html);
};

Countdown.saveCountdown = function() {
  var nameEl = document.getElementById('countdown-name-input');
  var dateEl = document.getElementById('countdown-date-input');
  if (!nameEl || !nameEl.value.trim()) {
    Toast.show('请输入事件名称', 'error');
    return;
  }
  if (!dateEl || !dateEl.value) {
    Toast.show('请选择日期', 'error');
    return;
  }

  var d = Data.load();
  var cd = d.countdowns || {};
  var id = Data.generateId();
  var now = Data.now();
  cd[id] = {
    name: nameEl.value.trim(),
    date: dateEl.value,
    createdBy: d.currentUser,
    createdAt: now,
    lastEditedBy: d.currentUser,
    lastEditedAt: now
  };
  d.countdowns = cd;
  Data.save(d);
  Modal.close();
  Countdown.render();
  Dashboard.renderCountdownPreview();
  Dashboard.renderActivity();
  Toast.show('倒计时已添加', 'success');
};

Countdown.deleteCountdown = function(id) {
  Modal.confirm('确定要删除这个倒计时吗？', function() {
    var d = Data.load();
    var cd = d.countdowns || {};
    if (cd[id]) {
      delete cd[id];
      d.countdowns = cd;
      Data.save(d);
      Countdown.render();
      Dashboard.renderCountdownPreview();
      Toast.show('已删除', 'info');
    }
  });
};
