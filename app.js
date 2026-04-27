let currentYear = new Date().getFullYear();
let holidays = {};
const realToday = new Date();

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const dayChars = ['日', '月', '火', '水', '木', '金', '土'];

const defaultSchedules = [
  { id: Date.now().toString() + '1', title: "新年イベント", start: "2026-01-01", end: "2026-01-03", color: "bg-orange" },
  { id: Date.now().toString() + '2', title: "お盆休み", start: "2026-08-13", end: "2026-08-16", color: "bg-green" }
];

let schedules = [];
const saved = localStorage.getItem('yearSchedules');
if (saved) {
  schedules = JSON.parse(saved);
} else {
  schedules = defaultSchedules;
}

function saveSchedules() {
  localStorage.setItem('yearSchedules', JSON.stringify(schedules));
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-year").textContent = currentYear;

  fetch('https://holidays-jp.github.io/api/v1/date.json')
    .then(r => r.json())
    .then(data => {
      holidays = data;
      renderCalendar();
    })
    .catch(() => renderCalendar());

  setupModal();
  
  document.getElementById("btn-today").addEventListener("click", () => {
    const todayEl = document.querySelector(".day-row.today");
    if(todayEl) {
      todayEl.style.transition = "background 0.3s";
      todayEl.style.backgroundColor = "rgba(56, 189, 248, 0.4)";
      setTimeout(() => todayEl.style.backgroundColor = "", 500);
    }
  });

  document.getElementById("btn-prev-year").addEventListener("click", () => {
    currentYear--;
    document.getElementById("current-year").textContent = currentYear;
    renderCalendar();
    if (typeof gapiInited !== 'undefined' && gapiInited && gapi.client.getToken() !== null) {
      fetchGoogleEvents();
    }
  });

  document.getElementById("btn-next-year").addEventListener("click", () => {
    currentYear++;
    document.getElementById("current-year").textContent = currentYear;
    renderCalendar();
    if (typeof gapiInited !== 'undefined' && gapiInited && gapi.client.getToken() !== null) {
      fetchGoogleEvents();
    }
  });

  const toggleWeek = document.getElementById("toggle-week");
  toggleWeek.addEventListener("change", (e) => {
    if(e.target.checked) document.getElementById("calendar").classList.add("show-week-no");
    else document.getElementById("calendar").classList.remove("show-week-no");
  });

  const toggleCompact = document.getElementById("toggle-compact");
  const isCompact = localStorage.getItem("ultraCompact") === "true";
  if (isCompact) {
    toggleCompact.checked = true;
    document.body.classList.add("ultra-compact");
  }
  toggleCompact.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.add("ultra-compact");
      localStorage.setItem("ultraCompact", "true");
    } else {
      document.body.classList.remove("ultra-compact");
      localStorage.setItem("ultraCompact", "false");
    }
  });

  const toggleHorizontal = document.getElementById("toggle-horizontal");
  const isHorizontal = localStorage.getItem("stackHorizontal") !== "false"; // Default true
  if (isHorizontal) {
    toggleHorizontal.checked = true;
    document.body.classList.add("stack-horizontal");
  } else {
    toggleHorizontal.checked = false;
    document.body.classList.remove("stack-horizontal");
  }
  toggleHorizontal.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.add("stack-horizontal");
      localStorage.setItem("stackHorizontal", "true");
    } else {
      document.body.classList.remove("stack-horizontal");
      localStorage.setItem("stackHorizontal", "false");
    }
    renderCalendar();
  });

  // Theme Toggle Logic
  const themes = ['dark', 'light', 'aurora'];
  const themeIcons = { 'dark': '🌙', 'light': '☀️', 'aurora': '✨' };
  let currentThemeIndex = 0;
  
  const savedTheme = localStorage.getItem('appTheme');
  if (savedTheme && themes.includes(savedTheme)) {
    currentThemeIndex = themes.indexOf(savedTheme);
  }
  
  const applyTheme = () => {
    const theme = themes[currentThemeIndex];
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById("btn-theme-toggle").textContent = themeIcons[theme];
    localStorage.setItem('appTheme', theme);
  };
  
  // Apply initial theme
  applyTheme();

  document.getElementById("btn-theme-toggle").addEventListener("click", () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    applyTheme();
  });

  // Auto-init Google API if settings exist
  const gapiSettings = getGapiSettings();
  if (gapiSettings.apiKey && gapiSettings.clientId) {
    setTimeout(initGapiAndFetch, 500);
  }

  // PWA Install Logic
  setupPWA();
});

