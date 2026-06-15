const semester = {
  start: "2026-06-01",
  end: "2026-10-16",
};

const holidays = [
  ["2026-06-01", "Bakri Id / commencement day"],
  ["2026-06-26", "Moharram"],
  ["2026-08-26", "Id-e-Milad"],
  ["2026-09-14", "Ganesh Chaturthi"],
  ["2026-09-15", "Ganpati vacation"],
  ["2026-09-16", "Ganpati vacation"],
  ["2026-09-17", "Ganpati vacation"],
  ["2026-09-18", "Ganpati vacation"],
  ["2026-09-25", "Anant Chaturdashi"],
  ["2026-10-02", "Gandhi Jayanti"],
  ["2026-10-16", "End of semester"],
];

const courses = {
  AD: { name: "Architectural Design", code: "B. Arch Sem V" },
  ABC: { name: "Architectural Building Construction III", code: "Studio + lecture" },
  HUM: { name: "Humanities", code: "Sem V" },
  ARD: { name: "Architectural Representation & Detailing", code: "Sem V" },
  LAND: { name: "Landscape & Design of Gardens", code: "Sem V" },
  CF: { name: "College Facilities", code: "Sem V" },
};

const weeklySchedule = {
  1: [
    { course: "ABC", start: "7:30 AM", end: "10:30 AM", type: "Studio" },
    { course: "ARD", start: "11:00 AM", end: "2:00 PM", type: "Studio" },
  ],
  2: [
    { course: "AD", start: "7:30 AM", end: "10:30 AM", type: "Studio" },
    { course: "HUM", start: "11:00 AM", end: "2:00 PM", type: "Lecture" },
  ],
  3: [
    { course: "AD", start: "7:30 AM", end: "10:30 AM", type: "Studio" },
    { course: "AD", start: "11:00 AM", end: "2:00 PM", type: "Studio" },
  ],
  4: [
    { course: "ABC", start: "7:30 AM", end: "10:30 AM", type: "Lecture / studio" },
    { course: "LAND", start: "11:00 AM", end: "2:00 PM", type: "Lecture / studio" },
  ],
  5: [
    { course: "HUM", start: "7:30 AM", end: "10:30 AM", type: "Lecture" },
    { course: "ABC", start: "11:00 AM", end: "2:00 PM", type: "Lecture" },
  ],
  6: [{ course: "CF", start: "8:45 AM", end: "2:20 PM", type: "Lecture block" }],
};

const holidayMap = new Map(holidays);
const storeKey = "attendance-guard-v1";
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

let state = loadState();
let selectedDate = getInitialDate();

