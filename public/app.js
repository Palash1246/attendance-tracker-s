const semester = {
  start: "2026-06-01",
  end: "2026-10-16",
};

const holidays = [
  ["2026-06-01", "Bakri Id / commencement day"],
  ["2026-06-02", "Elective week"],
  ["2026-06-03", "Elective week"],
  ["2026-06-04", "Elective week"],
  ["2026-06-05", "Elective week"],
  ["2026-06-06", "Elective week"],
  ["2026-06-07", "Elective week"],
  ["2026-06-08", "Elective week"],
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
    { course: "ARD", start: "7:30 AM", end: "10:30 AM", type: "Studio" },
    { course: "ARD", start: "11:00 AM", end: "12:30 PM", type: "Studio" },
    { course: "AT3", start: "12:30 PM", end: "2:00 PM",  type: "Lecture" },
  ],
  2: [ // Tuesday
    { course: "AD",  start: "7:30 AM", end: "10:30 AM", type: "Studio" },
    { course: "HUM", start: "11:00 AM", end: "2:00 PM",  type: "Lecture" },
  ],
  3: [ // Wednesday
    { course: "ABS", start: "7:30 AM", end: "10:30 AM", type: "Studio" },
    { course: "ALD", start: "11:00 AM", end: "2:00 PM",  type: "Studio" },
  ],
  4: [ // Thursday
    { course: "ABC", start: "7:30 AM", end: "10:30 AM", type: "Lecture / studio" },
    { course: "TDS", start: "11:00 AM", end: "2:00 PM",  type: "Lecture" },
  ],
  5: [ // Friday
    { course: "AD",  start: "7:30 AM", end: "10:30 AM", type: "Studio" },
    { course: "CF",  start: "11:00 AM", end: "2:00 PM", type: "Lecture block" },
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
    if (session.username === "admin") {
      showWelcome();
    } else {
      const loaded = await loadUserState(session.username);
      if (loaded) {
        showWelcome();
      } else {
        session = null;
        localStorage.removeItem(localSessionKey);
      }
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
      if (session?.username === "admin") {
        els.fabAddEvent.hidden = true;
        document.querySelector("#userAppBody").classList.add("hidden");
        document.querySelector("#adminAppBody").classList.remove("hidden");
        switchAdminTab("adminUsersView");
        loadAdminData();
      } else {
        els.fabAddEvent.hidden = false;
        document.querySelector("#userAppBody").classList.remove("hidden");
        document.querySelector("#adminAppBody").classList.add("hidden");
        render();
      }
    });

    els.logout.addEventListener("click", () => {
      session = null;
      localStorage.removeItem(localSessionKey);
      state = blankState();
      els.tracker.classList.add("hidden");
      els.welcome.classList.add("hidden");
      els.login.classList.remove("hidden");
      els.fabAddEvent.hidden = true;
      document.querySelector("#userAppBody").classList.remove("hidden");
      document.querySelector("#adminAppBody").classList.add("hidden");
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
    const activeClasses = classes.filter(item => getStatus(selectedDate, item, "actual") !== "cancelled");
    if (activeClasses.length === 0) return;
    const allBunked = activeClasses.every((item) => getStatus(selectedDate, item, "planned") === "bunk");
    activeClasses.forEach((item) => setStatus(selectedDate, item, "planned", allBunked ? null : "bunk"));
    await saveState();
    render();
  });

  els.resetData.addEventListener("click", async () => {
    if (!confirm("Clear all attendance marks and mandatory bunks?")) return;
    state.records = {};
    await saveState();
    render();
  });

  // ── Admin Dashboard Events ──
  const refreshBtn = document.querySelector("#adminRefresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      await loadAdminData();
    });
  }

  document.querySelectorAll("#adminAppBody .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchAdminTab(btn.dataset.panel));
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

  if (username === "admin") {
    if (!hasServer) {
      setAuthMessage("Admin dashboard requires a server connection.");
      return;
    }
  }

  try {
    const result = await api(`/${mode}`, { username, password });
    session = { username: result.username, token: result.token };
    localStorage.setItem(localSessionKey, JSON.stringify(session));
    if (username === "admin") {
      state = blankState();
    } else {
      state = normalizeState(result.state);
    }
    showWelcome();
  } catch (error) {
    if (username === "admin") {
      setAuthMessage("Admin dashboard requires a server connection.");
      return;
    }

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

  if (session?.username === "admin") {
    els.welcomeDate.textContent = longDate(selectedDate);
    els.welcomeHint.textContent = "Admin Terminal Access.";
    els.semesterRange.textContent = "Managing Academy of Architecture Sem V";
    return;
  }

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
        const activeRecords = Object.values(records).filter((item) => item.actual !== "cancelled");
        const hasBunk = activeRecords.some((item) => item.planned === "bunk");
        const hasMark = activeRecords.some((item) => item.actual === "attended" || item.actual === "missed");
        const hasCancelled = Object.values(records).some((item) => item.actual === "cancelled") && !hasMark && !hasBunk;
        const classes = [
          "date-button",
          key === toKey(selectedDate) ? "selected" : "",
          key === toKey(getInitialDate()) ? "today" : "",
          holidayMap.has(key) ? "holiday" : "",
          hasBunk ? "has-bunk" : "",
          hasMark ? "has-mark" : "",
          hasCancelled ? "has-cancelled" : "",
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

  const activeClasses = classes.filter(item => getStatus(selectedDate, item, "actual") !== "cancelled");
  const allBunked = activeClasses.length && activeClasses.every((item) => getStatus(selectedDate, item, "planned") === "bunk");
  els.markDayBunk.textContent = allBunked ? "Remove bunk day" : "Mandatory bunk day";
  els.markDayBunk.disabled = activeClasses.length === 0;

  if (!classes.length) {
    els.scheduleList.innerHTML = `<div class="empty-state">No regular classes for this day.</div>`;
  } else {
    els.scheduleList.innerHTML = classes
      .map((item) => {
        const id = classId(item);
        const actual = getStatus(selectedDate, item, "actual");
        const planned = getStatus(selectedDate, item, "planned");
        const course = courses[item.course];
        const isCancelled = actual === "cancelled";
        return `
          <article class="class-item${isCancelled ? " cancelled" : ""}" data-course="${item.course}">
            <div class="class-time">${item.start}<br />${item.end}</div>
            <div class="class-main">
              <strong>${course.name}</strong>
              <span>${item.type}${isCancelled ? ` <span class="cancelled-badge">CANC</span>` : ""}</span>
            </div>
            <div class="class-actions" data-date="${key}" data-id="${id}">
              <button class="status-button attended ${actual === "attended" ? "active" : ""}" data-field="actual" data-value="attended" title="Attended">A</button>
              <button class="status-button missed ${actual === "missed" ? "active" : ""}" data-field="actual" data-value="missed" title="Missed">M</button>
              <button class="status-button cancelled-btn ${isCancelled ? "active" : ""}" data-field="actual" data-value="cancelled" title="Cancelled">⊘</button>
              <button class="status-button bunk ${planned === "bunk" ? "active" : ""}" data-field="planned" data-value="bunk" title="Mandatory bunk" ${isCancelled ? "disabled" : ""}>B</button>
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
      if (actual === "cancelled") {
        return;
      }
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
  if (session.username === "admin") return;
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
              ${isHol ? `<span class=\"week-hol-tag\">${holidayMap.get(dateKey)}</span>` : ""}
            </div>
            <div class="week-slots">
              ${isHol
        ? `<div class="week-slot week-slot-holiday">
                     <span class="week-slot-name">Holiday</span>
                     <span class="week-slot-sub">${holidayMap.get(dateKey)}</span>
                   </div>`
        : slots.length
          ? slots.map(clsItem => {
              const actual = getStatus(date, clsItem, "actual");
              const isCancelled = actual === "cancelled";
              return `
                <div class="week-slot${isCancelled ? " cancelled" : ""}" data-course="${clsItem.course}">
                  <span class="week-slot-time">${clsItem.start} – ${clsItem.end}${isCancelled ? ` <span class="cancelled-badge">CANC</span>` : ""}</span>
                  <strong class="week-slot-name">${courses[clsItem.course].name}</strong>
                  <span class="week-slot-sub">${clsItem.type}</span>
                </div>`;
            }).join("")
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

// ─────────────────────────────────── ADMIN DASHBOARD LOGIC
let adminUsersData = [];

const userColors = [
  "var(--course-AD)",
  "var(--course-ABC)",
  "var(--course-HUM)",
  "var(--course-ARD)",
  "var(--course-AT3)",
  "var(--course-ABS)",
  "var(--course-ALD)",
  "var(--course-TDS)",
  "var(--course-CF)",
];

function getUserColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % userColors.length;
  return userColors[index];
}

function calculateCourseForState(userState, courseId, target) {
  let attended = 0;
  let total = 0;
  let upcoming = 0;
  let plannedBunks = 0;
  const today = stripTime(getInitialDate());
  const end = parseDate(semester.end);

  for (let date = parseDate(semester.start); date <= end; date = addDays(date, 1)) {
    const classes = getClassesForDate(date).filter((item) => item.course === courseId);
    classes.forEach((item) => {
      const records = userState.records[toKey(date)] || {};
      const rec = records[classId(item)] || {};
      const actual = rec.actual || null;
      const planned = rec.planned || null;
      if (actual === "cancelled") {
        return;
      }
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

function calculateUserState(userState) {
  const target = (userState.target || 75) / 100;
  let totalAttended = 0;
  let totalHeld = 0;
  let totalMissed = 0;
  let totalCancelled = 0;
  let totalBunked = 0;

  const courseStats = {};
  Object.keys(courses).forEach((courseId) => {
    const stats = calculateCourseForState(userState, courseId, target);
    courseStats[courseId] = stats;
    totalAttended += stats.attended;
    totalHeld += stats.total;
  });

  for (const record of Object.values(userState.records || {})) {
    for (const info of Object.values(record || {})) {
      if (info.actual === "missed") {
        totalMissed += 1;
      } else if (info.actual === "cancelled") {
        totalCancelled += 1;
      }
      if (info.planned === "bunk") {
        totalBunked += 1;
      }
    }
  }

  const overallPercent = totalHeld ? Math.round((totalAttended / totalHeld) * 100) : 100;
  return {
    overallPercent,
    totalHeld,
    totalAttended,
    totalMissed,
    totalCancelled,
    totalBunked,
    courseStats,
  };
}

async function loadAdminData() {
  if (session?.username !== "admin") return;
  try {
    const result = await api(`/admin/users?token=${encodeURIComponent(session.token)}`);
    adminUsersData = result.users || [];
    renderAdminDashboard();
  } catch (error) {
    console.error("Failed to load admin data:", error);
  }
}

function switchAdminTab(panelId) {
  document.querySelectorAll("#adminAppBody .tab-btn").forEach((btn) => {
    const active = btn.dataset.panel === panelId;
    btn.classList.toggle("tab-active", active);
    btn.setAttribute("aria-selected", active);
  });
  document.querySelectorAll(".admin-view-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== panelId);
  });
  if (panelId === "adminCalendarView") {
    renderAdminCalendar();
    renderAdminDayDetails();
  }
}

function renderAdminDashboard() {
  renderAdminUsers();
  renderAdminCalendar();
  renderAdminDayDetails();
  renderAdminStats();
}

function renderAdminUsers() {
  const grid = document.querySelector("#adminUsersGrid");
  if (!grid) return;

  if (adminUsersData.length === 0) {
    grid.innerHTML = '<div class="empty-state">No users registered yet.</div>';
    return;
  }

  grid.innerHTML = adminUsersData
    .map((user) => {
      const metrics = calculateUserState(user.state);
      const color = getUserColor(user.username);
      const createdStr = new Date(user.createdAt).toLocaleDateString();
      const updatedStr = new Date(user.updatedAt).toLocaleDateString();

      return `
        <article class="summary-card admin-user-card" style="position: relative; padding-left: 24px;">
          <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${color};"></div>
          <h3>@${user.username}</h3>
          <span class="course-code" style="color: ${color};">Active User</span>
          <div class="card-row"><span>Created</span><strong>${createdStr}</strong></div>
          <div class="card-row"><span>Last Updated</span><strong>${updatedStr}</strong></div>
          <div class="card-row"><span>Courses</span><strong>${Object.keys(courses).length} tracked</strong></div>
          <div class="allowance" style="grid-template-columns: 1fr;">
            <div class="metric-box">
              <span>Overall Attendance</span>
              <strong style="color: ${color};">${metrics.overallPercent}%</strong>
              <small>${metrics.totalAttended} / ${metrics.totalHeld} classes held</small>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function hasSpecificAdminActivity(user, dateKey) {
  const record = user.state.records[dateKey] || {};
  const hasBunkOrCancel = Object.values(record).some(
    (r) => r.planned === "bunk" || r.actual === "cancelled" || r.actual === "missed"
  );
  const hasEvent = (user.state.events || []).some((ev) => ev.date === dateKey);
  return hasBunkOrCancel || hasEvent;
}

function renderAdminCalendar() {
  const calendarEl = document.querySelector("#adminCalendar");
  if (!calendarEl) return;

  const months = getSemesterMonths();
  calendarEl.innerHTML = months
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

        const activeUsers = adminUsersData.filter((user) => hasSpecificAdminActivity(user, key));

        const classes = [
          "date-button",
          "admin-date-btn",
          key === toKey(selectedDate) ? "selected" : "",
          key === toKey(getInitialDate()) ? "today" : "",
          holidayMap.has(key) ? "holiday" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const dotsHtml = activeUsers
          .map(
            (u) =>
              `<span class="admin-dot" style="background: ${getUserColor(
                u.username
              )}" title="@${u.username}"></span>`
          )
          .join("");

        dates.push(`
          <button class="${classes}" data-date="${key}" title="${holidayMap.get(key) || ""}">
            <span>${day}</span>
            <span class="admin-dots">${dotsHtml}</span>
          </button>
        `);
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

  calendarEl.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDate = parseDate(button.dataset.date);
      renderAdminCalendar();
      renderAdminDayDetails();
    });
  });
}

function renderAdminDayDetails() {
  const container = document.querySelector("#adminDayDetails");
  const title = document.querySelector("#adminSelectedDateTitle");
  if (!container || !title) return;

  const key = toKey(selectedDate);
  title.textContent = longDate(selectedDate);

  const classes = getClassesForDate(selectedDate);
  const holiday = holidayMap.get(key);

  if (holiday) {
    container.innerHTML = `<div class="empty-state">Holiday / event: ${holiday}</div>`;
    return;
  }

  let html = "";

  adminUsersData.forEach((user) => {
    const color = getUserColor(user.username);
    const userRecords = user.state.records[key] || {};
    const userEvents = (user.state.events || []).filter((ev) => ev.date === key);

    let classHtml = "";
    if (classes.length === 0) {
      classHtml = `<div style="color: var(--muted); font-size: 0.7rem;">No classes scheduled.</div>`;
    } else {
      classHtml = classes
        .map((item) => {
          const id = classId(item);
          const record = userRecords[id] || {};
          let statusText = "Unmarked";
          let statusClass = "unmarked";
          if (record.actual === "attended") {
            statusText = "Attended ✓";
            statusClass = "attended";
          } else if (record.actual === "missed") {
            statusText = "Missed ✗";
            statusClass = "missed";
          } else if (record.actual === "cancelled") {
            statusText = "Cancelled ⊘";
            statusClass = "cancelled";
          }

          if (record.planned === "bunk") {
            statusText += " (Planned Bunk)";
          }

          return `
          <div class="admin-user-class-row">
            <span><strong>${item.course}</strong> (${item.start} - ${item.end})</span>
            <span class="admin-class-status ${statusClass}">${statusText}</span>
          </div>
        `;
        })
        .join("");
    }

    let eventHtml = "";
    if (userEvents.length > 0) {
      eventHtml = userEvents
        .map(
          (ev) => `
        <div class="admin-user-event-row">
          <span class="event-dot" style="background: ${color}"></span>
          <span>${ev.name} ${ev.allDay ? "(All Day)" : `@ ${ev.time}`}</span>
        </div>
      `
        )
        .join("");
    }

    if (classes.length > 0 || userEvents.length > 0) {
      html += `
        <div class="admin-user-day-card" style="border-left: 3px solid ${color};">
          <h4 style="color: ${color}; margin-bottom: 8px;">@${user.username}</h4>
          <div class="admin-user-classes">
            <p class="eyebrow" style="font-size: 0.55rem; margin-bottom: 4px;">Class Marks</p>
            ${classHtml}
          </div>
          ${
            userEvents.length > 0
              ? `
          <div class="admin-user-events" style="margin-top: 8px;">
            <p class="eyebrow" style="font-size: 0.55rem; margin-bottom: 4px;">Events</p>
            ${eventHtml}
          </div>
          `
              : ""
          }
        </div>
      `;
    }
  });

  container.innerHTML = html || '<div class="empty-state">No user activity recorded for this day.</div>';
}

function renderAdminStats() {
  const tbody = document.querySelector("#adminStatsTableBody");
  if (!tbody) return;

  tbody.innerHTML = adminUsersData
    .map((user) => {
      const color = getUserColor(user.username);
      const metrics = calculateUserState(user.state);

      const formatCoursePercent = (courseId) => {
        const stats = metrics.courseStats[courseId];
        if (!stats) return "-";
        return stats.total ? `${Math.round((stats.attended / stats.total) * 100)}%` : "100%";
      };

      const lastActive = user.updatedAt
        ? new Date(user.updatedAt).toLocaleString()
        : new Date(user.createdAt).toLocaleString();

      return `
      <tr>
        <td style="color: ${color}; font-weight: bold;">@${user.username}</td>
        <td style="font-size: 0.7rem; color: var(--muted);">${lastActive}</td>
        <td style="font-weight: bold; color: ${color};">${metrics.overallPercent}%</td>
        <td>${formatCoursePercent("AD")}</td>
        <td>${formatCoursePercent("ABC")}</td>
        <td>${formatCoursePercent("HUM")}</td>
        <td>${formatCoursePercent("ARD")}</td>
        <td>${formatCoursePercent("AT3")}</td>
        <td>${formatCoursePercent("ABS")}</td>
        <td>${formatCoursePercent("ALD")}</td>
        <td>${formatCoursePercent("TDS")}</td>
        <td>${formatCoursePercent("CF")}</td>
        <td>${metrics.totalHeld}</td>
        <td style="color: var(--green); font-weight: bold;">${metrics.totalAttended}</td>
        <td style="color: var(--red);">${metrics.totalMissed}</td>
        <td style="color: var(--muted);">${metrics.totalCancelled}</td>
        <td style="color: var(--purple);">${metrics.totalBunked}</td>
        <td>${user.state.events?.length || 0}</td>
      </tr>
    `;
    })
    .join("");
}
