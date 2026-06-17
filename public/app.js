const semester = {
  start: "2026-06-01",
  end: "2026-10-16",
};

const holidays = [
  ["2026-06-01", "Bakri Id / commencement day"],
  ["2026-06-26", "Moharram"],
  ["2026-08-15", "Independence Day / Parsi New Year"],
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
  AD: { name: "Architectural Design", code: "Studio" },
  ABC: { name: "Architectural Building Construction III", code: "Studio + lecture" },
  HUM: { name: "Humanities", code: "Lecture" },
  ARD: { name: "Architectural Representation & Detailing", code: "Studio" },
  AT3: { name: "Architectural Theory 3", code: "Lecture" },
  ABS: { name: "Architectural Building Services", code: "Studio" },
  ALD: { name: "Landscaping & Allied Design", code: "Studio" },
  TDS: { name: "Theory & Design of Structures", code: "Lecture" },
  CF: { name: "College Projects", code: "Sem V" },
};

const weeklySchedule = {
  1: [ // Monday
    { course: "ARD", start: "7:50 AM",  end: "10:20 AM", type: "Studio" },
    { course: "ARD", start: "11:00 AM", end: "12:30 PM", type: "Studio" },
    { course: "AT3", start: "12:30 PM", end: "2:00 PM",  type: "Lecture" },
  ],
  2: [ // Tuesday
    { course: "AD",  start: "7:50 AM",  end: "10:20 AM", type: "Studio" },
    { course: "HUM", start: "11:00 AM", end: "2:00 PM",  type: "Lecture" },
  ],
  3: [ // Wednesday
    { course: "ABS", start: "7:50 AM",  end: "10:20 AM", type: "Studio" },
    { course: "ALD", start: "11:00 AM", end: "2:00 PM",  type: "Studio" },
  ],
  4: [ // Thursday
    { course: "ABC", start: "7:50 AM",  end: "10:20 AM", type: "Lecture / studio" },
    { course: "TDS", start: "11:00 AM", end: "2:00 PM",  type: "Lecture" },
  ],
  5: [ // Friday
    { course: "AD",  start: "7:50 AM",  end: "10:20 AM", type: "Studio" },
    { course: "CF",  start: "11:00 AM", end: "2:00 PM",  type: "Lecture block" },
  ],
};

const holidayMap = new Map(holidays);
const localSessionKey = "attendance-guard-session";
const localStatePrefix = "attendance-guard-state:";
const themeKey = "attendance-guard-theme";
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

let session = loadSession();
let state = blankState();
let selectedDate = getInitialDate();
let authMode = "login";
let hasServer = location.protocol !== "file:";

const els = {
  login: document.querySelector("#login"),
  authForm: document.querySelector("#authForm"),
  loginButton: document.querySelector("#loginButton"),
  registerButton: document.querySelector("#registerButton"),
  username: document.querySelector("#username"),
  password: document.querySelector("#password"),
  authMessage: document.querySelector("#authMessage"),
  themeToggle: document.querySelector("#themeToggle"),
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
  activeUser: document.querySelector("#activeUser"),
  logout: document.querySelector("#logout"),
  // week view
  trackerView: document.querySelector("#trackerView"),
  weeklyPanel: document.querySelector("#weeklyPanel"),
  // event modal
  fabAddEvent: document.querySelector("#fabAddEvent"),
  eventModal: document.querySelector("#eventModal"),
  eventForm: document.querySelector("#eventForm"),
  eventName: document.querySelector("#eventName"),
  eventDate: document.querySelector("#eventDate"),
  eventAllDay: document.querySelector("#eventAllDay"),
  eventTimeField: document.querySelector("#eventTimeField"),
  eventTime: document.querySelector("#eventTime"),
  eventFormMessage: document.querySelector("#eventFormMessage"),
  closeModal: document.querySelector("#closeModal"),
  cancelModal: document.querySelector("#cancelModal"),
};

init();

async function init() {
  applyTheme(localStorage.getItem(themeKey) || "forest");
  bindGlobalEvents();
  updateWelcomePreview();

  if (session?.username && session?.token) {
    const loaded = await loadUserState(session.username);
    if (loaded) {
      showWelcome();
    } else {
      session = null;
      localStorage.removeItem(localSessionKey);
    }
  }
}

