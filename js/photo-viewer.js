/* ========== Photo Viewer (ES5) ========== */

var PhotoViewer = {};

PhotoViewer.open = function(src) {
  var viewer = document.getElementById('photo-viewer');
  var img = document.getElementById('photo-viewer-img');
  if (!viewer || !img) return;
  img.src = src;
  viewer.style.display = 'flex';
};

PhotoViewer.close = function() {
  var viewer = document.getElementById('photo-viewer');
  if (viewer) viewer.style.display = 'none';
};
