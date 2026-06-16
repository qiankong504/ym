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
