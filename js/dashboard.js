/* ========== Dashboard (ES5) ========== */

var Dashboard = {};

Dashboard.clockInterval = null;

Dashboard.init = function() {
  Dashboard.updateClocks();
  if (Dashboard.clockInterval) clearInterval(Dashboard.clockInterval);
  Dashboard.clockInterval = setInterval(Dashboard.updateClocks, 1000);
  // Fix: use modern Open-Meteo API format (current= instead of current_weather=true)
  Dashboard.fetchWeather('moscow', 55.7558, 37.6173);
  Dashboard.fetchWeather('mangshi', 24.4324, 98.5865);
  Dashboard.renderToday();
  Dashboard.renderCountdownPreview();
  Dashboard.renderActivity();
};

Dashboard.updateClocks = function() {
  var now = new Date();

  // Moscow (UTC+3) — correct approach: get UTC time, offset by target tz
  var moscow = Dashboard.getTimeInZone(now, 3);
  document.getElementById('time-moscow').textContent = Dashboard.formatTime(moscow);
  document.getElementById('date-moscow').textContent = Dashboard.formatDate(moscow);

  // Mangshi / China (UTC+8)
  var mangshi = Dashboard.getTimeInZone(now, 8);
  document.getElementById('time-mangshi').textContent = Dashboard.formatTime(mangshi);
  document.getElementById('date-mangshi').textContent = Dashboard.formatDate(mangshi);
};

Dashboard.getTimeInZone = function(date, targetOffsetHours) {
  // Get UTC hours/minutes/seconds from the Date object
  var utcHours = date.getUTCHours();
  var utcMinutes = date.getUTCMinutes();
  var utcSeconds = date.getUTCSeconds();
  var utcDate = date.getUTCDate();
  var utcMonth = date.getUTCMonth();
  var utcFullYear = date.getUTCFullYear();
  var utcDay = date.getUTCDay();

  // Apply target offset
  var localHours = utcHours + targetOffsetHours;

  // Handle day rollover
  var localDate = utcDate;
  var localMonth = utcMonth;
  var localFullYear = utcFullYear;
  var localDay = utcDay;

  if (localHours >= 24) {
    localHours -= 24;
    localDate += 1;
    localDay = (localDay + 1) % 7;
  } else if (localHours < 0) {
    localHours += 24;
    localDate -= 1;
    localDay = (localDay + 6) % 7;
  }

  // Handle month/year rollover for date
  if (localDate > new Date(localFullYear, localMonth + 1, 0).getDate()) {
    localDate = 1;
    localMonth += 1;
    if (localMonth > 11) {
      localMonth = 0;
      localFullYear += 1;
    }
  } else if (localDate < 1) {
    localMonth -= 1;
    if (localMonth < 0) {
      localMonth = 11;
      localFullYear -= 1;
    }
    localDate = new Date(localFullYear, localMonth + 1, 0).getDate();
  }

  return {
    hours: localHours,
    minutes: utcMinutes,
    seconds: utcSeconds,
    date: localDate,
    month: localMonth,
    year: localFullYear,
    day: localDay
  };
};

Dashboard.formatTime = function(t) {
  var h = String(t.hours).padStart(2, '0');
  var m = String(t.minutes).padStart(2, '0');
  var s = String(t.seconds).padStart(2, '0');
  return h + ':' + m + ':' + s;
};

Dashboard.formatDate = function(t) {
  var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var y = t.year;
  var mo = String(t.month + 1).padStart(2, '0');
  var da = String(t.date).padStart(2, '0');
  return y + '-' + mo + '-' + da + ' ' + days[t.day];
};