// --- PWA Logic ---
let deferredPrompt;

function setupPWA() {
  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW Registered', reg))
        .catch(err => console.log('SW Registration Failed', err));
    });
  }

  const installBtn = document.getElementById('btn-install-pwa');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      deferredPrompt = null;
      // Hide the app-provided install button
      installBtn.classList.add('hidden');
    });
  }

  window.addEventListener('appinstalled', (evt) => {
    console.log('App installed successfully');
    if (installBtn) {
      installBtn.classList.add('hidden');
    }
  });
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

function renderDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function renderCalendar() {
  const grid = document.getElementById("calendar");
  grid.innerHTML = "";

  // 予定をソート（長い予定を優先的に左に寄せるため）
  const allEventsGlobal = schedules.concat(typeof gapiEvents !== 'undefined' ? gapiEvents : []);
  const sortedGlobal = [...allEventsGlobal].sort((a, b) => {
    if (a.start !== b.start) return a.start.localeCompare(b.start);
    const durA = parseDateStr(a.end) - parseDateStr(a.start);
    const durB = parseDateStr(b.end) - parseDateStr(b.start);
    return durB - durA;
  });

  for (let m = 0; m < 12; m++) {
    const col = document.createElement("div");
    col.className = "month-col";
    
    const header = document.createElement("div");
    header.className = "month-header";
    header.textContent = months[m];
    col.appendChild(header);

    const daysContainer = document.createElement("div");
    daysContainer.className = "days-container";

    for (let d = 1; d <= 31; d++) {
      const date = new Date(currentYear, m, d);
      const row = document.createElement("div");
      row.className = "day-row";
      
      if (date.getMonth() !== m) {
        row.classList.add("empty");
        daysContainer.appendChild(row);
        continue;
      }

      const dateStr = renderDateStr(date);
      const dayOfWeek = date.getDay();
      
      // Day-of-week coloring
      if (dayOfWeek === 0) row.classList.add("sunday");
      if (dayOfWeek === 6) row.classList.add("saturday");

      // Determine state (Past, Today, Future)
      // Strip time for perfect day comparison
      const checkDate = new Date(currentYear, m, d).getTime();
      const todayTime = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate()).getTime();
      
      if (checkDate < todayTime) row.classList.add("past");
      if (checkDate === todayTime) row.classList.add("today");

      // Add click to create schedule
      row.addEventListener("click", (e) => {
        if(e.target.closest(".event")) return; // ignore if clicking on event
        openModal(null, dateStr);
      });

      // Day Info structure
      const info = document.createElement("div");
      info.className = "day-info";
      
      if (holidays[dateStr]) {
        info.classList.add("holiday");
        info.title = holidays[dateStr];
      }

      // Show week number on Mondays
      if (dayOfWeek === 1) {
        const wn = document.createElement("span");
        wn.className = "week-no-right";
        wn.textContent = `W${getWeekNumber(date)}`;
        row.appendChild(wn);
      }

      const dNum = document.createElement("span");
      dNum.className = "date-num";
      dNum.textContent = d;
      
      const dChar = document.createElement("span");
      dChar.className = "day-char";
      dChar.textContent = dayChars[dayOfWeek];
      
      info.appendChild(dNum);
      info.appendChild(dChar);
      row.appendChild(info);

      // Schedules Area
      const schedArea = document.createElement("div");
      schedArea.className = "schedule-area";
      
      // Find events that intersect this date
      const allEvents = sortedGlobal.filter(ev => dateStr >= ev.start && dateStr <= ev.end);
      
      allEvents.forEach(ev => {
        const evEl = document.createElement("div");
        evEl.className = `event ${ev.color.replace('accent-', '')}`; 
        evEl.textContent = ev.title || '\u00A0'; 
        
        // Tooltip with title
        evEl.title = `[${ev.start} - ${ev.end}]\n${ev.title}`;
        
        if (ev.start !== ev.end) {
          if (dateStr === ev.start) evEl.classList.add("multi-start");
          else if (dateStr === ev.end) evEl.classList.add("multi-end");
          else evEl.classList.add("multi-middle");
        }

        evEl.addEventListener("click", (e) => {
          e.stopPropagation();
          openModal(ev);
        });
        
        schedArea.appendChild(evEl);
      });
      
      row.appendChild(schedArea);
      daysContainer.appendChild(row);
    }
    
    col.appendChild(daysContainer);
    grid.appendChild(col);
  }
}

