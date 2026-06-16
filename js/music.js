/* ========== Music Player (ES5) ========== */

var Music = {};

Music.currentIndex = -1;
Music.isPlaying = false;
Music.tracks = [];

Music.init = function() {
  Music.renderList();
  var audio = document.getElementById('audio-player');
  if (audio) {
    audio.addEventListener('timeupdate', Music.updateProgress);
    audio.addEventListener('ended', Music.next);
    audio.addEventListener('loadedmetadata', function() {
      document.getElementById('music-duration').textContent = Music.formatTime(audio.duration);
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); Music.togglePlay(); }
    if (e.code === 'ArrowLeft') Music.prev();
    if (e.code === 'ArrowRight') Music.next();
  });
};

Music.renderList = function() {
  var d = Data.load();
  Music.tracks = d.music || [];
  var el = document.getElementById('music-list');
  if (!el) return;

  el.innerHTML = '';
  if (Music.tracks.length === 0) {
    el.innerHTML = '<li style="padding:16px;text-align:center;color:var(--text-secondary);font-size:13px;list-style:none;">暂无音乐</li>';
    return;
  }

  for (var i = 0; i < Music.tracks.length; i++) {
    var t = Music.tracks[i];
    var li = document.createElement('li');
    li.className = 'music-list-item' + (i === Music.currentIndex ? ' active' : '');
    li.innerHTML = '<span class="music-list-icon">🎵</span>' +
      '<span class="music-list-name">' + t.name + '</span>' +
      '<button class="music-list-delete" onclick="event.stopPropagation(); Music.deleteTrack(' + i + ')">✕</button>';
    li.onclick = (function(idx) {
      return function() { Music.play(idx); };
    })(i);
    el.appendChild(li);
  }
};

Music.play = function(index) {
  if (index < 0 || index >= Music.tracks.length) return;
  Music.currentIndex = index;
  var track = Music.tracks[index];
  var audio = document.getElementById('audio-player');
  if (!audio) return;

  audio.src = track.data;
  audio.play().then(function() {
    Music.isPlaying = true;
    document.getElementById('music-play-btn').textContent = '⏸';
    document.getElementById('music-bar-title').textContent = track.name;
    Music.renderList();
  }).catch(function(e) {
    Toast.show('播放失败', 'error');
  });
};

Music.togglePlay = function() {
  var audio = document.getElementById('audio-player');
  if (!audio || !audio.src) {
    if (Music.tracks.length > 0) {
      Music.play(0);
    }
    return;
  }

  if (Music.isPlaying) {
    audio.pause();
    Music.isPlaying = false;
    document.getElementById('music-play-btn').textContent = '▶️';
  } else {
    audio.play().then(function() {
      Music.isPlaying = true;
      document.getElementById('music-play-btn').textContent = '⏸';
    }).catch(function(e) {});
  }
};

Music.next = function() {
  if (Music.tracks.length === 0) return;
  var next = (Music.currentIndex + 1) % Music.tracks.length;
  Music.play(next);
};

Music.prev = function() {
  if (Music.tracks.length === 0) return;
  var prev = Music.currentIndex - 1;
  if (prev < 0) prev = Music.tracks.length - 1;
  Music.play(prev);
};

Music.seek = function(event) {
  var bar = document.getElementById('music-progress');
  if (!bar) return;
  var rect = bar.getBoundingClientRect();
  var ratio = (event.clientX - rect.left) / rect.width;
  var audio = document.getElementById('audio-player');
  if (audio && audio.duration) {
    audio.currentTime = ratio * audio.duration;
  }
};

Music.updateProgress = function() {
  var audio = document.getElementById('audio-player');
  if (!audio || !audio.duration) return;
  var ratio = audio.currentTime / audio.duration * 100;
  var fill = document.getElementById('music-progress-fill');
  var currentTime = document.getElementById('music-current-time');
  if (fill) fill.style.width = ratio + '%';
  if (currentTime) currentTime.textContent = Music.formatTime(audio.currentTime);
};

Music.formatTime = function(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};

Music.setVolume = function(val) {
  var audio = document.getElementById('audio-player');
  if (audio) audio.volume = parseFloat(val);
};

Music.uploadMusic = function() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mp3,.wav,.ogg';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var d = Data.load();
      var tracks = d.music || [];
      tracks.push({
        name: file.name.replace(/\.[^/.]+$/, ''),
        data: ev.target.result
      });
      d.music = tracks;
      Data.save(d);
      Music.tracks = tracks;
      Music.renderList();
      Toast.show('已添加: ' + file.name, 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

Music.generateDemo = function() {
  // Generate a simple demo tone using AudioContext
  try {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var sampleRate = audioCtx.sampleRate;
    var duration = 4; // seconds
    var length = sampleRate * duration;
    var buffer = audioCtx.createBuffer(1, length, sampleRate);
    var data = buffer.getChannelData(0);

    // Simple melody
    var notes = [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66];
    var noteLen = Math.floor(length / notes.length);

    for (var i = 0; i < length; i++) {
      var noteIndex = Math.floor(i / noteLen);
      if (noteIndex >= notes.length) noteIndex = notes.length - 1;
      var freq = notes[noteIndex];
      var t = i / sampleRate;
      // Sine wave with envelope
      var env = 1 - (i % noteLen) / noteLen;
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.3;
    }

    // Convert to WAV blob
    var wavBlob = Music.audioBufferToWav(buffer);
    var reader = new FileReader();
    reader.onload = function(e) {
      var d = Data.load();
      var tracks = d.music || [];
      var name = '示例旋律 ' + (tracks.length + 1);
      tracks.push({
        name: name,
        data: e.target.result
      });
      d.music = tracks;
      Data.save(d);
      Music.tracks = tracks;
      Music.renderList();
      Toast.show('已生成示例音乐', 'success');
    };
    reader.readAsDataURL(wavBlob);

    audioCtx.close();
  } catch (err) {
    Toast.show('生成失败，请上传音乐文件', 'error');
  }
};

Music.audioBufferToWav = function(buffer) {
  var numChannels = buffer.numberOfChannels;
  var sampleRate = buffer.sampleRate;
  var format = 1; // PCM
  var bitDepth = 16;
  var data = buffer.getChannelData(0);
  var dataLength = data.length * (bitDepth / 8);
  var headerLength = 44;
  var totalLength = headerLength + dataLength;

  var arrayBuffer = new ArrayBuffer(totalLength);
  var view = new DataView(arrayBuffer);

  // WAV header
  Music.writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  Music.writeString(view, 8, 'WAVE');
  Music.writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  Music.writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  var offset = 44;
  for (var i = 0; i < data.length; i++) {
    var sample = Math.max(-1, Math.min(1, data[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, sample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

Music.writeString = function(view, offset, str) {
  for (var i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

Music.deleteTrack = function(index) {
  var d = Data.load();
  var tracks = d.music || [];
  if (index >= 0 && index < tracks.length) {
    tracks.splice(index, 1);
    d.music = tracks;
    Data.save(d);
    Music.tracks = tracks;
    if (Music.currentIndex === index) {
      Music.currentIndex = -1;
      var audio = document.getElementById('audio-player');
      if (audio) { audio.pause(); audio.src = ''; }
      document.getElementById('music-play-btn').textContent = '▶️';
      document.getElementById('music-bar-title').textContent = '未播放';
    } else if (Music.currentIndex > index) {
      Music.currentIndex--;
    }
    Music.renderList();
    Toast.show('已删除', 'info');
  }
};
