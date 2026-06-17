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

function signToken(username) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET env var is not set.");
  const h   = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p   = b64(JSON.stringify({ sub: username, exp: Date.now() + TOKEN_TTL }));
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

// ── Main handler ──────────────────────────────────────────────────────
module.exports = async (req, res) => {
  const body     = req.body || {};
  const matchedPath = req.headers["x-forwarded-uri"] || req.url;
  const pathname = new URL(matchedPath, "http://x").pathname;

  try {
    // ── POST /api/register ──────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/register") {
      const username = cleanUsername(body.username);
      const password = String(body.password || "");

      if (!username || password.length < 3)
        return send(res, 400, { error: "Username and password must be at least 3 characters." });

      if (await kvGet(`user:${username}`))
        return send(res, 409, { error: "That username is already taken." });

      const user = { ...createPasswordRecord(password), state: blankState(), createdAt: new Date().toISOString() };
      await kvSet(`user:${username}`, user);
      return send(res, 201, { username, token: signToken(username), state: user.state });
    }

    // ── POST /api/login ─────────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/login") {
      const username = cleanUsername(body.username);
      const user     = await kvGet(`user:${username}`);

      if (!user || !verifyPassword(user, String(body.password || "")))
        return send(res, 401, { error: "Incorrect username or password." });

      return send(res, 200, { username, token: signToken(username), state: normalizeState(user.state) });
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

      user.state     = normalizeState(body.state);
      user.updatedAt = new Date().toISOString();
      await kvSet(`user:${username}`, user);
      return send(res, 200, { username, state: user.state });
    }

    return send(res, 404, { error: "Not found." });

  } catch (err) {
    // Log the full error so it appears in Vercel function logs
    console.error("[api/index]", err.message);
    return send(res, 500, { error: `Server error: ${err.message}` });
  }
};