// Modal Logic
function openModal(ev = null, defaultDateStr = null) {
  const modal = document.getElementById("schedule-modal");
  const titleEl = document.getElementById("modal-title");
  const idInp = document.getElementById("event-id");
  const titleInp = document.getElementById("event-title");
  const startInp = document.getElementById("event-start");
  const endInp = document.getElementById("event-end");
  const delBtn = document.getElementById("btn-delete");
  const colors = document.getElementsByName("color");
  const saveGoogleGroup = document.getElementById("google-save-group");
  const saveGoogleCheck = document.getElementById("save-to-google");

  const settings = getGapiSettings();
  const isGapiLinked = !!(settings.apiKey && settings.clientId && gapiInited);
  
  if (isGapiLinked) {
    saveGoogleGroup.style.display = "block";
  } else {
    saveGoogleGroup.style.display = "none";
  }

  if (ev) {
    titleEl.textContent = "予定を編集";
    idInp.value = ev.id;
    titleInp.value = ev.title;
    startInp.value = ev.start;
    endInp.value = ev.end;
    delBtn.classList.remove("hidden");
    
    if (ev.isGoogle) {
      saveGoogleCheck.checked = true;
      saveGoogleCheck.disabled = true;
    } else {
      saveGoogleCheck.checked = false;
      saveGoogleCheck.disabled = true;
    }
    
    for (let c of colors) {
      if (c.value.includes(ev.color.replace('bg-', ''))) c.checked = true;
    }
  } else {
    titleEl.textContent = "予定を追加";
    idInp.value = "";
    titleInp.value = "";
    startInp.value = defaultDateStr;
    endInp.value = defaultDateStr;
    delBtn.classList.add("hidden");
    colors[0].checked = true;
    
    saveGoogleCheck.checked = isGapiLinked;
    saveGoogleCheck.disabled = false;
  }
  
  modal.classList.remove("hidden");
  titleInp.focus();
}

function setupModal() {
  const modal = document.getElementById("schedule-modal");
  const form = document.getElementById("schedule-form");
  const cancelBtn = document.getElementById("btn-cancel");
  const delBtn = document.getElementById("btn-delete");

  const closeM = () => modal.classList.add("hidden");

  cancelBtn.addEventListener("click", closeM);
  
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeM();
  });

  delBtn.addEventListener("click", () => {
    const id = document.getElementById("event-id").value;
    if (id.startsWith('gapi_')) {
      deleteFromGoogleCalendar(id);
    } else {
      schedules = schedules.filter(s => s.id !== id);
      saveSchedules();
      closeM();
      renderCalendar();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("event-id").value;
    const title = document.getElementById("event-title").value;
    let start = document.getElementById("event-start").value;
    let end = document.getElementById("event-end").value;
    
    let color = Array.from(document.getElementsByName("color")).find(c => c.checked).value;
    color = color.replace("accent-", "bg-");

    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    const saveGoogleCheck = document.getElementById("save-to-google");
    const isGoogleSave = (saveGoogleCheck.checked && !saveGoogleCheck.disabled) || (id && id.startsWith('gapi_'));

    if (isGoogleSave) {
      saveToGoogleCalendar(id, title, start, end, color);
    } else {
      if (id) {
        const idx = schedules.findIndex(s => s.id === id);
        if (idx !== -1) schedules[idx] = { id, title, start, end, color };
      } else {
        schedules.push({
          id: Date.now().toString(),
          title, start, end, color
        });
      }
      saveSchedules();
      closeM();
      renderCalendar();
    }
  });
}

// --- Google Calendar Integration ---
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
let gapiTokenClient;
let gapiInited = false;
let gisInited = false;
let gapiEvents = [];

const googleColorToAppColor = {
  '1': 'bg-purple',
  '2': 'bg-green',
  '3': 'bg-purple',
  '4': 'bg-pink',
  '5': 'bg-orange',
  '6': 'bg-orange',
  '7': 'bg-blue',
  '8': 'bg-blue',
  '9': 'bg-blue',
  '10': 'bg-green',
  '11': 'bg-pink'
};

const appColorToGoogleColor = {
  'bg-blue': '9',
  'bg-pink': '4',
  'bg-green': '10',
  'bg-purple': '3',
  'bg-orange': '6'
};