const els = {
  welcome: document.querySelector("#welcome"),
  tracker: document.querySelector("#tracker"),
  enterApp: document.querySelector("#enterApp"),
  welcomeDate: document.querySelector("#welcomeDate"),
  welcomeHint: document.querySelector("#welcomeHint"),
  dayTitle: document.querySelector("#dayTitle"),
  targetAttendance: document.querySelector("#targetAttendance"),
  targetLabel: document.querySelector("#targetLabel"),
  summaryGrid: document.querySelector("#summaryGrid"),
  calendar: document.querySelector("#calendar"),
  semesterRange: document.querySelector("#semesterRange"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  dayMeta: document.querySelector("#dayMeta"),
  scheduleList: document.querySelector("#scheduleList"),
  markDayBunk: document.querySelector("#markDayBunk"),
  resetData: document.querySelector("#resetData"),
};

init();

function init() {
  els.targetAttendance.value = state.target;
  els.welcomeDate.textContent = longDate(selectedDate);
  els.welcomeHint.textContent = getClassesForDate(selectedDate).length
    ? `${getClassesForDate(selectedDate).length} classes scheduled.`
    : "No classes scheduled.";
  els.semesterRange.textContent = `${shortDate(parseDate(semester.start))} - ${shortDate(parseDate(semester.end))}`;

  els.enterApp.addEventListener("click", () => {
    els.welcome.classList.add("hidden");
    els.tracker.classList.remove("hidden");
    render();
  });

  els.targetAttendance.addEventListener("input", () => {
    state.target = Number(els.targetAttendance.value);
    saveState();
    render();
  });

  els.markDayBunk.addEventListener("click", () => {
    const classes = getClassesForDate(selectedDate);
    const allBunked = classes.every((item) => getStatus(selectedDate, item, "planned") === "bunk");
    classes.forEach((item) => setStatus(selectedDate, item, "planned", allBunked ? null : "bunk"));
    saveState();
    render();
  });

  els.resetData.addEventListener("click", () => {
    if (!confirm("Clear all attendance marks and mandatory bunks?")) return;
    state.records = {};
    saveState();
    render();
  });
}

function render() {
  els.targetLabel.textContent = `${state.target}%`;
  els.dayTitle.textContent = `Current day: ${longDate(getInitialDate())}`;
  renderSummary();
  renderCalendar();
  renderDay();
}

function renderSummary() {
  const target = state.target / 100;
  const cards = Object.entries(courses).map(([courseId, course]) => {
    const stats = calculateCourse(courseId, target);
    const percent = stats.total ? Math.round((stats.attended / stats.total) * 100) : 100;
    const progressClass = percent < state.target ? "danger" : percent >= state.target + 10 ? "good" : "";

    return `
      <article class="summary-card">
        <h3>${course.name}</h3>
        <span class="course-code">${course.code}</span>
        <div class="progress-track">
          <div class="progress-fill ${progressClass}" style="width:${Math.min(percent, 100)}%"></div>
        </div>
        <div class="card-row"><span>Current</span><strong>${stats.attended}/${stats.total} - ${stats.total ? percent : 0}%</strong></div>
        <div class="allowance">
          <div class="metric-box"><span>Can bunk</span><strong>${Math.max(0, stats.canBunk)}</strong><small>classes</small></div>
          <div class="metric-box must"><span>Must attend</span><strong>${Math.max(0, stats.mustAttend)}</strong><small>classes</small></div>
        </div>
        <div class="card-row"><span>Upcoming classes</span><strong>${stats.upcoming}</strong></div>
        <div class="card-row"><span>Mandatory bunks</span><strong>${stats.plannedBunks}</strong></div>
        <div class="card-row"><span>Projected total</span><strong>${stats.total + stats.upcoming}</strong></div>
      </article>
    `;
  });

  els.summaryGrid.innerHTML = cards.join("");
}

function renderCalendar() {
  const months = getSemesterMonths();
  els.calendar.innerHTML = months
    .map(({ year, month }) => {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const blanks = Array.from({ length: first.getDay() }, () => `<span class="blank-date"></span>`).join("");
      const dates = [];

      for (let day = 1; day <= last.getDate(); day += 1) {
        const date = new Date(year, month, day);
        const key = toKey(date);
        if (date < parseDate(semester.start) || date > parseDate(semester.end)) {
          dates.push(`<span class="blank-date"></span>`);
          continue;
        }

        const records = state.records[key] || {};
        const hasBunk = Object.values(records).some((item) => item.planned === "bunk");
        const hasMark = Object.values(records).some((item) => item.actual);
        const classes = [
          "date-button",
          key === toKey(selectedDate) ? "selected" : "",
          key === toKey(getInitialDate()) ? "today" : "",
          holidayMap.has(key) ? "holiday" : "",
          hasBunk ? "has-bunk" : "",
          hasMark ? "has-mark" : "",
        ]
          .filter(Boolean)
          .join(" ");

        dates.push(`<button class="${classes}" data-date="${key}" title="${holidayMap.get(key) || ""}">${day}</button>`);
      }

      return `
        <section class="month">
          <h4>${monthNames[month]} ${year}</h4>
          <div class="weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
          <div class="dates">${blanks}${dates.join("")}</div>
        </section>
      `;
    })
    .join("");

  els.calendar.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDate = parseDate(button.dataset.date);
      render();
    });
  });
}

