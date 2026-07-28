const semester = {
  start: "2026-06-01",
  end: "2026-10-16",
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


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
  maintenance: document.querySelector("#maintenance"),
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
  bouquetBtn: document.querySelector("#bouquetBtn"),
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

  if (hasServer) {
    try {
      const status = await api("/status");
      if (status.maintenance) {
        els.login.classList.add("hidden");
        els.maintenance.classList.remove("hidden");
        return;
      }
    } catch (err) {
      // Proceed normally if check fails
    }
  }

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

  const signupToggle = document.querySelector("#adminDisableRegistration");
  if (signupToggle) {
    signupToggle.addEventListener("change", async () => {
      const disabled = signupToggle.checked;
      try {
        await api("/admin/settings", {
          token: session.token,
          registrationDisabled: disabled,
        });
      } catch (error) {
        alert(error.message || "Failed to update global settings.");
        signupToggle.checked = !disabled;
      }
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
  if (els.bouquetBtn) els.bouquetBtn.style.display = (session?.username === "sanikaaa_jain" || session?.username === "test") ? "inline-block" : "none";

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
  if (els.bouquetBtn) els.bouquetBtn.style.display = (session?.username === "sanikaaa_jain" || session?.username === "test") ? "inline-block" : "none";
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
    els.scheduleList.innerHTML = "";
    classes.forEach((item) => {
      const id          = classId(item);
      const actual      = getStatus(selectedDate, item, "actual");
      const planned     = getStatus(selectedDate, item, "planned");
      const course      = courses[item.course];
      const isCancelled = actual === "cancelled";
      const replacedBy  = isCancelled
        ? (state.records[key]?.[id]?.replacedBy || null)
        : null;

      const article = document.createElement("article");
      article.className = `class-item${isCancelled ? " cancelled" : ""}`;
      article.dataset.course = item.course;

      article.innerHTML = `
        <div class="class-time">${item.start}<br />${item.end}</div>
        <div class="class-main">
          <strong></strong>
          <span class="class-type-row"></span>
        </div>
        <div class="class-actions" data-date="${key}" data-id="${id}">
          <button class="status-button attended ${actual === "attended" ? "active" : ""}" data-field="actual" data-value="attended" title="Attended">A</button>
          <button class="status-button missed ${actual === "missed" ? "active" : ""}" data-field="actual" data-value="missed" title="Missed">M</button>
          <button class="status-button cancelled-btn ${isCancelled ? "active" : ""}" title="Cancelled">⊘</button>
          <button class="status-button bunk ${planned === "bunk" ? "active" : ""}" data-field="planned" data-value="bunk" title="Mandatory bunk" ${isCancelled ? "disabled" : ""}>B</button>
        </div>
        <div class="replacement-picker hidden" data-date="${key}" data-id="${id}">
          <span class="replacement-label">Replaced by:</span>
          ${Object.keys(courses).map(c =>
            `<button class="repl-btn${replacedBy === c ? " active" : ""}" data-course="${c}">${c}</button>`
          ).join("")}
          <button class="repl-btn repl-none${!replacedBy ? " active" : ""}">None</button>
        </div>
      `;

      // Fill text content safely (XSS-safe)
      article.querySelector("strong").textContent = course.name;
      const typeSpan = article.querySelector(".class-type-row");
      typeSpan.textContent = item.type;
      if (isCancelled) {
        const cancBadge = document.createElement("span");
        cancBadge.className = "cancelled-badge";
        cancBadge.textContent = "CANC";
        typeSpan.appendChild(cancBadge);
        if (replacedBy) {
          const replBadge = document.createElement("span");
          replBadge.className = "replaced-badge";
          replBadge.textContent = `→ ${replacedBy}`;
          typeSpan.appendChild(replBadge);
        }
      }

      const actionsDiv = article.querySelector(".class-actions");
      const pickerDiv  = article.querySelector(".replacement-picker");

      // A / M / B buttons — standard behaviour
      actionsDiv.querySelectorAll("[data-field]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const date    = parseDate(actionsDiv.dataset.date);
          const itm     = classes.find((e) => classId(e) === actionsDiv.dataset.id);
          const current = getStatus(date, itm, btn.dataset.field);
          setStatus(date, itm, btn.dataset.field, current === btn.dataset.value ? null : btn.dataset.value);
          // If un-cancelling, also clear any replacedBy
          if (btn.dataset.field === "actual" && btn.dataset.value === "attended") {
            const dk = toKey(date);
            const eid = classId(itm);
            if (state.records[dk]?.[eid]) delete state.records[dk][eid].replacedBy;
          }
          await saveState();
          render();
        });
      });

      // ⊘ cancel button — immediately set cancelled and open replacement picker
      const cancelBtn = actionsDiv.querySelector(".cancelled-btn");
      cancelBtn.addEventListener("click", async () => {
        const date  = parseDate(actionsDiv.dataset.date);
        const itm   = classes.find((e) => classId(e) === actionsDiv.dataset.id);
        const cur   = getStatus(date, itm, "actual");

        if (cur === "cancelled") {
          // Un-cancel: clear cancelled and replacedBy
          setStatus(date, itm, "actual", null);
          const dk  = toKey(date);
          const eid = classId(itm);
          if (state.records[dk]?.[eid]) delete state.records[dk][eid].replacedBy;
          await saveState();
          render();
        } else {
          // Mark as cancelled immediately
          setStatus(date, itm, "actual", "cancelled");
          setStatus(date, itm, "planned", null);
          await saveState();
          render();
          // Find newly rendered picker and reveal it
          const actionEl = els.scheduleList.querySelector(`.class-actions[data-id="${classId(itm)}"]`);
          const pickerEl = actionEl?.parentElement?.querySelector(".replacement-picker");
          if (pickerEl) pickerEl.classList.remove("hidden");
        }
      });

      // Replacement picker buttons
      pickerDiv.querySelectorAll(".repl-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const date  = parseDate(pickerDiv.dataset.date);
          const itm   = classes.find((e) => classId(e) === pickerDiv.dataset.id);
          const dk    = toKey(date);
          const eid   = classId(itm);

          // Mark as cancelled
          setStatus(date, itm, "actual", "cancelled");
          setStatus(date, itm, "planned", null);

          // Store replacedBy (or clear it for "None")
          if (!state.records[dk]) state.records[dk] = {};
          if (!state.records[dk][eid]) state.records[dk][eid] = {};

          const chosen = btn.dataset.course || null;
          if (chosen) {
            state.records[dk][eid].replacedBy = chosen;
          } else {
            delete state.records[dk][eid].replacedBy;
          }

          await saveState();
          render();
        });
      });

      els.scheduleList.appendChild(article);
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
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Events & tasks";
    section.appendChild(eyebrow);

    dayEvents.forEach((ev) => {
      const item = document.createElement("div");
      item.className = "event-item";
      item.innerHTML = `
        <span class="event-dot"></span>
        <div class="event-body">
          <span class="event-name"></span>
          <span class="event-time"></span>
        </div>
        <button class="event-delete" title="Delete event">&times;</button>
      `;
      item.querySelector(".event-name").textContent = ev.name;
      item.querySelector(".event-time").textContent = ev.allDay ? "All day" : ev.time;
      const deleteBtn = item.querySelector(".event-delete");
      deleteBtn.dataset.eventId = ev.id;
      deleteBtn.addEventListener("click", async () => {
        deleteEvent(ev.id);
        await saveState();
        render();
      });
      section.appendChild(item);
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
    // ── Count scheduled classes for this course ──────────────────
    const classes = getClassesForDate(date).filter((item) => item.course === courseId);
    classes.forEach((item) => {
      const actual  = getStatus(date, item, "actual");
      const planned = getStatus(date, item, "planned");
      if (actual === "cancelled") {
        return;  // cancelled — doesn't count for original course
      }
      if (actual) {
        total += 1;
        if (actual === "attended") attended += 1;
      } else if (date >= today) {
        upcoming += 1;
        if (planned === "bunk") plannedBunks += 1;
      }
    });

    // ── Count replacement classes held in OTHER courses' slots ───
    // Walk every record for this date; if any OTHER course's slot
    // was cancelled and replacedBy === courseId, that's an extra
    // attended class for courseId (already in the past).
    if (date < today) {
      const dateRecords = state.records[toKey(date)] || {};
      Object.values(dateRecords).forEach((rec) => {
        if (rec.actual === "cancelled" && rec.replacedBy === courseId) {
          total   += 1;
          attended += 1;
        }
      });
    }
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
    if (error.status === 401 || error.status === 403) {
      if (error.status === 403) {
        alert(error.message || "Your account has been blocked.");
      }
      return false;
    }
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
    } catch (error) {
      if (error.status === 403) {
        alert(error.message || "Your account has been blocked.");
        els.logout.click();
        return;
      }
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
  const wordleView = document.querySelector("#wordleView");
  if (wordleView) wordleView.classList.toggle("hidden", panelId !== "wordleView");

  if (panelId === "weeklyPanel") renderWeekly();

  if (panelId === "wordleView") {
    if (window.WordleModule) window.WordleModule.init();
  } else {
    if (window.WordleModule) window.WordleModule.detach();
  }
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
      const records = (userState.records && userState.records[toKey(date)]) || {};
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

    // Count replacement classes for admin stats too
    if (date < today) {
      const dateRecords = (userState.records && userState.records[toKey(date)]) || {};
      Object.values(dateRecords).forEach((rec) => {
        if (rec.actual === "cancelled" && rec.replacedBy === courseId) {
          total    += 1;
          attended += 1;
        }
      });
    }
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

    try {
      const settingsResult = await api(`/admin/settings?token=${encodeURIComponent(session.token)}`);
      const signupToggle = document.querySelector("#adminDisableRegistration");
      if (signupToggle && settingsResult) {
        signupToggle.checked = !!settingsResult.registrationDisabled;
      }
    } catch (err) {
      console.error("Failed to load admin settings:", err);
    }

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
      const isBlocked = user.blocked === true;
      const color = getUserColor(user.username);
      const statusLabel = isBlocked ? "Blocked User" : "Active User";
      const statusColor = isBlocked ? "var(--red)" : color;
      const blockBtnText = isBlocked ? "Unblock User" : "Block User";
      const blockBtnClass = isBlocked ? "primary-action" : "ghost-action";
      const createdStr = new Date(user.createdAt).toLocaleDateString();
      const updatedStr = new Date(user.updatedAt).toLocaleDateString();

      return `
        <article class="summary-card admin-user-card" style="position: relative; padding-left: 24px; opacity: ${isBlocked ? 0.7 : 1};">
          <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${statusColor};"></div>
          <h3>@${escapeHtml(user.username)}</h3>
          <span class="course-code" style="color: ${statusColor};">${statusLabel}</span>
          <div class="card-row"><span>Created</span><strong>${createdStr}</strong></div>
          <div class="card-row"><span>Last Updated</span><strong>${updatedStr}</strong></div>
          <div class="card-row"><span>Courses</span><strong>${Object.keys(courses).length} tracked</strong></div>
          <div class="allowance" style="grid-template-columns: 1fr;">
            <div class="metric-box">
              <span>Overall Attendance</span>
              <strong style="color: ${statusColor};">${metrics.overallPercent}%</strong>
              <small>${metrics.totalAttended} / ${metrics.totalHeld} classes held</small>
            </div>
          </div>
          <div style="margin-top: 12px;">
            <button class="block-toggle-btn ${blockBtnClass}" data-username="${escapeHtml(user.username)}" data-blocked="${isBlocked}" style="width: 100%; font-size: 0.65rem; padding: 6px 12px; height: auto;">
              ${blockBtnText}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll(".block-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const username = btn.dataset.username;
      const currentlyBlocked = btn.dataset.blocked === "true";
      const confirmMsg = currentlyBlocked
        ? `Are you sure you want to unblock @${username}?`
        : `Are you sure you want to block @${username}? They will lose access to the site immediately.`;

      if (!confirm(confirmMsg)) return;

      try {
        await api("/admin/toggle-block", {
          token: session.token,
          username,
          blocked: !currentlyBlocked,
        });
        await loadAdminData();
      } catch (error) {
        alert(error.message || "Failed to toggle block status.");
      }
    });
  });
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
      const isBlocked = user.blocked === true;
      const usernameText = isBlocked ? `@${user.username} (Blocked)` : `@${user.username}`;
      const usernameStyle = isBlocked
        ? `color: var(--red); font-weight: bold; text-decoration: line-through;`
        : `color: ${color}; font-weight: bold;`;

      const formatCoursePercent = (courseId) => {
        const stats = metrics.courseStats[courseId];
        if (!stats) return "-";
        return stats.total ? `${Math.round((stats.attended / stats.total) * 100)}%` : "100%";
      };

      const lastActive = user.updatedAt
        ? new Date(user.updatedAt).toLocaleString()
        : new Date(user.createdAt).toLocaleString();

      return `
      <tr style="opacity: ${isBlocked ? 0.7 : 1};">
        <td style="${usernameStyle}">${usernameText}</td>
        <td style="font-size: 0.7rem; color: var(--muted);">${lastActive}</td>
        <td style="font-weight: bold; color: ${isBlocked ? "var(--red)" : color};">${metrics.overallPercent}%</td>
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

// ════════════════════════════════════════════════════════════════════
// WORDLE MODULE
// Self-contained — reads App-level globals: session (username, token)
// ════════════════════════════════════════════════════════════════════
(function WordleModule() {
  const MAX_GUESSES  = 6;
  const WORD_LENGTH  = 5;

  const KEYBOARD_ROWS = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L"],
    ["Enter","Z","X","C","V","B","N","M","⌫"],
  ];

  const WIN_MESSAGES = [
    "Genius! 🎉", "Magnificent! 🌟", "Impressive! 👏",
    "Splendid! ✨",  "Great! 😊",      "Phew! 😅",
  ];

  let wState = null;   // { guesses[], current, gameOver, message, answer, loading }
  let shakeRow = null;

  // ── Initialise when the Wordle tab is opened ────────────────────
  async function initWordle() {
    wState = {
      guesses:  [],
      current:  "",
      gameOver: false,
      message:  "",
      answer:   "",
      loading:  true,
    };
    renderAll();
    await loadWordleState();
  }

  // ── Load today's state from the server ──────────────────────────
  async function loadWordleState() {
    try {
      const currentUser  = session?.username;
      const currentToken = session?.token;
      const params = new URLSearchParams({
        username: currentUser,
        token:    currentToken,
      });
      const res  = await fetch(`/api/wordle/word?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load wordle.");

      const today  = new Date().toISOString().slice(0, 10);
      const dateEl = document.getElementById("wordleDate");
      if (dateEl) {
        dateEl.textContent = `Wordle #${data.dayIndex}  ·  ${today}`;
      }

      // Show streak bar
      if (data.streak) {
        const bar = document.getElementById("wordleStreakBar");
        if (bar) {
          document.getElementById("wordleStreakCount").textContent = data.streak.current;
          document.getElementById("wordleStreakBest").textContent  = data.streak.best;
          bar.classList.remove("hidden");
        }
      }

      if (data.savedState) {
        // Restore a game in progress or already completed
        const s = data.savedState;
        wState.guesses  = s.guesses || [];
        wState.gameOver = s.gameOver || false;
        if (s.gameOver) {
          wState.message = s.won
            ? (WIN_MESSAGES[s.guesses.length - 1] || "Well done!")
            : "Better luck tomorrow!";
          wState.answer = s.answer || "";
        }
      }
      wState.loading = false;
      renderAll();
      if (!wState.gameOver) attachKeyListeners();
      loadLeaderboard();
    } catch (err) {
      wState.loading = false;
      setError(err.message);
      renderAll();
    }
  }

  // ── Input handlers ───────────────────────────────────────────────
  function handleAdd(key) {
    if (wState.gameOver || wState.current.length >= WORD_LENGTH) return;
    wState.current += key.toLowerCase();
    setError("");
    // BUG FIX 1: Only patch the active row instead of rebuilding the whole board
    renderActiveRow();
  }

  function handleDelete() {
    if (wState.gameOver || !wState.current.length) return;
    wState.current = wState.current.slice(0, -1);
    // BUG FIX 1: Only patch the active row instead of rebuilding the whole board
    renderActiveRow();
  }

  async function handleSubmit() {
    if (wState.gameOver) return;
    if (wState.current.length !== WORD_LENGTH) {
      setError("Not enough letters");
      triggerShake(wState.guesses.length);
      return;
    }
    if (wState.guesses.some(g => g.guess === wState.current)) {
      setError("Already tried that word!");
      triggerShake(wState.guesses.length);
      return;
    }

    setError("");
    const guess        = wState.current;
    const attemptCount = wState.guesses.length + 1;
    const currentUser  = session?.username;
    const currentToken = session?.token;

    try {
      const res  = await fetch("/api/wordle/check", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          token:    currentToken,
          guess,
          attemptCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // BUG FIX 3: Do NOT clear wState.current on error so the user can
        // correct their spelling. Just shake and show the error message.
        setError(data.error || "Server error.");
        triggerShake(wState.guesses.length);
        return;
      }

      // Commit the guess — clear current word and add to guesses list
      const rowIndex   = wState.guesses.length;  // which board row we just committed
      const newGuesses = [...wState.guesses, { guess, result: data.result }];
      wState.guesses   = newGuesses;
      wState.current   = "";
      // BUG FIX 1 & 2: Reveal the committed row with the flip animation.
      // We paint letters immediately (no colour yet) then apply colour classes
      // after each tile's flip completes, so the colour is hidden during the flip.
      revealCommittedRow(rowIndex, data.result);
      renderKeyboard();     // update keyboard key colours after each guess
      renderActiveRow();    // clear the active input row

      if (data.isWin) {
        setTimeout(() => {
          wState.gameOver = true;
          wState.message  = WIN_MESSAGES[newGuesses.length - 1] || "Great!";
          detachKeyListeners();
          // Don't rebuild the board — just update keyboard colours + show end screen
          renderKeyboard();
          renderEndScreen();
          loadLeaderboard();
        }, WORD_LENGTH * 300 + 500);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setTimeout(() => {
          wState.gameOver = true;
          wState.message  = "Better luck tomorrow!";
          wState.answer   = data.answer || "";
          detachKeyListeners();
          // Don't rebuild the board — just update keyboard colours + show end screen
          renderKeyboard();
          renderEndScreen();
          loadLeaderboard();
        }, WORD_LENGTH * 300 + 500);
      }
    } catch {
      setError("Network error. Please try again.");
    }
  }

  // ── Rendering ────────────────────────────────────────────────────
  // renderAll: full rebuild — called on init/restore only.
  function renderAll() {
    buildBoardDOM();
    renderKeyboard();
    renderEndScreen();
  }

  // Build the entire 6-row board from scratch.
  // Committed rows from wState.guesses are stamped with their final colours
  // immediately (this is the restore path — no animation needed).
  // The active row and empty rows get blank tiles.
  function buildBoardDOM() {
    const board = document.getElementById("wordleBoard");
    if (!board) return;
    board.innerHTML = "";

    for (let i = 0; i < MAX_GUESSES; i++) {
      const rowEl = document.createElement("div");
      rowEl.className = "wordle-row";
      rowEl.dataset.row = i;

      const committed = wState.guesses[i];

      for (let j = 0; j < WORD_LENGTH; j++) {
        const tile = document.createElement("div");
        tile.className = "wordle-tile";
        tile.dataset.col = j;

        if (committed) {
          // Restored state — show final colour straight away, no animation
          tile.textContent = committed.guess[j].toUpperCase();
          tile.classList.add(committed.result[j]);  // correct/present/absent
          tile.classList.add("restored");           // prevents re-animation
        } else if (i === wState.guesses.length && !wState.gameOver) {
          // Active row — fill from wState.current
          const letter = (wState.current[j] || "").toUpperCase();
          tile.textContent = letter;
          if (letter) tile.classList.add("filled");
        }
        rowEl.appendChild(tile);
      }
      board.appendChild(rowEl);
    }
  }

  // Update only the active input row in place — called on every add/delete.
  function renderActiveRow() {
    const board = document.getElementById("wordleBoard");
    if (!board) return;
    const activeIndex = wState.guesses.length;
    const rowEl = board.querySelector(`[data-row="${activeIndex}"]`);
    if (!rowEl) return;
    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile = rowEl.children[j];
      const letter = (wState.current[j] || "").toUpperCase();
      if (tile) {
        tile.textContent = letter;
        tile.classList.toggle("filled", !!letter);
      }
    }
  }

  // Apply the flip animation + colours to a newly committed row.
  function revealCommittedRow(rowIndex, result) {
    const board = document.getElementById("wordleBoard");
    if (!board) return;
    const rowEl = board.querySelector(`[data-row="${rowIndex}"]`);
    if (!rowEl) return;

    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile  = rowEl.children[j];
      const delay = j * 300;  // stagger each tile by 300 ms
      if (!tile) continue;

      tile.classList.remove("filled");
      tile.style.setProperty("--delay", `${delay}ms`);
      tile.classList.add("revealed");

      // Apply the colour class exactly when the tile reaches face-up
      // (halfway through the 500 ms flip = 250 ms after it starts)
      setTimeout(() => {
        tile.classList.add(result[j]);  // correct / present / absent
      }, delay + 250);
    }
  }

  function renderKeyboard() {
    const kb = document.getElementById("wordleKeyboard");
    if (!kb) return;
    kb.innerHTML = "";

    const keyStates = buildKeyStates(wState.guesses);
    KEYBOARD_ROWS.forEach(row => {
      const rowEl = document.createElement("div");
      rowEl.className = "wordle-key-row";
      row.forEach(key => {
        const btn = document.createElement("button");
        btn.className = `wordle-key ${keyStates[key] || ""}`;
        btn.textContent = key;
        btn.dataset.key = key;
        btn.addEventListener("click", () => onKeyClick(key));
        rowEl.appendChild(btn);
      });
      kb.appendChild(rowEl);
    });
  }

  function renderEndScreen() {
    const end     = document.getElementById("wordleEndScreen");
    const msgEl   = document.getElementById("wordleEndMessage");
    const revealEl = document.getElementById("wordleAnswerReveal");
    if (!end) return;

    if (wState.gameOver) {
      end.classList.remove("hidden");
      msgEl.textContent = wState.message;
      if (wState.answer) {
        revealEl.textContent = wState.answer.toUpperCase();
        revealEl.classList.remove("hidden");
      } else {
        revealEl.classList.add("hidden");
      }
    } else {
      end.classList.add("hidden");
    }
  }

  // ── Key state builder (mirrors wordle utils/helpers.js) ──────────
  function buildKeyStates(guesses) {
    const priority = { correct: 3, present: 2, absent: 1 };
    const states   = {};
    for (const { guess, result } of guesses) {
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i].toUpperCase();
        const status = result[i];
        if (!states[letter] || priority[status] > priority[states[letter]])
          states[letter] = status;
      }
    }
    return states;
  }

  // ── Shake animation ──────────────────────────────────────────────
  // BUG FIX 3: Shake only manipulates the row's class — it does not
  // rebuild the board, so wState.current is preserved during the shake.
  function triggerShake(rowIndex) {
    const board = document.getElementById("wordleBoard");
    if (!board) return;
    const rowEl = board.querySelector(`[data-row="${rowIndex}"]`);
    if (!rowEl) return;
    rowEl.classList.add("shake");
    setTimeout(() => rowEl.classList.remove("shake"), 600);
  }

  // ── Error helper ─────────────────────────────────────────────────
  function setError(msg) {
    const el = document.getElementById("wordleError");
    if (el) el.textContent = msg;
  }

  // ── Keyboard event listeners ─────────────────────────────────────
  let keyListenersAttached = false;

  function onKeyDown(e) {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toUpperCase();
    if (key === "ENTER")     handleSubmit();
    else if (key === "BACKSPACE") handleDelete();
    else if (/^[A-Z]$/.test(key)) handleAdd(key);
  }

  function onKeyClick(key) {
    if      (key === "Enter") handleSubmit();
    else if (key === "⌫")    handleDelete();
    else                      handleAdd(key);
  }

  function attachKeyListeners()  {
    if (keyListenersAttached) return;
    window.addEventListener("keydown", onKeyDown);
    keyListenersAttached = true;
  }

  function detachKeyListeners()  {
    if (!keyListenersAttached) return;
    window.removeEventListener("keydown", onKeyDown);
    keyListenersAttached = false;
  }

  // ── Leaderboard ──────────────────────────────────────────────────
  async function loadLeaderboard() {
    const listEl = document.getElementById("wordleLeaderboardList");
    if (!listEl) return;
    listEl.innerHTML = "<span class='wordle-lb-loading'>Loading…</span>";

    try {
      const params = new URLSearchParams({
        username: session?.username,
        token:    session?.token,
      });
      const res  = await fetch(`/api/wordle/leaderboard?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");

      if (!data.entries || data.entries.length === 0) {
        listEl.innerHTML = "<span class='wordle-lb-empty'>No one has finished today's wordle yet. Be the first! 🎯</span>";
        return;
      }

      listEl.innerHTML = "";
      data.entries.forEach((entry, i) => {
        const row = document.createElement("div");
        row.className = "wordle-lb-row" + (entry.username === session?.username ? " wordle-lb-you" : "");

        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        const score = entry.won
          ? `${entry.guesses}/6`
          : `✗`;
        const scoreClass = entry.won ? "lb-score-win" : "lb-score-loss";
        const streakStr  = entry.streak > 0 ? `🔥 ${entry.streak}` : "";

        row.innerHTML = `
          <span class="lb-rank">${medal}</span>
          <span class="lb-name"></span>
          <span class="lb-streak">${streakStr}</span>
          <span class="lb-score ${scoreClass}">${score}</span>
        `;
        row.querySelector(".lb-name").textContent =
          entry.username === session?.username ? `${entry.username} (you)` : entry.username;

        listEl.appendChild(row);
      });
    } catch (err) {
      listEl.innerHTML = `<span class="wordle-lb-empty">Could not load leaderboard.</span>`;
    }
  }

  // ── Public API — called by the tab-switching code in app.js ──────
  window.WordleModule = { init: initWordle, detach: detachKeyListeners };
})();