function getGapiSettings() {
  return {
    apiKey: localStorage.getItem('gapi_key') || '',
    clientId: localStorage.getItem('gapi_client_id') || '',
    calendarId: localStorage.getItem('gapi_calendar_id') || 'primary'
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const btnGoogleSync = document.getElementById("btn-google-sync");
  const gModal = document.getElementById("google-settings-modal");
  const gForm = document.getElementById("google-settings-form");
  const btnCancelGapi = document.getElementById("btn-cancel-gapi");
  const btnLogoutGapi = document.getElementById("btn-logout-gapi");
  
  const gapiKeyInp = document.getElementById("gapi-key");
  const gapiClientInp = document.getElementById("gapi-client-id");
  const gapiCalInp = document.getElementById("gapi-calendar-id");

  const closeGModal = () => gModal.classList.add("hidden");

  if(btnCancelGapi) {
    btnCancelGapi.addEventListener("click", closeGModal);
  }

  if(gModal) {
    gModal.addEventListener("click", (e) => {
      if (e.target === gModal) closeGModal();
    });
  }

  if(btnGoogleSync) {
    btnGoogleSync.addEventListener("click", () => {
      const settings = getGapiSettings();
      if (!settings.apiKey || !settings.clientId) {
        gapiKeyInp.value = settings.apiKey;
        gapiClientInp.value = settings.clientId;
        gapiCalInp.value = settings.calendarId;
        btnLogoutGapi.classList.add("hidden");
        gModal.classList.remove("hidden");
      } else {
        initGapiAndFetch();
      }
    });

    const btnRefresh = document.getElementById("btn-refresh");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => {
        window.location.reload();
      });
    }

    btnGoogleSync.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const settings = getGapiSettings();
      gapiKeyInp.value = settings.apiKey;
      gapiClientInp.value = settings.clientId;
      gapiCalInp.value = settings.calendarId;
      if(settings.apiKey) btnLogoutGapi.classList.remove("hidden");
      gModal.classList.remove("hidden");
    });
  }

  if(gForm) {
    gForm.addEventListener("submit", (e) => {
      e.preventDefault();
      localStorage.setItem("gapi_key", gapiKeyInp.value.trim());
      localStorage.setItem("gapi_client_id", gapiClientInp.value.trim());
      localStorage.setItem("gapi_calendar_id", gapiCalInp.value.trim() || 'primary');
      closeGModal();
      initGapiAndFetch();
    });
  }

  if(btnLogoutGapi) {
    btnLogoutGapi.addEventListener("click", () => {
      localStorage.removeItem("gapi_key");
      localStorage.removeItem("gapi_client_id");
      localStorage.removeItem("gapi_calendar_id");
      sessionStorage.removeItem("gapi_token");
      gapiEvents = [];
      if (gapiInited && gapi.client.getToken() !== null) {
        gapi.client.setToken('');
      }
      closeGModal();
      renderCalendar();
    });
  }
});

async function initGapiAndFetch() {
  const settings = getGapiSettings();
  if (!settings.apiKey || !settings.clientId) return;

  // ライブラリ読み込み待ち
  if (typeof gapi === 'undefined' || typeof google === 'undefined') {
    console.warn("Google API libraries not ready. Waiting...");
    setTimeout(initGapiAndFetch, 500);
    return;
  }

  try {
    if (!gapiInited) {
      await new Promise((resolve, reject) => {
        gapi.load('client', {callback: resolve, onerror: reject});
      });
      await gapi.client.init({
        apiKey: settings.apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      });
      gapiInited = true;
    }

    if (!gisInited) {
      gapiTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: settings.clientId,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error !== undefined) {
            console.error("GIS Error", tokenResponse);
            alert("Google連携エラー: " + tokenResponse.error);
            return;
          }
          // トークンをsessionStorageに保存（F5更新対策）
          sessionStorage.setItem('gapi_token', JSON.stringify(tokenResponse));
          fetchGoogleEvents();
        },
      });
      gisInited = true;
    }

    // sessionStorageに有効なトークンがあれば再利用
    const savedTokenStr = sessionStorage.getItem('gapi_token');
    if (savedTokenStr) {
      const token = JSON.parse(savedTokenStr);
      gapi.client.setToken(token);
      fetchGoogleEvents();
      return;
    }

    if (gapi.client.getToken() === null) {
      // prompt: 'consent' だと毎回許可画面が出るため空文字にする
      gapiTokenClient.requestAccessToken({prompt: ''});
    } else {
      gapiTokenClient.requestAccessToken({prompt: ''});
    }
  } catch (err) {
    console.error("GAPI Init Error", err);
    alert("Google API初期化エラー。APIキーなどを確認してください。");
  }
}

