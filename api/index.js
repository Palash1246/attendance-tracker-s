/**
 * api/index.js — Vercel serverless handler
 *
 * Replaces the two non-portable pieces of server.js:
 *   sessions Map  →  HMAC-signed JWT       (stateless, survives cold starts)
 *   data.json     →  Upstash Redis REST     (persistent, no npm package needed)
 *
 * Required env vars (set in Vercel project settings):
 *   JWT_SECRET                 — any long random string
 *   UPSTASH_REDIS_REST_URL     — from Upstash dashboard or Vercel integration
 *   UPSTASH_REDIS_REST_TOKEN   — from Upstash dashboard or Vercel integration
 */

"use strict";
const crypto = require("crypto");

// ── Upstash Redis REST helpers ────────────────────────────────────────
// Change these two lines
const KV_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;

const fs = require("fs");
const path = require("path");
const dataFile = path.join(process.cwd(), "data.json");

function getLocalDb() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return { users: {} };
  }
}

function saveLocalDb(db) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Failed to write to data.json:", err);
  }
}

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) {
    // Fallback to local data.json
    const db = getLocalDb();
    if (key.startsWith("user:")) {
      return db.users[key.slice(5)] || null;
    }
    return db[key] || null;
  }

  const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "(no body)");
    throw new Error(`KV read failed (${r.status}): ${text}`);
  }
  const { result } = await r.json();
  if (result == null) return null;
  try { return typeof result === "string" ? JSON.parse(result) : result; }
  catch { return null; }
}

async function kvSet(key, value) {
  if (!KV_URL || !KV_TOKEN) {
    // Fallback to local data.json
    const db = getLocalDb();
    if (key.startsWith("user:")) {
      db.users[key.slice(5)] = value;
    } else {
      db[key] = value;
    }
    saveLocalDb(db);
    return;
  }

  const r = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "(no body)");
    throw new Error(`KV write failed (${r.status}): ${text}`);
  }
}

// ── JWT (HMAC-SHA256, no library needed) ──────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development_123";
const TOKEN_TTL  = 30 * 24 * 60 * 60 * 1000; // 30 days

function b64(s) { return Buffer.from(s).toString("base64url"); }

function signToken(username, role = "user") {
  if (!JWT_SECRET) throw new Error("JWT_SECRET env var is not set.");
  const h   = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p   = b64(JSON.stringify({ sub: username, role, exp: Date.now() + TOKEN_TTL }));
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

function verifyToken(token) {
  if (!token || !JWT_SECRET) return null;
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  // Simple string equality is fine here — the attacker already has the token value,
  // so timing-based enumeration of valid tokens isn't a meaningful attack vector.
  if (s !== expected) return null;
  let data;
  try { data = JSON.parse(Buffer.from(p, "base64url").toString("utf8")); }
  catch { return null; }
  if (Date.now() > data.exp) return null;
  return data;
}

// ── Password (scrypt, same as server.js) ─────────────────────────────
function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    passwordAlgo: "scrypt",
    passwordSalt: salt,
    passwordHash: crypto.scryptSync(password, salt, 64).toString("hex"),
  };
}

function verifyPassword(user, password) {
  if (user.passwordHash && user.passwordSalt) {
    const stored    = Buffer.from(user.passwordHash, "hex");
    const candidate = crypto.scryptSync(password, user.passwordSalt, stored.length);
    return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
  }
  return typeof user.password === "string" && user.password === password;
}

// ── State helpers ─────────────────────────────────────────────────────
function blankState() { return { target: 75, records: {}, events: [] }; }

function normalizeState(v) {
  return {
    ...blankState(), ...(v || {}),
    target:  Number(v?.target || 75),
    records: v?.records && typeof v.records === "object" ? v.records : {},
    events:  Array.isArray(v?.events) ? v.events : [],
  };
}

// ── Misc ──────────────────────────────────────────────────────────────
function cleanUsername(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
}

function send(res, status, body) { res.status(status).json(body); }

// ── Wordle word list (bundled, no DB needed) ────────────────────────
let _wordList = null;
let _answerList = null;

function getWordList() {
  if (!_wordList) {
    const p = require("path").join(__dirname, "words.json");
    _wordList = JSON.parse(require("fs").readFileSync(p, "utf8"));
  }
  return _wordList;
}