function renderDay() {
  const classes = getClassesForDate(selectedDate);
  const key = toKey(selectedDate);
  const isHoliday = holidayMap.get(key);
  els.selectedDateTitle.textContent = longDate(selectedDate);
  els.dayMeta.textContent = isHoliday
    ? `Holiday / event: ${isHoliday}`
    : `${classes.length} scheduled class${classes.length === 1 ? "" : "es"}`;

  const allBunked = classes.length && classes.every((item) => getStatus(selectedDate, item, "planned") === "bunk");
  els.markDayBunk.textContent = allBunked ? "Remove bunk day" : "Mandatory bunk day";
  els.markDayBunk.disabled = classes.length === 0;

  if (!classes.length) {
    els.scheduleList.innerHTML = `<div class="empty-state">No regular classes for this day.</div>`;
    return;
  }

  els.scheduleList.innerHTML = classes
    .map((item) => {
      const id = classId(item);
      const actual = getStatus(selectedDate, item, "actual");
      const planned = getStatus(selectedDate, item, "planned");
      const course = courses[item.course];
      return `
        <article class="class-item">
          <div class="class-time">${item.start}<br />${item.end}</div>
          <div class="class-main">
            <strong>${course.name}</strong>
            <span>${item.type}</span>
          </div>
          <div class="class-actions" data-date="${key}" data-id="${id}">
            <button class="status-button attended ${actual === "attended" ? "active" : ""}" data-field="actual" data-value="attended" title="Attended">A</button>
            <button class="status-button missed ${actual === "missed" ? "active" : ""}" data-field="actual" data-value="missed" title="Missed">M</button>
            <button class="status-button bunk ${planned === "bunk" ? "active" : ""}" data-field="planned" data-value="bunk" title="Mandatory bunk">B</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.scheduleList.querySelectorAll(".status-button").forEach((button) => {
    button.addEventListener("click", () => {
      const parent = button.closest(".class-actions");
      const date = parseDate(parent.dataset.date);
      const item = classes.find((entry) => classId(entry) === parent.dataset.id);
      const current = getStatus(date, item, button.dataset.field);
      setStatus(date, item, button.dataset.field, current === button.dataset.value ? null : button.dataset.value);
      saveState();
      render();
    });
  });
}

function calculateCourse(courseId, target) {
  let attended = 0;
  let total = 0;
  let upcoming = 0;
  let plannedBunks = 0;
  const today = stripTime(getInitialDate());
  const end = parseDate(semester.end);

  for (let date = parseDate(semester.start); date <= end; date = addDays(date, 1)) {
    const classes = getClassesForDate(date).filter((item) => item.course === courseId);
    classes.forEach((item) => {
      const actual = getStatus(date, item, "actual");
      const planned = getStatus(date, item, "planned");
      if (actual) {
        total += 1;
        if (actual === "attended") attended += 1;
      } else if (date >= today) {
        upcoming += 1;
        if (planned === "bunk") plannedBunks += 1;
      }
    });
  }

  const projectedTotal = total + upcoming;
  const optionalBunks = Math.floor(attended + upcoming - plannedBunks - target * projectedTotal);
  const canBunk = Math.max(0, optionalBunks);
  const mustAttend = Math.max(0, upcoming - plannedBunks - canBunk);
  return { attended, total, upcoming, plannedBunks, canBunk, mustAttend };
}

function getClassesForDate(date) {
  const key = toKey(date);
  if (holidayMap.has(key)) return [];
  return weeklySchedule[date.getDay()] || [];
}

function getSemesterMonths() {
  const months = [];
  const start = parseDate(semester.start);
  const end = parseDate(semester.end);
  for (let year = start.getFullYear(), month = start.getMonth(); year < end.getFullYear() || month <= end.getMonth(); month += 1) {
    months.push({ year, month });
    if (month === 11) {
      year += 1;
      month = -1;
    }
  }
  return months;
}

function getInitialDate() {
  const real = stripTime(new Date());
  const start = parseDate(semester.start);
  const end = parseDate(semester.end);
  if (real >= start && real <= end) return real;
  return parseDate("2026-06-15");
}

function setStatus(date, item, field, value) {
  const dateKey = toKey(date);
  const id = classId(item);
  state.records[dateKey] ||= {};
  state.records[dateKey][id] ||= {};
  if (value) {
    state.records[dateKey][id][field] = value;
  } else {
    delete state.records[dateKey][id][field];
  }
  if (!state.records[dateKey][id].actual && !state.records[dateKey][id].planned) delete state.records[dateKey][id];
  if (!Object.keys(state.records[dateKey]).length) delete state.records[dateKey];
}

function getStatus(date, item, field) {
  return state.records[toKey(date)]?.[classId(item)]?.[field] || null;
}

function classId(item) {
  return `${item.course}-${item.start}-${item.end}`.replace(/\s+/g, "");
}

function loadState() {
  const fallback = { target: 75, records: {} };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(storeKey)) };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function longDate(date) {
  return `${weekdayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function shortDate(date) {
  return `${date.getDate()} ${monthNames[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}
