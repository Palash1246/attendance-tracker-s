# λ ATTENDANCE GUARD

A personal attendance tracker for **Academy of Architecture · Semester V** students. Keep your attendance safely above 75%, plan unavoidable bunks, and know exactly how much room you have before the semester closes.

---

## Features

- **Multi-user auth** — Register and log in with a username and password. Credentials are stored server-side using `scrypt`-hashed passwords.
- **Offline fallback** — If the server is unreachable (or you open the file directly), the app falls back to `localStorage` so nothing is lost.
- **Per-course attendance tracking** — Mark each class as *Attended*, *Missed*, or a *Mandatory Bunk* (planned absence).
- **Live statistics** — Each course card shows your current attendance percentage, a progress bar, and two key metrics:
  - **Can Bunk** — how many more classes you can safely skip and still meet your target.
  - **Must Attend** — how many upcoming classes you cannot miss.
- **Semester calendar** — Full semester calendar (June – October 2026) with colour-coded dots for bunked and marked days. Click any day to jump to it.
- **Bunk-day shortcut** — Mark an entire day as a mandatory bunk with one button.
- **Adjustable target** — Slide the attendance target between 75% and 95% to see how the projections change in real time.
- **Two themes** — Switch between the **Forest** (dark green) and **Rose** (deep pink) colour schemes from the top navigation bar.
- **Event & task planner** — Schedule custom events/tasks for any date using the floating action button (`+`). Events are saved in your state and show up under your day's schedule.
- **Weekly schedule view** — View the full week's timetable in a dedicated tab with holiday warnings and click-to-navigate daily shortcuts.
- **Responsive layout** — Works on desktops, tablets, and phones.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | Vanilla CSS (CSS custom properties, grid, flex) |
| Logic | Vanilla JavaScript (ES2022, no build step) |
| Server | Node.js built-in `http` + `crypto` + `fs` modules |
| Fonts | [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) · [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |

No framework, no bundler, no dependencies — just `node server.js`.

---

## Project Structure

```
attendance-tracker-s/
├── api/
│   └── index.js        # Vercel serverless API handler
├── public/
│   ├── index.html      # Single-page front-end shell
│   ├── styles.css      # Styling (CSS variables, layout, components, themes)
│   ├── app.js          # Client-side state and UI rendering logic
│   ├── favicon.png     # Application icon
│   └── [1-3].png       # Asset images
├── vercel.json         # Vercel routing configuration
├── server.js           # Local Node.js HTTP server (delegates to api/index.js)
├── data.json           # Local JSON fallback database (gitignored)
└── package.json        # npm metadata, scripts, and dependencies
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Run the server

For local development without remote database environment variables:

```bash
node server.js
# or
npm start
```

The local development database will automatically be created at `data.json` in the root directory. The app will be available at **http://localhost:3000**.

> **Note:** You can also open `public/index.html` directly in a browser without running the server. In that mode, the app skips all API calls and stores data in `localStorage` instead.

### Local Development with Environment Variables

To run the server locally with simulated Vercel serverless integration, create a `.env.local` file in the root directory:

```env
JWT_SECRET="your-local-random-secret"
UPSTASH_REDIS_REST_URL="https://your-upstash-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"
```

To run the server utilizing these environment variables:

- **Using Node v20.6.0+ native env file support:**
  ```bash
  node --env-file=.env.local server.js
  ```
- **Using Vercel CLI (recommended for full environment parity):**
  ```bash
  npm i -g vercel
  vercel dev
  ```

### Change the port

Set the `PORT` environment variable before starting (only applies when running `server.js` directly):

```bash
PORT=8080 node server.js
```

### Use a custom data file

By default, local user data is written to `data.json` in the project root when Vercel Upstash variables are not defined. Override this path with `DATA_FILE`:

```bash
DATA_FILE=/var/data/attendance.json node server.js
```

---

## REST API

All endpoints are prefixed with `/api/`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/register` | — | Create a new user account |
| `POST` | `/api/login` | — | Authenticate and receive a session token |
| `GET` | `/api/state` | Token | Load saved attendance state |
| `POST` | `/api/state` | Token | Save attendance state |

### `POST /api/register`

```json
{ "username": "sanika", "password": "mypassword" }
```

Returns `201` with `{ username, token, state }` on success.

### `POST /api/login`

```json
{ "username": "sanika", "password": "mypassword" }
```

Returns `200` with `{ username, token, state }` on success, `401` on bad credentials.

### `GET /api/state?username=sanika&token=<token>`

Returns `200` with `{ username, state }`.

### `POST /api/state`

```json
{
  "username": "sanika",
  "token": "<token>",
  "state": {
    "target": 75,
    "records": {},
    "events": []
  }
}
```

Returns `200` with the saved `{ username, state }`.

---

## Data Model

### User record (in `data.json`)

```json
{
  "users": {
    "sanika": {
      "passwordAlgo": "scrypt",
      "passwordSalt": "<hex>",
      "passwordHash": "<hex>",
      "state": { ... },
      "createdAt": "2026-06-16T00:00:00.000Z",
      "updatedAt": "2026-06-16T00:00:00.000Z"
    }
  }
}
```

### Attendance state

```json
{
  "target": 75,
  "records": {
    "2026-06-16": {
      "AD-7:30AM-10:30AM": {
        "actual": "attended"
      },
      "HUM-11:00AM-2:00PM": {
        "actual": "missed"
      },
      "ABC-7:30AM-10:30AM": {
        "planned": "bunk"
      }
    }
  },
  "events": [
    {
      "id": "jr7y48s2",
      "name": "Jury Submission",
      "date": "2026-06-16",
      "allDay": false,
      "time": "10:30"
    }
  ]
}
```

- **`target`** — Attendance percentage goal (75–95).
- **`records`** — Keyed by `YYYY-MM-DD`. Each day maps class IDs (built from `COURSE-START-END` with whitespace removed) to an object with optional `actual` (`"attended"` | `"missed"`) and `planned` (`"bunk"`) fields.
- **`events`** — An array of custom event/task objects scheduled by the user. Each event has a unique `id`, `name`, `date` (`YYYY-MM-DD`), `allDay` (boolean), and optional `time` (e.g., `"10:30"`).

---

## Semester Configuration

The semester is defined at the top of `app.js`:

```js
const semester = {
  start: "2026-06-01",
  end:   "2026-10-16",
};
```

### Courses

| Code | Name | Type |
|---|---|---|
| `AD`  | Architectural Design | Studio |
| `ABC` | Architectural Building Construction III | Studio + lecture |
| `HUM` | Humanities | Lecture |
| `ARD` | Architectural Representation & Detailing | Studio |
| `AT3` | Architectural Theory 3 | Lecture |
| `ABS` | Architectural Building Services | Studio |
| `ALD` | Landscaping & Allied Design | Studio |
| `TDS` | Theory & Design of Structures | Lecture |
| `CF`  | College Projects | Sem V |

### Weekly Schedule

| Day | Slot 1 (7:30 AM – 10:30 AM) | Slot 2 (11:00 AM – 12:30 PM / 2:00 PM) | Slot 3 (12:30 PM – 2:00 PM) |
|---|---|---|---|
| Monday | ARD Studio | ARD Studio (11:00 AM – 12:30 PM) | AT3 Lecture (12:30 PM – 2:00 PM) |
| Tuesday | AD Studio | HUM Lecture (11:00 AM – 2:00 PM) | — |
| Wednesday | ABS Studio | ALD Studio (11:00 AM – 2:00 PM) | — |
| Thursday | ABC Lecture/Studio | TDS Lecture (11:00 AM – 2:00 PM) | — |
| Friday | AD Studio | CF (College Projects) (11:00 AM – 2:00 PM) | — |

### Holidays

| Date | Event |
|---|---|
| 2026-06-01 | Bakri Id / Commencement day |
| 2026-06-02 – 08 | Elective week |
| 2026-06-26 | Moharram |
| 2026-08-15 | Independence Day / Parsi New Year |
| 2026-08-26 | Id-e-Milad |
| 2026-09-14 | Ganesh Chaturthi |
| 2026-09-15 – 18 | Ganpati vacation |
| 2026-09-25 | Anant Chaturdashi |
| 2026-10-02 | Gandhi Jayanti |
| 2026-10-16 | End of semester |

---

## Security Notes

- Passwords are hashed with **Node.js `crypto.scryptSync`** (salt length 16 bytes, key length 64 bytes). Plain-text passwords are never stored.
- Session tokens are stateless **HMAC-SHA256 JWTs** signed with a server secret (`JWT_SECRET`). They survive server restarts and cold starts.
- The server blocks direct access to root files like `data.json`, `server.js`, and `package.json` via static file serving.
- Path traversal is prevented by resolving the requested path and checking that it starts within the static asset folder (`public/`).

---

## Customising

To adapt this tracker for a different semester or institution, edit the top section of `app.js`:

- **`semester`** — Change `start` and `end` dates.
- **`holidays`** — Add or remove `["YYYY-MM-DD", "Event name"]` pairs.
- **`courses`** — Add, rename, or remove courses.
- **`weeklySchedule`** — Adjust which courses run on which days and at what times.

The CSS theming system lives entirely in `styles.css` under the `:root` / `body[data-theme="forest"]` and `body[data-theme="rose"]` blocks. Swap the colour variables there to create your own theme.

---

## License

Private repository — all rights reserved.

---

## Changelog

### UI redesign

- Replaced all gradient-based styles with a flat dark surface design inspired by rig.ai.
- Typography switched to **IBM Plex Mono** (monospace headings / labels) + **Inter** (body).
- All layout gradients removed; colours are now flat, solid, and role-specific.
- Per-course **accent strips** (3 px left border) added to every card, class item, and schedule slot. Each course has its own unique colour that is consistent across all views.
- Two colour themes: **Forest** (dark green) and **Rose** (deep pink), toggled from the top bar.
- Sidebar and main content panels separated by 1 px borders — no box-shadows, no glows.

### New features

#### + Event / task button
- A floating action button (FAB `+`) appears in the bottom-right corner once you are logged in.
- Opens a modal dialog to schedule an event or task for any date.
- Fields: **Name**, **Date** (pre-filled to the currently selected calendar day), **Time** (hidden when "All day" is checked).
- Events are stored in `state.events[]` and persist alongside attendance records.
- Events appear below the class list in the day panel and can be deleted with the × button.

#### Weekly schedule view
- A **Schedule** tab next to the **Courses** tab shows the full weekly timetable for the current week.
- Each weekday is a column showing the actual date, course name, time range, and type (Studio / Lecture).
- Today's column is highlighted in green.
- Holiday detection: if a day falls on a holiday the slot shows the holiday name in red.
- Clicking any day column switches back to the Courses tab and selects that day in the calendar.

### Schedule corrections (Sem V, Batch 2026–27)

The following corrections were made to the weekly timetable based on the official ACED schedule:

| Day | Before | After |
|---|---|---|
| Monday AM | ABC Studio | ARD Studio |
| Monday PM | ARD Studio (11:00–2:00) | ARD Studio (11:00–12:30) + AT3 Lecture (12:30–2:00) |
| Wednesday AM | ABC Studio | ABS (Building Services) Studio |
| Wednesday PM | AD Studio | ALD (Landscaping) Studio |
| Thursday PM | LAND (elective, removed) | TDS (Theory & Design of Structures) |
| Friday AM | HUM Lecture | AD Studio |
| Friday PM | ABC Lecture | CF (College Projects) |
| Saturday | CF all-day | Removed (electives over) |

New courses added:

| Code | Name |
|---|---|
| `AT3` | Architectural Theory 3 |
| `ABS` | Architectural Building Services |
| `ALD` | Landscaping & Allied Design |
| `TDS` | Theory & Design of Structures |

Removed courses: `LAND` (Landscape & Design of Gardens — elective, semester ended).

### Vercel deployment

The app is now deployable on **Vercel** (serverless). The following files were added:

| File | Purpose |
|---|---|
| `api/index.js` | Serverless function handling all `/api/*` routes |
| `vercel.json` | Routes `/api/*` to `api/index.js`; static files served automatically |

Two architectural changes were required for serverless compatibility:

| Problem | Old approach | New approach |
|---|---|---|
| Sessions | In-memory `Map` (lost on cold start) | **HMAC-SHA256 JWT** (stateless, self-contained) |
| User data | `data.json` file writes (ephemeral on Vercel) | **Upstash Redis** REST API (persistent) |

`server.js` is used for local development (`node server.js`), serving static files from `public/` and delegating API endpoints to `api/index.js`.

Required environment variables on Vercel (or local simulation):

| Variable | Description / Where to get it |
|---|---|
| `JWT_SECRET` | Any long random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `KV_REST_API_URL` or `UPSTASH_REDIS_REST_URL` | Upstash/Vercel KV endpoint URL |
| `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_TOKEN` | Upstash/Vercel KV endpoint Bearer token |