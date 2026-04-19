let currentYear = 2026;
let holidays = {};
// Fixed "Today" context for demonstration since the user's metadata says local time is April 19, 2026.
const realToday = new Date(2026, 3, 19); 

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const dayChars = ['日', '月', '火', '水', '木', '金', '土'];

const defaultSchedules = [
  { id: Date.now().toString() + '1', title: "新年イベント", start: "2026-01-01", end: "2026-01-03", color: "bg-orange" },
  { id: Date.now().toString() + '2', title: "システム移行", start: "2026-04-18", end: "2026-04-20", color: "bg-blue" },
  { id: Date.now().toString() + '3', title: "打ち合わせ", start: "2026-04-19", end: "2026-04-19", color: "bg-pink" },
  { id: Date.now().toString() + '4', title: "夏期休暇", start: "2026-08-10", end: "2026-08-15", color: "bg-green" },
  { id: Date.now().toString() + '5', title: "四半期報告会", start: "2026-10-05", end: "2026-10-05", color: "bg-purple" }
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
  });

  document.getElementById("btn-next-year").addEventListener("click", () => {
    currentYear++;
    document.getElementById("current-year").textContent = currentYear;
    renderCalendar();
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
});

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
      schedules.forEach(ev => {
        if (dateStr >= ev.start && dateStr <= ev.end) {
          const evEl = document.createElement("div");
          evEl.className = `event ${ev.color.replace('accent-', '')}`; // support legacy or new names
          evEl.textContent = ev.title;
          
          // Tooltip with title (natively handles overflow display needs nicely)
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
        }
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

  if (ev) {
    titleEl.textContent = "予定を編集";
    idInp.value = ev.id;
    titleInp.value = ev.title;
    startInp.value = ev.start;
    endInp.value = ev.end;
    delBtn.classList.remove("hidden");
    
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
    schedules = schedules.filter(s => s.id !== id);
    saveSchedules();
    closeM();
    renderCalendar();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("event-id").value;
    const title = document.getElementById("event-title").value;
    let start = document.getElementById("event-start").value;
    let end = document.getElementById("event-end").value;
    
    let color = Array.from(document.getElementsByName("color")).find(c => c.checked).value;
    // convert accent-blue to bg-blue
    color = color.replace("accent-", "bg-");

    if (start > end) {
      // Swap if user puts wrong order
      const temp = start;
      start = end;
      end = temp;
    }

    if (id) {
      // Edit
      const idx = schedules.findIndex(s => s.id === id);
      if (idx !== -1) schedules[idx] = { id, title, start, end, color };
    } else {
      // Create
      schedules.push({
        id: Date.now().toString(),
        title, start, end, color
      });
    }

    saveSchedules();
    closeM();
    renderCalendar();
  });
}