// Weather code to description mapping
Dashboard.weatherCodes = {
  0:  { desc: '晴朗', icon: '☀️', cls: 'weather-sunny' },
  1:  { desc: '大部晴朗', icon: '🌤️', cls: 'weather-sunny' },
  2:  { desc: '多云', icon: '⛅', cls: 'weather-cloudy' },
  3:  { desc: '阴天', icon: '☁️', cls: 'weather-cloudy' },
  45: { desc: '雾', icon: '🌫️', cls: 'weather-fog' },
  48: { desc: '大雾', icon: '🌫️', cls: 'weather-fog' },
  51: { desc: '小毛毛雨', icon: '🌦️', cls: 'weather-rain' },
  53: { desc: '毛毛雨', icon: '🌦️', cls: 'weather-rain' },
  55: { desc: '大毛毛雨', icon: '🌦️', cls: 'weather-rain' },
  56: { desc: '冻毛毛雨', icon: '🌧️', cls: 'weather-rain' },
  57: { desc: '冻毛毛雨', icon: '🌧️', cls: 'weather-rain' },
  61: { desc: '小雨', icon: '🌧️', cls: 'weather-rain' },
  63: { desc: '中雨', icon: '🌧️', cls: 'weather-rain' },
  65: { desc: '大雨', icon: '🌧️', cls: 'weather-rain' },
  66: { desc: '冻雨', icon: '🌧️', cls: 'weather-rain' },
  67: { desc: '冻雨', icon: '🌧️', cls: 'weather-rain' },
  71: { desc: '小雪', icon: '❄️', cls: 'weather-snow' },
  73: { desc: '中雪', icon: '❄️', cls: 'weather-snow' },
  75: { desc: '大雪', icon: '❄️', cls: 'weather-snow' },
  77: { desc: '雪粒', icon: '❄️', cls: 'weather-snow' },
  80: { desc: '小阵雨', icon: '🌦️', cls: 'weather-rain' },
  81: { desc: '中阵雨', icon: '🌦️', cls: 'weather-rain' },
  82: { desc: '大阵雨', icon: '🌦️', cls: 'weather-rain' },
  85: { desc: '小阵雪', icon: '❄️', cls: 'weather-snow' },
  86: { desc: '大阵雪', icon: '❄️', cls: 'weather-snow' },
  95: { desc: '雷暴', icon: '⛈️', cls: '' },
  96: { desc: '雷暴+冰雹', icon: '⛈️', cls: '' },
  99: { desc: '雷暴+冰雹', icon: '⛈️', cls: '' }
};

Dashboard.fetchWeather = function(city, lat, lon) {
  // Use the modern Open-Meteo API format
  // current=temperature_2m,weathercode  (replaces current_weather=true)
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
    '&current=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        // New API format: data.current has {temperature_2m, weathercode}
        // Also try old format: data.current_weather
        var currentWeather = data.current || data.current_weather;
        if (currentWeather) {
          Dashboard.renderWeather(city, currentWeather, data.daily);
        } else {
          Dashboard.setWeatherFallback(city);
        }
      } catch (e) {
        Dashboard.setWeatherFallback(city);
      }
    } else {
      Dashboard.setWeatherFallback(city);
    }
  };
  xhr.onerror = function() {
    Dashboard.setWeatherFallback(city);
  };
  xhr.send();
};

Dashboard.setWeatherFallback = function(city) {
  var descEl = document.getElementById('wdesc-' + city);
  var iconEl = document.getElementById('wicon-' + city);
  var tempEl = document.getElementById('wtemp-' + city);
  if (iconEl) iconEl.textContent = '🌥️';
  if (tempEl) tempEl.textContent = '--°C';
  if (descEl) descEl.textContent = '无法获取';
};

Dashboard.renderWeather = function(city, weather, daily) {
  // Support both old format (weathercode) and new format (weathercode as property)
  var code = weather.weathercode || weather.weather_code;
  var temp = weather.temperature || weather.temperature_2m;

  var iconEl = document.getElementById('wicon-' + city);
  var tempEl = document.getElementById('wtemp-' + city);
  var descEl = document.getElementById('wdesc-' + city);
  var cardEl = document.getElementById('weather-' + city);

  if (!iconEl || !tempEl || !descEl || !cardEl) return;

  if (code === undefined || code === null) {
    Dashboard.setWeatherFallback(city);
    return;
  }

  // Look up weather info
  var info = Dashboard.weatherCodes[code];
  if (!info) {
    info = { desc: '未知', icon: '🌥️', cls: '' };
  }

  iconEl.textContent = info.icon;
  tempEl.textContent = Math.round(temp) + '°C';

  // Apply animation class
  cardEl.className = 'weather-card';
  if (info.cls) {
    cardEl.classList.add(info.cls);
  }

  // Add hi/lo if available
  if (daily && daily.temperature_2m_max && daily.temperature_2m_max[0] !== undefined) {
    var hi = daily.temperature_2m_max[0];
    var lo = daily.temperature_2m_min[0];
    descEl.textContent = info.desc + '  ' + Math.round(lo) + '° / ' + Math.round(hi) + '°';
  } else {
    descEl.textContent = info.desc;
  }
};

