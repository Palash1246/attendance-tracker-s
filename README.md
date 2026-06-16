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
- **Adjustable target** — Slide the attendance target between 75 % and 95 % to see how the projections change in real time.
- **Two themes** — Switch between the **Forest** (dark green) and **Rose** (deep pink) colour schemes from the top navigation bar.
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
├── index.html      # Single-page shell (auth, welcome, tracker screens)
├── styles.css      # All styles — themes, layout, components, responsive
├── app.js          # All client-side logic — auth, rendering, state management
├── server.js       # Node.js HTTP server — static files + JSON REST API
├── data.json       # Flat-file user database (auto-created, gitignored)
└── package.json    # npm metadata + start script
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later (no npm packages to install)

### Run the server

```bash
node server.js
# or
npm start
```

The app is now available at **http://localhost:3000**.

> **Note:** You can also open `index.html` directly in a browser without running the server. In that mode the app skips all API calls and stores data in `localStorage` instead.

### Change the port

Set the `PORT` environment variable before starting:

```bash
PORT=8080 node server.js
```

### Use a custom data file

By default user data is written to `data.json` in the project root. Override this path with `DATA_FILE`:

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
{ "username": "sanika", "token": "<token>", "state": { "target": 75, "records": {} } }
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
  }
}
```

- **`target`** — Attendance percentage goal (75–95).
- **`records`** — Keyed by `YYYY-MM-DD`. Each day maps class IDs (built from `COURSE-START-END`) to an object with optional `actual` (`"attended"` | `"missed"`) and `planned` (`"bunk"`) fields.

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

| Code | Name |
|---|---|
| `AD` | Architectural Design |
| `ABC` | Architectural Building Construction III |
| `HUM` | Humanities |
| `ARD` | Architectural Representation & Detailing |
| `LAND` | Landscape & Design of Gardens |
| `CF` | College Facilities |

### Weekly Schedule

| Day | Slot 1 (7:30 – 10:30) | Slot 2 (11:00 – 14:00) |
|---|---|---|
| Monday | ABC Studio | ARD Studio |
| Tuesday | AD Studio | HUM Lecture |
| Wednesday | AD Studio | AD Studio |
| Thursday | ABC Lecture/Studio | LAND Lecture/Studio |
| Friday | HUM Lecture | ABC Lecture |
| Saturday | CF Lecture block (8:45 – 14:20) | — |
| Sunday | — | — |

### Holidays

| Date | Event |
|---|---|
| 2026-06-01 | Bakri Id / Commencement day |
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
- Session tokens are 32-byte cryptographically random hex strings held in memory. They are lost when the server restarts (users will need to log in again).
- The server blocks direct access to `data.json`, `server.js`, and `package.json` via static file serving.
- Path traversal is prevented by resolving the requested path and checking that it starts within the project root.

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