const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root      = __dirname;
const publicDir = path.join(root, "public");   // static assets live here
const dataFile  = process.env.DATA_FILE || path.join(root, "data.json");
const port      = Number(process.env.PORT || 3000);
const sessions  = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server error." });
  }
});

server.listen(port, () => {
  console.log(`Attendance Guard running at http://localhost:${port}`);
});

async function handleApi(req, res, url) {
  // Add Vercel-like helper methods for serverless compatibility
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
  };

  // Parse JSON body for POST requests
  if (req.method === "POST") {
    try {
      req.body = await readJson(req);
    } catch {
      req.body = {};
    }
  }

  // Delegate request to api/index.js handler
  const handler = require("./api/index.js");
  try {
    await handler(req, res);
  } catch (error) {
    console.error("API handler error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

function serveStatic(res, requestPath) {
  const fileName = requestPath === "/" ? "index.html" : requestPath.slice(1);

  // Reject hidden files and path traversal attempts
  if (fileName.startsWith(".") || fileName.includes("..")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  // All static files live in public/ — server.js / data.json are never reachable
  const resolved = path.resolve(publicDir, fileName);
  if (!resolved.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(resolved, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(resolved)] || "application/octet-stream" });
    res.end(content);
  });
}

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return { users: {} };
  }
}

function writeDb(db) {
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

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
    const stored = Buffer.from(user.passwordHash, "hex");
    const candidate = crypto.scryptSync(password, user.passwordSalt, stored.length);
    return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
  }

  return typeof user.password === "string" && user.password === password;
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, username);
  return token;
}

function isSessionValid(username, token) {
  return Boolean(username && token && sessions.get(String(token)) === username);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request too large."));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");
}

function blankState() {
  return { target: 75, records: {} };
}

function normalizeState(value) {
  return {
    ...blankState(),
    ...(value || {}),
    target: Number(value?.target || 75),
    records: value?.records && typeof value.records === "object" ? value.records : {},
  };
}