Dashboard.renderToday = function() {
  var today = Data.getToday();
  var notesEl = document.getElementById('today-notes');
  var todosEl = document.getElementById('today-todos');

  if (!notesEl || !todosEl) return;

  notesEl.innerHTML = '';
  if (today.notes.length === 0) {
    notesEl.innerHTML = '<div class="empty-state">今天还没有碎碎念</div>';
  } else {
    for (var i = 0; i < today.notes.length; i++) {
      var n = today.notes[i];
      var mood = Data.MOODS.find(function(m) { return m.id === n.mood; });
      var moodEmoji = mood ? mood.emoji : '';
      var div = document.createElement('div');
      div.className = 'today-note-item';
      div.textContent = moodEmoji + ' ' + n.text;
      notesEl.appendChild(div);
    }
  }

  todosEl.innerHTML = '';
  if (today.todos.length === 0) {
    todosEl.innerHTML = '<div class="empty-state">今天没有待办事项</div>';
  } else {
    for (var j = 0; j < today.todos.length; j++) {
      var t = today.todos[j];
      var div = document.createElement('div');
      div.className = 'today-todo-item' + (t.done ? ' done' : '');
      div.textContent = (t.done ? '✅' : '⬜') + ' ' + t.text;
      todosEl.appendChild(div);
    }
  }
};

Dashboard.renderCountdownPreview = function() {
  var d = Data.load();
  var cd = d.countdowns || {};
  var el = document.getElementById('countdown-preview');
  if (!el) return;

  el.innerHTML = '';
  var count = 0;
  for (var key in cd) {
    if (cd.hasOwnProperty(key) && count < 4) {
      var c = cd[key];
      var diff = Countdown.calcDays(c.date);
      var abs = Math.abs(diff);
      var label = diff >= 0 ? '天后' : '天前';
      var div = document.createElement('div');
      div.className = 'countdown-mini-card';
      div.innerHTML = '<div class="countdown-mini-days">' + abs + '</div>' +
        '<div class="countdown-mini-label">' + c.name + ' ' + label + '</div>';
      el.appendChild(div);
      count++;
    }
  }
};

Dashboard.renderActivity = function() {
  var activities = Data.getActivity(20);
  var el = document.getElementById('activity-feed');
  if (!el) return;

  el.innerHTML = '';
  if (activities.length === 0) {
    el.innerHTML = '<div class="empty-state">还没有任何动态</div>';
    return;
  }

  for (var i = 0; i < activities.length; i++) {
    var a = activities[i];
    var user = Data.getUserDisplay(a.userId);
    var icon = '';
    var text = '';
    switch (a.type) {
      case 'note': icon = '📝'; text = user.nickname + ' 写了碎碎念'; break;
      case 'edit': icon = '✏️'; text = user.nickname + ' 编辑了碎碎念'; break;
      case 'todo': icon = '✅'; text = user.nickname + ' 添加了待办'; break;
      case 'countdown': icon = '⏳'; text = user.nickname + ' 添加了倒计时'; break;
    }
    var div = document.createElement('div');
    div.className = 'activity-item';
    var timeStr = a.time.slice(0, 16).replace('T', ' ');
    div.innerHTML = '<span class="activity-icon">' + icon + '</span>' +
      '<span class="activity-text">' + text + '</span>' +
      '<span class="activity-time">' + timeStr + '</span>';
    el.appendChild(div);
  }
};
