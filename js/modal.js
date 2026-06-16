/* ========== Modal System ========== */

var Modal = {};

Modal.open = function(htmlContent) {
  var overlay = document.getElementById('modal-overlay');
  var container = document.getElementById('modal-container');
  overlay.style.display = 'flex';
  container.style.display = 'block';
  container.innerHTML = '<div class="modal">' + htmlContent + '</div>';
};

Modal.close = function() {
  var overlay = document.getElementById('modal-overlay');
  var container = document.getElementById('modal-container');
  overlay.style.display = 'none';
  container.style.display = 'none';
  container.innerHTML = '';
};

// 简易确认弹窗 — 直接在 open 里用回调
Modal.confirm = function(message, callback) {
  var html = '<h3>确认</h3><p style="color:var(--text-primary);font-size:14px;margin:12px 0;">' + message + '</p>' +
    '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Modal.close();' + callback + '">确定</button></div>';
  Modal.open(html);
};