function bindGlobalEvents() {
  els.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "forest" ? "rose" : "forest";
    applyTheme(nextTheme);
  });

  // ── Tab buttons ──
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.panel));
  });

  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await authenticate(authMode);
  });

  els.loginButton.addEventListener("click", async () => {
    authMode = "login";
    await authenticate("login");
  });

  els.registerButton.addEventListener("click", async () => {
    authMode = "register";
    await authenticate("register");
  });

  els.enterApp.addEventListener("click", () => {
    els.welcome.classList.add("hidden");
    els.tracker.classList.remove("hidden");
    els.fabAddEvent.hidden = false;
    render();
  });

  els.logout.addEventListener("click", () => {
    session = null;
    localStorage.removeItem(localSessionKey);
    state = blankState();
    els.tracker.classList.add("hidden");
    els.welcome.classList.add("hidden");
    els.login.classList.remove("hidden");
    els.fabAddEvent.hidden = true;
  });

  // ── FAB + modal ──
  els.fabAddEvent.addEventListener("click", openEventModal);
  els.closeModal.addEventListener("click", closeEventModal);
  els.cancelModal.addEventListener("click", closeEventModal);

  // Close on backdrop click
  els.eventModal.addEventListener("click", (e) => {
    if (e.target === els.eventModal) closeEventModal();
  });

  // Toggle time field visibility
  els.eventAllDay.addEventListener("change", () => {
    const allDay = els.eventAllDay.checked;
    els.eventTimeField.classList.toggle("hidden", allDay);
    els.eventTime.required = !allDay;
  });

  // Save event
  els.eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = els.eventName.value.trim();
    const date = els.eventDate.value;
    const allDay = els.eventAllDay.checked;
    const time = allDay ? null : els.eventTime.value;

    if (!name) { els.eventFormMessage.textContent = "Enter a name."; return; }
    if (!date) { els.eventFormMessage.textContent = "Pick a date."; return; }
    if (!allDay && !time) { els.eventFormMessage.textContent = "Enter a time or check all day."; return; }

    const event = { id: Date.now().toString(36), name, date, allDay, time: time || null };
    state.events = state.events || [];
    state.events.push(event);
    await saveState();
    closeEventModal();
    render();
  });

  els.targetAttendance.addEventListener("input", async () => {
    state.target = Number(els.targetAttendance.value);
    await saveState();
    render();
  });

  els.markDayBunk.addEventListener("click", async () => {
    const classes = getClassesForDate(selectedDate);
    const allBunked = classes.every((item) => getStatus(selectedDate, item, "planned") === "bunk");
    classes.forEach((item) => setStatus(selectedDate, item, "planned", allBunked ? null : "bunk"));
    await saveState();
    render();
  });

  els.resetData.addEventListener("click", async () => {
    if (!confirm("Clear all attendance marks and mandatory bunks?")) return;
    state.records = {};
    await saveState();
    render();
  });
}

async function authenticate(mode) {
  const username = els.username.value.trim();
  const password = els.password.value;
  setAuthMessage("");

  if (!username || !password) {
    setAuthMessage("Enter a username and password.");
    return;
  }

  try {
    const result = await api(`/${mode}`, { username, password });
    session = { username: result.username, token: result.token };
    localStorage.setItem(localSessionKey, JSON.stringify(session));
    state = normalizeState(result.state);
    showWelcome();
  } catch (error) {
    if (hasServer) {
      setAuthMessage(error.message || "Could not sign in.");
      return;
    }

    if (mode === "register") {
      const existing = localStorage.getItem(`${localStatePrefix}${username}`);
      if (existing) {
        setAuthMessage("That username already exists on this browser.");
        return;
      }
    }

    session = { username };
    localStorage.setItem(localSessionKey, JSON.stringify(session));
    state = loadLocalState(username);
    await saveState();
    showWelcome();
  }
}

function showWelcome() {
  els.login.classList.add("hidden");
  els.tracker.classList.add("hidden");
  els.welcome.classList.remove("hidden");
  els.activeUser.textContent = session?.username ? `@${session.username}` : "";
  els.targetAttendance.value = state.target;
  updateWelcomePreview();
}

