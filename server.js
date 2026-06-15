const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataFile = process.env.DATA_FILE || path.join(root, "data.json");
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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
    sendJson(res, 500, { error: "Server error." });
  }
});

server.listen(port, () => {
  console.log(`Attendance Guard running at http://localhost:${port}`);
});

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/register") {
    const body = await readJson(req);
    const username = cleanUsername(body.username);
    const password = String(body.password || "");
    if (!username || password.length < 3) {
      sendJson(res, 400, { error: "Username and password must be at least 3 characters." });
      return;
    }

    const db = readDb();
    if (db.users[username]) {
      sendJson(res, 409, { error: "That username is already taken." });
      return;
    }

    db.users[username] = {
      password,
      state: blankState(),
      createdAt: new Date().toISOString(),
    };
    writeDb(db);
    sendJson(res, 201, { username, state: db.users[username].state });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readJson(req);
    const username = cleanUsername(body.username);
    const password = String(body.password || "");
    const user = readDb().users[username];
    if (!user || user.password !== password) {
      sendJson(res, 401, { error: "Incorrect username or password." });
      return;
    }
    sendJson(res, 200, { username, state: user.state || blankState() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    const username = cleanUsername(url.searchParams.get("username"));
    const user = readDb().users[username];
    if (!user) {
      sendJson(res, 404, { error: "User not found." });
      return;
    }
    sendJson(res, 200, { username, state: user.state || blankState() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/state") {
    const body = await readJson(req);
    const username = cleanUsername(body.username);
    const db = readDb();
    if (!db.users[username]) {
      sendJson(res, 404, { error: "User not found." });
      return;
    }
    db.users[username].state = normalizeState(body.state);
    db.users[username].updatedAt = new Date().toISOString();
    writeDb(db);
    sendJson(res, 200, { username, state: db.users[username].state });
    return;
  }

  sendJson(res, 404, { error: "Not found." });
}

function serveStatic(res, requestPath) {
  const fileName = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const blockedFiles = new Set(["data.json", "server.js", "package.json"]);
  if (blockedFiles.has(fileName) || fileName.startsWith(".")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const resolved = path.resolve(root, fileName);
  if (!resolved.startsWith(root)) {
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