async function fetchGoogleEvents() {
  const settings = getGapiSettings();
  const timeMin = new Date(currentYear, 0, 1).toISOString();
  const timeMax = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();

  try {
    const response = await gapi.client.calendar.events.list({
      'calendarId': settings.calendarId,
      'timeMin': timeMin,
      'timeMax': timeMax,
      'showDeleted': false,
      'singleEvents': true,
      'maxResults': 500,
      'orderBy': 'startTime'
    });
    
    const events = response.result.items;
    
    gapiEvents = events.map(ev => {
      const startStr = ev.start.date || ev.start.dateTime.split('T')[0];
      let endStr = ev.end.date || ev.end.dateTime.split('T')[0];
      
      if (ev.end.date && startStr !== endStr) {
        const endD = new Date(endStr);
        endD.setDate(endD.getDate() - 1);
        endStr = renderDateStr(endD);
      }
      
      const colorId = ev.colorId;
      let mappedColor = 'bg-blue';
      if (colorId && googleColorToAppColor[colorId]) {
        mappedColor = googleColorToAppColor[colorId];
      }
      console.log(`Fetched Event: ${ev.summary}, colorId: ${colorId}, mappedColor: ${mappedColor}`);
      
      return {
        id: 'gapi_' + ev.id,
        title: ev.summary || '(無題)',
        start: startStr,
        end: endStr,
        color: mappedColor,
        isGoogle: true,
        htmlLink: ev.htmlLink
      };
    });
    
    renderCalendar();
  } catch (err) {
    console.error("Fetch Events Error", err);
    if(err.result && err.result.error && err.result.error.status === "UNAUTHENTICATED") {
      gapi.client.setToken('');
      initGapiAndFetch();
    } else {
      alert("カレンダーの予定取得に失敗しました。");
    }
  }
}

async function saveToGoogleCalendar(id, title, start, end, color) {
  const settings = getGapiSettings();
  const endD = new Date(end);
  endD.setDate(endD.getDate() + 1);
  const endStr = renderDateStr(endD);

  const eventBody = {
    summary: title,
    start: { date: start },
    end: { date: endStr }
  };

  if (color && appColorToGoogleColor[color]) {
    eventBody.colorId = appColorToGoogleColor[color];
    console.log(`Saving Event: ${title}, selectedColor: ${color}, mappedColorId: ${eventBody.colorId}`);
  }

  try {
    if (id && id.startsWith('gapi_')) {
      const realId = id.replace('gapi_', '');
      await gapi.client.calendar.events.patch({
        calendarId: settings.calendarId,
        eventId: realId,
        resource: eventBody
      });
    } else {
      await gapi.client.calendar.events.insert({
        calendarId: settings.calendarId,
        resource: eventBody
      });
    }
    document.getElementById("schedule-modal").classList.add("hidden");
    fetchGoogleEvents();
  } catch (err) {
    console.error("Save to Google Error", err);
    if (err.status === 401 || (err.result && err.result.error && err.result.error.status === "UNAUTHENTICATED")) {
      gapi.client.setToken('');
      sessionStorage.removeItem('gapi_token');
      alert("ログインの有効期限が切れました。再度ログイン（認証）をお願いします。");
      initGapiAndFetch();
    } else {
      alert("Googleカレンダーへの保存に失敗しました。");
    }
  }
}

async function deleteFromGoogleCalendar(id) {
  const settings = getGapiSettings();
  const realId = id.replace('gapi_', '');
  try {
    await gapi.client.calendar.events.delete({
      calendarId: settings.calendarId,
      eventId: realId
    });
    document.getElementById("schedule-modal").classList.add("hidden");
    fetchGoogleEvents();
  } catch(err) {
    console.error("Delete from Google Error", err);
    if (err.status === 401 || (err.result && err.result.error && err.result.error.status === "UNAUTHENTICATED")) {
      gapi.client.setToken('');
      sessionStorage.removeItem('gapi_token');
      alert("ログインの有効期限が切れました。再度ログイン（認証）をお願いします。");
      initGapiAndFetch();
    } else {
      alert("Googleカレンダーからの削除に失敗しました。");
    }
  }
}