function updateWelcomePreview() {
  els.welcomeDate.textContent = longDate(selectedDate);
  els.welcomeHint.textContent = getClassesForDate(selectedDate).length
    ? `${getClassesForDate(selectedDate).length} classes scheduled.`
    : "No classes scheduled.";
  els.semesterRange.textContent = `${shortDate(parseDate(semester.start))} - ${shortDate(parseDate(semester.end))}`;
}

function render() {
  els.targetLabel.textContent = `${state.target}%`;
  els.activeUser.textContent = session?.username ? `@${session.username}` : "";
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
      <article class="summary-card" data-course="${courseId}">
        <h3>${course.name}</h3>
        <span class="course-code">${course.code}</span>
        <div class="progress-track">
          <div class="progress-fill ${progressClass}" style="width:${Math.min(percent, 100)}%"></div>
        </div>
        <div class="card-row"><span>Current</span><strong>${stats.attended}/${stats.total} · ${stats.total ? percent : 0}%</strong></div>
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
  } else {
    els.scheduleList.innerHTML = classes
      .map((item) => {
        const id = classId(item);
        const actual = getStatus(selectedDate, item, "actual");
        const planned = getStatus(selectedDate, item, "planned");
        const course = courses[item.course];
        return `
          <article class="class-item" data-course="${item.course}">
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
      button.addEventListener("click", async () => {
        const parent = button.closest(".class-actions");
        const date = parseDate(parent.dataset.date);
        const item = classes.find((entry) => classId(entry) === parent.dataset.id);
        const current = getStatus(date, item, button.dataset.field);
        setStatus(date, item, button.dataset.field, current === button.dataset.value ? null : button.dataset.value);
        await saveState();
        render();
      });
    });
  }

  // ── Events for this date ──
  const dayEvents = (state.events || []).filter((ev) => ev.date === key);

  // Remove any previous events section
  const existing = els.scheduleList.parentElement.querySelector(".events-section");
  if (existing) existing.remove();

  if (dayEvents.length) {
    const section = document.createElement("div");
    section.className = "events-section";
    section.innerHTML = `
      <p class="eyebrow">Events &amp; tasks</p>
      ${dayEvents.map((ev) => `
        <div class="event-item">
          <span class="event-dot"></span>
          <div class="event-body">
            <span class="event-name">${ev.name}</span>
            <span class="event-time">${ev.allDay ? "All day" : ev.time}</span>
          </div>
          <button class="event-delete" data-event-id="${ev.id}" title="Delete event">&times;</button>
        </div>
      `).join("")}
    `;
    section.querySelectorAll(".event-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        deleteEvent(btn.dataset.eventId);
        await saveState();
        render();
      });
    });
    els.scheduleList.parentElement.appendChild(section);
  }
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

async function loadUserState(username) {
  try {
    const result = await api(`/state?username=${encodeURIComponent(username)}&token=${encodeURIComponent(session.token)}`);
    state = normalizeState(result.state);
    hasServer = true;
    return true;
  } catch (error) {
    if (error.status === 401) return false;
    state = loadLocalState(username);
    hasServer = false;
    return true;
  }
}

async function saveState() {
  if (!session?.username) return;
  if (hasServer) {
    try {
      await api("/state", { username: session.username, token: session.token, state });
      return;
    } catch {
      hasServer = false;
    }
  }
  localStorage.setItem(`${localStatePrefix}${session.username}`, JSON.stringify(state));
}

async function api(path, body) {
  const options = body
    ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
    : undefined;
  const response = await fetch(`/api${path}`, options);
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(localSessionKey));
  } catch {
    return null;
  }
}

function loadLocalState(username) {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(`${localStatePrefix}${username}`)));
  } catch {
    return blankState();
  }
}

function blankState() {
  return { target: 75, records: {}, events: [] };
}

function normalizeState(value) {
  return {
    ...blankState(),
    ...(value || {}),
    records: value?.records || {},
    events: Array.isArray(value?.events) ? value.events : [],
  };
}

function setAuthMessage(message) {
  els.authMessage.textContent = message;
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
  els.themeToggle.textContent = theme === "forest" ? "Rose" : "Forest";
  els.themeToggle.title = theme === "forest" ? "Switch to rose theme" : "Switch to forest theme";
}

function openEventModal() {
  // Pre-fill date to currently selected calendar day
  els.eventDate.value = toKey(selectedDate);
  // Reset rest of the form
  els.eventName.value = "";
  els.eventAllDay.checked = false;
  els.eventTime.value = "";
  els.eventTimeField.classList.remove("hidden");
  els.eventTime.required = true;
  els.eventFormMessage.textContent = "";
  els.eventModal.showModal();
  els.eventName.focus();
}

function closeEventModal() {
  els.eventModal.close();
  els.eventFormMessage.textContent = "";
}

function deleteEvent(id) {
  state.events = (state.events || []).filter((ev) => ev.id !== id);
}

// ─────────────────────────────────── TAB SWITCHING
function switchTab(panelId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.panel === panelId;
    btn.classList.toggle("tab-active", active);
    btn.setAttribute("aria-selected", active);
  });
  els.trackerView.classList.toggle("hidden", panelId !== "trackerView");
  els.weeklyPanel.classList.toggle("hidden", panelId !== "weeklyPanel");
  if (panelId === "weeklyPanel") renderWeekly();
}

// ─────────────────────────────────── WEEKLY SCHEDULE VIEW
function renderWeekly() {
  // Monday of the current week
  const today = getInitialDate();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const weekStart = addDays(today, mondayOffset);

  const DAY_META = [
    { index: 1, label: "MON", full: "Monday" },
    { index: 2, label: "TUE", full: "Tuesday" },
    { index: 3, label: "WED", full: "Wednesday" },
    { index: 4, label: "THU", full: "Thursday" },
    { index: 5, label: "FRI", full: "Friday" },
  ];

  els.weeklyPanel.innerHTML = `
    <div class="week-header-row">
      <p class="eyebrow">Weekly schedule</p>
      <span class="week-week-label">
        ${shortDate(weekStart)} – ${shortDate(addDays(weekStart, 4))}
      </span>
    </div>
    <div class="week-container">
      ${DAY_META.map(({ index, label, full }) => {
    const date = addDays(weekStart, index - 1);
    const dateKey = toKey(date);
    const isToday = dateKey === toKey(today);
    const isHol = holidayMap.has(dateKey);
    const slots = weeklySchedule[index] || [];

    return `
          <div class="week-day-col${isToday ? " week-today" : ""}${isHol ? " week-holiday" : ""}"
               data-date="${dateKey}"
               title="Go to ${full}">
            <div class="week-day-head">
              <span class="week-day-label">${label}</span>
              <span class="week-day-date">${date.getDate()} ${monthNames[date.getMonth()].slice(0, 3)}</span>
              ${isToday ? "<span class=\"week-today-pip\"></span>" : ""}
              ${isHol ? `<span class="week-hol-tag">${holidayMap.get(dateKey)}</span>` : ""}
            </div>
            <div class="week-slots">
              ${isHol
        ? `<div class="week-slot week-slot-holiday">
                     <span class="week-slot-name">Holiday</span>
                     <span class="week-slot-sub">${holidayMap.get(dateKey)}</span>
                   </div>`
        : slots.length
          ? slots.map(cls => `
                      <div class="week-slot" data-course="${cls.course}">
                        <span class="week-slot-time">${cls.start} – ${cls.end}</span>
                        <strong class="week-slot-name">${courses[cls.course].name}</strong>
                        <span class="week-slot-sub">${cls.type}</span>
                      </div>`).join("")
          : `<div class="week-slot week-slot-empty">
                       <span class="week-slot-name">No classes</span>
                     </div>`
      }
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;

  // Click a day column → jump to that date in the courses/calendar tab
  els.weeklyPanel.querySelectorAll(".week-day-col").forEach((col) => {
    col.addEventListener("click", () => {
      const date = parseDate(col.dataset.date);
      const start = parseDate(semester.start);
      const end = parseDate(semester.end);
      if (date >= start && date <= end) selectedDate = date;
      switchTab("trackerView");
      render();
    });
  });
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
