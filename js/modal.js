/* ========== Modal System (ES5) ========== */

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

Modal.confirm = function(message, callback) {
  var html = '<h3>确认</h3><p>' + message + '</p><div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="Modal.close()">取消</button>' +
    '<button class="btn btn-primary" onclick="Modal.close(); (function(){var cb=' + callback + ';if(cb)cb();})()">确定</button></div>';
  Modal.open(html);
};