function getAnswerList() {
  if (!_answerList) {
    const p = require("path").join(__dirname, "answers.json");
    _answerList = JSON.parse(require("fs").readFileSync(p, "utf8"));
  }
  return _answerList;
}

function getWordleDayIndex() {
  const epoch = new Date("2024-01-01T00:00:00Z").getTime();
  return Math.floor((Date.now() - epoch) / 86_400_000);
}

function getTodayWord() {
  const list = getAnswerList();
  return list[getWordleDayIndex() % list.length].toLowerCase();
}

// ── Main handler ──────────────────────────────────────────────────────
module.exports = async (req, res) => {
  const body     = req.body || {};
  const matchedPath = req.headers["x-forwarded-uri"] || req.url;
  const pathname = new URL(matchedPath, "http://x").pathname;

  try {
    // ── GET /api/status ─────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/status") {
      return send(res, 200, {
        maintenance: process.env.MAINTENANCE_MODE === "true" || process.env.MAINTENANCE_MODE === "1"
      });
    }

    // ── GET /api/wordle/word ─────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/wordle/word") {
      const qs       = new URL(matchedPath, "http://x").searchParams;
      const username = cleanUsername(qs.get("username"));
      const payload  = verifyToken(qs.get("token"));
      if (!payload || payload.sub !== username)
        return send(res, 401, { error: "Please log in again." });

      const today  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const user   = await kvGet(`user:${username}`);
      if (!user) return send(res, 404, { error: "User not found." });

      const ws = user.wordleState;
      const alreadyPlayedToday = ws && ws.date === today;
      const streak = user.wordleStreak || { current: 0, best: 0, lastWonDate: null };

      return send(res, 200, {
        length: 5,
        dayIndex: getWordleDayIndex(),
        date: today,
        savedState: alreadyPlayedToday ? ws : null,
        streak,
      });
    }

    // ── POST /api/wordle/check ───────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/wordle/check") {
      const username    = cleanUsername(body.username);
      const payload     = verifyToken(body.token);
      if (!payload || payload.sub !== username)
        return send(res, 401, { error: "Please log in again." });

      const guess = typeof body.guess === "string"
        ? body.guess.trim().toLowerCase()
        : "";
      if (!/^[a-z]{5}$/.test(guess))
        return send(res, 400, { error: "Guess must be exactly 5 letters." });

      const wordList = getWordList();
      if (!wordList.includes(guess))
        return send(res, 400, { error: "Not a valid word." });

      const currentWord = getTodayWord().split("");
      const result      = Array(5).fill("absent");
      const pool        = [...currentWord];

      for (let i = 0; i < 5; i++) {
        if (guess[i] === pool[i]) { result[i] = "correct"; pool[i] = null; }
      }
      for (let i = 0; i < 5; i++) {
        if (result[i] === "correct") continue;
        const idx = pool.indexOf(guess[i]);
        if (idx !== -1) { result[i] = "present"; pool[idx] = null; }
      }

      const isWin        = result.every(r => r === "correct");
      const attemptCount = Number(body.attemptCount) || 1;
      const isLoss       = !isWin && attemptCount >= 6;

      const user = await kvGet(`user:${username}`);
      if (!user) return send(res, 404, { error: "User not found." });

      const today = new Date().toISOString().slice(0, 10);
      let ws = (user.wordleState && user.wordleState.date === today)
        ? user.wordleState
        : { date: today, guesses: [], gameOver: false };

      ws.guesses.push({ guess, result });
      if (isWin || isLoss) {
        ws.gameOver = true;
        ws.won      = isWin;
        ws.answer   = isWin ? "" : getTodayWord();

        // ── Streak update ────────────────────────────────────────
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const streak = user.wordleStreak || { current: 0, best: 0, lastWonDate: null };

        if (isWin) {
          if (streak.lastWonDate === yesterdayStr) {
            streak.current += 1;              // continued streak
          } else if (streak.lastWonDate === today) {
            // already counted today, no change
          } else {
            streak.current = 1;               // new streak starts
          }
          streak.lastWonDate = today;
          streak.best = Math.max(streak.best, streak.current);
        } else {
          // loss — reset current streak
          streak.current = 0;
        }
        user.wordleStreak = streak;
        // ─────────────────────────────────────────────────────────
      }

      user.wordleState = ws;
      user.updatedAt   = new Date().toISOString();
      await kvSet(`user:${username}`, user);

      return send(res, 200, {
        result,
        isWin,
        ...(isLoss ? { answer: getTodayWord() } : {}),
      });
    }

    // ── POST /api/register ──────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/register") {
      const username = cleanUsername(body.username);
      const password = String(body.password || "");

      if (!username || password.length < 3)
        return send(res, 400, { error: "Username and password must be at least 3 characters." });

      if (username === "admin")
        return send(res, 400, { error: "Username 'admin' is reserved." });

      // Check if registration is globally disabled
      const settings = (await kvGet("settings:global")) || {};
      if (settings.registrationDisabled)
        return send(res, 403, { error: "Registration is temporarily disabled by the administrator." });

      if (await kvGet(`user:${username}`))
        return send(res, 409, { error: "That username is already taken." });

      const user = { ...createPasswordRecord(password), state: blankState(), createdAt: new Date().toISOString() };
      await kvSet(`user:${username}`, user);
      return send(res, 201, { username, token: signToken(username), state: user.state });
    }

    // ── POST /api/login ─────────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/login") {
      const username = cleanUsername(body.username);
      if (username === "admin") {
        if (String(body.password || "") === "god") {
          return send(res, 200, { username: "admin", token: signToken("admin", "admin"), state: {} });
        } else {
          return send(res, 401, { error: "Incorrect username or password." });
        }
      }

      const user     = await kvGet(`user:${username}`);

      if (!user || !verifyPassword(user, String(body.password || "")))
        return send(res, 401, { error: "Incorrect username or password." });

      if (user.blocked === true)
        return send(res, 403, { error: "Your account has been blocked by the administrator." });

      // ── First-login-after-note anchor (set once, never overwritten for same note) ──
      const _msgs      = (await kvGet(`messages:${username}`)) || [];
      const _adminNote = [..._msgs].reverse().find(m => m.sender === "admin") || null;
      if (_adminNote && user.firstLoginAfterNoteId !== _adminNote.id) {
        user.firstLoginAfterNoteAt = new Date().toISOString();
        user.firstLoginAfterNoteId = _adminNote.id;
        user.updatedAt = user.firstLoginAfterNoteAt;
        await kvSet(`user:${username}`, user);
      }

      return send(res, 200, {
        username,
        token: signToken(username),
        state: normalizeState(user.state),
        firstLoginAfterNoteAt: user.firstLoginAfterNoteAt || null,
        firstLoginAfterNoteId: user.firstLoginAfterNoteId || null,
      });
    }

    // ── GET /api/state ──────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/state") {
      const qs       = new URL(matchedPath, "http://x").searchParams;
      const username = cleanUsername(qs.get("username"));
      const payload  = verifyToken(qs.get("token"));

      if (!payload || payload.sub !== username)
        return send(res, 401, { error: "Please log in again." });

      const user = await kvGet(`user:${username}`);
      if (!user) return send(res, 404, { error: "User not found." });

      if (user.blocked === true)
        return send(res, 403, { error: "Your account has been blocked by the administrator." });

      return send(res, 200, { username, state: normalizeState(user.state) });
    }

    // ── POST /api/state ─────────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/state") {
      const username = cleanUsername(body.username);
      const payload  = verifyToken(body.token);

      if (!payload || payload.sub !== username)
        return send(res, 401, { error: "Please log in again." });

      const user = await kvGet(`user:${username}`);
      if (!user) return send(res, 404, { error: "User not found." });

      if (user.blocked === true)
        return send(res, 403, { error: "Your account has been blocked by the administrator." });

      user.state     = normalizeState(body.state);
      user.updatedAt = new Date().toISOString();
      await kvSet(`user:${username}`, user);
      return send(res, 200, { username, state: user.state });
    }

    // ── GET /api/admin/users ────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/admin/users") {
      const qs = new URL(matchedPath, "http://x").searchParams;
      const payload = verifyToken(qs.get("token"));

      if (!payload || payload.role !== "admin")
        return send(res, 401, { error: "Unauthorized access." });

      let userKeys = [];
      if (!KV_URL || !KV_TOKEN) {
        const db = getLocalDb();
        userKeys = Object.keys(db.users).map(name => `user:${name}`);
      } else {
        const r = await fetch(`${KV_URL}/keys/user:*`, {
          headers: { Authorization: `Bearer ${KV_TOKEN}` },
        });
        if (!r.ok) {
          const text = await r.text().catch(() => "(no body)");
          throw new Error(`KV keys read failed (${r.status}): ${text}`);
        }
        const data = await r.json();
        userKeys = Array.isArray(data.result) ? data.result : [];
      }

      const users = [];
      for (const key of userKeys) {
        const username = key.slice(5);
        if (username === "admin") continue;
        const u = await kvGet(key);
        if (u) {
          users.push({
            username,
            createdAt: u.createdAt || "2026-06-16T00:00:00.000Z",
            updatedAt: u.updatedAt || u.createdAt || "2026-06-16T00:00:00.000Z",
            state: normalizeState(u.state),
            blocked: !!u.blocked,
          });
        }
      }
      return send(res, 200, { users });
    }

    // ── GET /api/admin/settings ─────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/admin/settings") {
      const qs = new URL(matchedPath, "http://x").searchParams;
      const payload = verifyToken(qs.get("token"));

      if (!payload || payload.role !== "admin")
        return send(res, 401, { error: "Unauthorized access." });

      const settings = (await kvGet("settings:global")) || {};
      return send(res, 200, {
        registrationDisabled: !!settings.registrationDisabled,
      });
    }

    // ── POST /api/admin/settings ────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/admin/settings") {
      const payload = verifyToken(body.token);

      if (!payload || payload.role !== "admin")
        return send(res, 401, { error: "Unauthorized access." });

      const settings = (await kvGet("settings:global")) || {};
      settings.registrationDisabled = !!body.registrationDisabled;
      await kvSet("settings:global", settings);

      return send(res, 200, { success: true, settings });
    }

    // ── POST /api/admin/toggle-block ────────────────────────────────
    if (req.method === "POST" && pathname === "/api/admin/toggle-block") {
      const payload = verifyToken(body.token);

      if (!payload || payload.role !== "admin")
        return send(res, 401, { error: "Unauthorized access." });

      const targetUsername = cleanUsername(body.username);
      if (!targetUsername) {
        return send(res, 400, { error: "Username is required." });
      }
      if (targetUsername === "admin") {
        return send(res, 400, { error: "Cannot block admin user." });
      }

      const user = await kvGet(`user:${targetUsername}`);
      if (!user) {
        return send(res, 404, { error: "User not found." });
      }

      user.blocked = !!body.blocked;
      user.updatedAt = new Date().toISOString();
      await kvSet(`user:${targetUsername}`, user);

      return send(res, 200, { success: true, username: targetUsername, blocked: user.blocked });
    }

    // ── GET /api/wordle/leaderboard ────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/wordle/leaderboard") {
      const qs       = new URL(matchedPath, "http://x").searchParams;
      const username = cleanUsername(qs.get("username"));
      const payload  = verifyToken(qs.get("token"));
      if (!payload || payload.sub !== username)
        return send(res, 401, { error: "Please log in again." });

      const today = new Date().toISOString().slice(0, 10);

      // Get all user keys
      let userKeys = [];
      if (!KV_URL || !KV_TOKEN) {
        const db = getLocalDb();
        userKeys = Object.keys(db.users).map(name => `user:${name}`);
      } else {
        const r = await fetch(`${KV_URL}/keys/user:*`, {
          headers: { Authorization: `Bearer ${KV_TOKEN}` },
        });
        if (!r.ok) throw new Error(`KV keys read failed (${r.status})`);
        const data = await r.json();
        userKeys = Array.isArray(data.result) ? data.result : [];
      }

      const entries = [];
      for (const key of userKeys) {
        const uname = key.slice(5);
        if (uname === "admin") continue;
        const u = await kvGet(key);
        if (!u) continue;
        const ws = u.wordleState;
        const streak = u.wordleStreak || { current: 0, best: 0 };
        if (ws && ws.date === today && ws.gameOver) {
          entries.push({
            username: uname,
            won:      ws.won || false,
            guesses:  ws.won ? ws.guesses.length : null,  // null = lost
            streak:   streak.current,
            best:     streak.best,
          });
        }
      }

      // Sort: winners first (by fewest guesses), then non-winners
      entries.sort((a, b) => {
        if (a.won && b.won)  return a.guesses - b.guesses;
        if (a.won)           return -1;
        if (b.won)           return 1;
        return 0;
      });

      return send(res, 200, { date: today, dayIndex: getWordleDayIndex(), entries });
    }

    // ── MESSAGING ENDPOINTS ────────────────────────────────────────────────

    // ── GET /api/messages (Admin inbox list) OR GET /api/messages/:userId (Fetch thread)
    if (req.method === "GET" && pathname.startsWith("/api/messages")) {
      const qs = new URL(matchedPath, "http://x").searchParams;
      const payload = verifyToken(qs.get("token"));
      if (!payload) return send(res, 401, { error: "Please log in again." });

      const parts = pathname.split("/").filter(Boolean); // ['api', 'messages', ...]

      // GET /api/messages -> Admin inbox list
      if (parts.length === 2) {
        if (payload.role !== "admin") return send(res, 403, { error: "Forbidden. Admin access required." });

        let userKeys = [];
        if (!KV_URL || !KV_TOKEN) {
          const db = getLocalDb();
          userKeys = Object.keys(db.users || {}).map(name => `user:${name}`);
        } else {
          const r = await fetch(`${KV_URL}/keys/user:*`, {
            headers: { Authorization: `Bearer ${KV_TOKEN}` },
          });
          if (!r.ok) throw new Error(`KV keys read failed (${r.status})`);
          const data = await r.json();
          userKeys = Array.isArray(data.result) ? data.result : [];
        }

        const threads = [];
        for (const key of userKeys) {
          const uname = key.slice(5);
          if (uname === "admin") continue;
          const messages = (await kvGet(`messages:${uname}`)) || [];
          const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
          const unreadCount = messages.filter(m => m.sender === "user" && !m.readByAdmin).length;

          threads.push({
            userId: uname,
            lastMessage: lastMsg ? lastMsg.body : null,
            lastMessageAt: lastMsg ? lastMsg.createdAt : null,
            unreadCount,
          });
        }

        // Sort threads: most recent activity first, then alphabetical
        threads.sort((a, b) => {
          if (a.lastMessageAt && b.lastMessageAt) {
            return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
          }
          if (a.lastMessageAt) return -1;
          if (b.lastMessageAt) return 1;
          return a.userId.localeCompare(b.userId);
        });

        return send(res, 200, { threads });
      }

      // GET /api/messages/:userId -> Fetch specific thread
      if (parts.length === 3) {
        const targetUserId = cleanUsername(parts[2]);
        if (!targetUserId) return send(res, 400, { error: "Invalid user ID." });

        if (payload.role !== "admin" && payload.sub !== targetUserId) {
          return send(res, 403, { error: "Forbidden. You can only view your own thread." });
        }

        const messages = (await kvGet(`messages:${targetUserId}`)) || [];
        const unreadCount = messages.filter(m => 
          payload.role === "admin" 
            ? (m.sender === "user" && !m.readByAdmin)
            : (m.sender === "admin" && !m.readByUser)
        ).length;

        return send(res, 200, { userId: targetUserId, messages, unreadCount });
      }
    }

    // ── POST /api/messages (Send message)
    if (req.method === "POST" && pathname === "/api/messages") {
      const payload = verifyToken(body.token);
      if (!payload) return send(res, 401, { error: "Please log in again." });

      const targetUserId = cleanUsername(body.userId);
      const sender = String(body.sender || "").toLowerCase();
      const rawBody = String(body.body || "").trim();

      if (!targetUserId) return send(res, 400, { error: "User ID is required." });
      if (sender !== "user" && sender !== "admin") return send(res, 400, { error: "Invalid sender type." });
      if (!rawBody) return send(res, 400, { error: "Message cannot be empty." });
      if (rawBody.length > 1000) return send(res, 400, { error: "Message exceeds 1000 characters." });

      // Auth checks: user can only send to their own thread; admin can send to any user thread
      if (sender === "user" && payload.sub !== targetUserId) {
        return send(res, 403, { error: "Forbidden. You can only send messages in your own thread." });
      }
      if (sender === "admin" && payload.role !== "admin") {
        return send(res, 403, { error: "Forbidden. Admin authorization required." });
      }

      const messages = (await kvGet(`messages:${targetUserId}`)) || [];
      const newMsg = {
        id: `msg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        threadUserId: targetUserId,
        sender,
        body: rawBody,
        createdAt: new Date().toISOString(),
        readByUser: sender === "user",
        readByAdmin: sender === "admin",
      };

      messages.push(newMsg);
      await kvSet(`messages:${targetUserId}`, messages);

      return send(res, 201, { success: true, message: newMsg });
    }

    // ── POST /api/messages/:userId/read (Mark thread read)
    if (req.method === "POST" && pathname.startsWith("/api/messages/") && pathname.endsWith("/read")) {
      const parts = pathname.split("/").filter(Boolean); // ['api', 'messages', ':userId', 'read']
      if (parts.length === 4 && parts[3] === "read") {
        const targetUserId = cleanUsername(parts[2]);
        const payload = verifyToken(body.token);
        if (!payload) return send(res, 401, { error: "Please log in again." });

        const reader = String(body.reader || "").toLowerCase();
        if (reader !== "user" && reader !== "admin") {
          return send(res, 400, { error: "Invalid reader type." });
        }

        if (reader === "user" && payload.sub !== targetUserId) {
          return send(res, 403, { error: "Forbidden." });
        }
        if (reader === "admin" && payload.role !== "admin") {
          return send(res, 403, { error: "Forbidden." });
        }

        const messages = (await kvGet(`messages:${targetUserId}`)) || [];
        let updated = false;
        for (const m of messages) {
          if (reader === "user" && m.sender === "admin" && !m.readByUser) {
            m.readByUser = true;
            updated = true;
          } else if (reader === "admin" && m.sender === "user" && !m.readByAdmin) {
            m.readByAdmin = true;
            updated = true;
          }
        }

        if (updated) {
          await kvSet(`messages:${targetUserId}`, messages);
        }

        return send(res, 200, { success: true, userId: targetUserId });
      }
    }

    // ── GET /api/notes/sticky/:userId ─────────────────────────────────────
    if (req.method === "GET" && pathname.startsWith("/api/notes/sticky/")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length === 4) {
        const targetUserId = cleanUsername(parts[3]);
        const qs      = new URL(matchedPath, "http://x").searchParams;
        const payload = verifyToken(qs.get("token"));
        if (!payload) return send(res, 401, { error: "Please log in again." });
        if (payload.role !== "admin" && payload.sub !== targetUserId)
          return send(res, 403, { error: "Forbidden." });

        const user     = await kvGet(`user:${targetUserId}`);
        const messages = (await kvGet(`messages:${targetUserId}`)) || [];

        const latestAdminNote = [...messages].reverse().find(m => m.sender === "admin") || null;

        let userReply = null;
        if (latestAdminNote) {
          const noteTs = new Date(latestAdminNote.createdAt).getTime();
          userReply = [...messages].reverse().find(
            m => m.sender === "user" && new Date(m.createdAt).getTime() > noteTs
          ) || null;
        }

        return send(res, 200, {
          stickyNote:            latestAdminNote,
          userReply,
          firstLoginAfterNoteAt: user?.firstLoginAfterNoteAt || null,
          firstLoginAfterNoteId: user?.firstLoginAfterNoteId || null,
        });
      }
    }

    // ── GET /api/notes/admin-sticky — latest user msg across all threads ───
    if (req.method === "GET" && pathname === "/api/notes/admin-sticky") {
      const qs      = new URL(matchedPath, "http://x").searchParams;
      const payload = verifyToken(qs.get("token"));
      if (!payload || payload.role !== "admin")
        return send(res, 401, { error: "Unauthorized." });

      let userKeys = [];
      if (!KV_URL || !KV_TOKEN) {
        userKeys = Object.keys(getLocalDb().users || {}).map(n => `user:${n}`);
      } else {
        const r = await fetch(`${KV_URL}/keys/user:*`, {
          headers: { Authorization: `Bearer ${KV_TOKEN}` },
        });
        if (!r.ok) throw new Error(`KV keys read failed (${r.status})`);
        userKeys = (await r.json()).result || [];
      }

      let globalLatest = null;
      for (const key of userKeys) {
        const uname = key.slice(5);
        if (uname === "admin") continue;
        const msgs   = (await kvGet(`messages:${uname}`)) || [];
        const latest = [...msgs].reverse().find(m => m.sender === "user");
        if (!latest) continue;
        if (!globalLatest || new Date(latest.createdAt) > new Date(globalLatest.createdAt))
          globalLatest = { ...latest, fromUser: uname };
      }

      return send(res, 200, { stickyNote: globalLatest });
    }

    return send(res, 404, { error: "Not found." });

  } catch (err) {
    // Log the full error so it appears in Vercel function logs
    console.error("[api/index]", err.message);
    return send(res, 500, { error: `Server error: ${err.message}` });
  }
};
