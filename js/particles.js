/* ========== Particle Background (ES5) ========== */

var Particles = {};

Particles.ctx = null;
Particles.canvas = null;
Particles.particles = [];
Particles.animId = null;
Particles.running = false;

Particles.init = function() {
  Particles.canvas = document.getElementById('particles-canvas');
  if (!Particles.canvas) return;
  Particles.ctx = Particles.canvas.getContext('2d');
  Particles.resize();
  window.addEventListener('resize', function() {
    Particles.resize();
  });
  var d = Data.load();
  if (d.settings && d.settings.particles === false) {
    Particles.stop();
  } else {
    Particles.start();
  }
};

Particles.resize = function() {
  if (!Particles.canvas) return;
  Particles.canvas.width = window.innerWidth;
  Particles.canvas.height = window.innerHeight;
};

Particles.start = function() {
  if (Particles.running) return;
  Particles.running = true;
  Particles.particles = [];
  var count = Math.min(60, Math.floor(window.innerWidth / 20));
  for (var i = 0; i < count; i++) {
    Particles.particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1
    });
  }
  Particles.animate();
};

Particles.stop = function() {
  Particles.running = false;
  if (Particles.animId) {
    cancelAnimationFrame(Particles.animId);
    Particles.animId = null;
  }
  if (Particles.ctx && Particles.canvas) {
    Particles.ctx.clearRect(0, 0, Particles.canvas.width, Particles.canvas.height);
  }
};

Particles.animate = function() {
  if (!Particles.running) return;
  var ctx = Particles.ctx;
  var canvas = Particles.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var ps = Particles.particles;
  for (var i = 0; i < ps.length; i++) {
    var p = ps[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124, 92, 191, 0.4)';
    ctx.fill();

    // Draw connections
    for (var j = i + 1; j < ps.length; j++) {
      var dx = ps[j].x - p.x;
      var dy = ps[j].y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(ps[j].x, ps[j].y);
        ctx.strokeStyle = 'rgba(124, 92, 191, ' + (0.15 * (1 - dist / 120)) + ')';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  Particles.animId = requestAnimationFrame(Particles.animate);
};
