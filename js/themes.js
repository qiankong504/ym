/* ========== Theme System (ES5) ========== */

var Themes = {};

Themes.apply = function(themeId) {
  // Remove all theme classes
  var classes = document.body.className;
  var themeClasses = classes.split(' ').filter(function(c) {
    return c.indexOf('theme-') !== 0;
  });
  document.body.className = themeClasses.join(' ').trim();
  document.body.classList.add('theme-' + themeId);
};

Themes.renderGrid = function() {
  var el = document.getElementById('theme-grid');
  if (!el) return;

  var d = Data.load();
  var current = d.theme || 'midnight';

  el.innerHTML = '';
  for (var i = 0; i < Data.THEMES.length; i++) {
    var t = Data.THEMES[i];
    var active = t.id === current ? ' active' : '';
    var div = document.createElement('div');
    div.className = 'theme-option' + active;
    div.onclick = (function(themeId) {
      return function() { Themes.select(themeId); };
    })(t.id);
    div.innerHTML = '<div class="theme-swatch" style="background:' + t.color + '"></div>' +
      '<div class="theme-name">' + t.name + '</div>';
    el.appendChild(div);
  }
};

Themes.select = function(themeId) {
  var d = Data.load();
  d.theme = themeId;
  Data.save(d);
  Themes.apply(themeId);
  Themes.renderGrid();
  Toast.show('主题已切换: ' + themeId, 'success');
};

Themes.init = function() {
  var d = Data.load();
  var theme = d.theme || 'midnight';
  Themes.apply(theme);
};
