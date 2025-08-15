// server.js
const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// CORS (erlaubt Shortcuts / externe Clients)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // bei Bedarf einschränken
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// In-memory: tokens map -> { token, createdAt, queue: [ { id, force, createdAt } ] }
const tokens = new Map();

// Hilfsfunktionen
function generateToken(length = 6) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

// Create a token (optional admin protection: if ADMIN_KEY set, header x-admin-key required)
// If no ADMIN_KEY, creation is open (dev mode)
app.post("/api/token", (req, res) => {
  const ADMIN_KEY = process.env.ADMIN_KEY;
  if (ADMIN_KEY) {
    const provided = req.header("x-admin-key") || req.query.k;
    if (provided !== ADMIN_KEY) return res.status(401).json({ error: "unauthorized" });
  }
  // allow optional custom token passed in body.token (for testing), else generate
  const requested = (req.body && req.body.token) ? String(req.body.token).toUpperCase() : null;
  let token = requested || generateToken(6);
  // avoid collisions
  while (tokens.has(token)) token = generateToken(6);
  tokens.set(token, { token, createdAt: Date.now(), queue: [] });
  return res.json({ ok: true, token });
});

// List tokens (admin only if ADMIN_KEY set; if not set, this endpoint returns all tokens)
app.get("/api/tokens", (req, res) => {
  const ADMIN_KEY = process.env.ADMIN_KEY;
  if (ADMIN_KEY) {
    const provided = req.header("x-admin-key") || req.query.k;
    if (provided !== ADMIN_KEY) return res.status(401).json({ error: "unauthorized" });
  }
  const data = Array.from(tokens.values()).map(t => ({ token: t.token, queued: t.queue.length, createdAt: t.createdAt }));
  return res.json({ tokens: data });
});

// Push force to a token: POST /api/data/:token
// Body must contain either `force` object or flat fields that will be assembled into a force
// Additionally, either payload.force.app === 'stopwatch' OR top-level body.app === 'stopwatch' OR query ?app=stopwatch must be present
app.post("/api/data/:token", (req, res) => {
  const token = String(req.params.token || "").toUpperCase();
  if (!tokens.has(token)) return res.status(404).json({ error: "token not found" });

  const payload = req.body || {};
  // resolve 'app' requirement
  const appName = (payload.force && payload.force.app) || payload.app || req.query.app;
  if (!appName || String(appName).toLowerCase() !== "stopwatch") {
    return res.status(400).json({ error: "force must target app 'stopwatch' (provide force.app or app='stopwatch')" });
  }

  // Accept either payload.force or build one from flat params
  let force = payload.force || null;
  if (!force) {
    const mode = payload.mode;
    if (!mode) return res.status(400).json({ error: "missing force object or mode" });
    force = { mode };
    if (payload.target !== undefined) force.target = payload.target;
    if (payload.trigger !== undefined) force.trigger = payload.trigger;
    if (payload.minDurationMs !== undefined) force.minDurationMs = Number(payload.minDurationMs);
    if (payload.minPressCount !== undefined) force.minPressCount = Number(payload.minPressCount);
    if (payload.list) {
      try { force.list = typeof payload.list === "string" ? JSON.parse(payload.list) : payload.list; } catch (e) { force.list = payload.list; }
    }
    // ensure the app is present
    force.app = "stopwatch";
  }

  const id = crypto.randomUUID();
  const entry = { id, force, createdAt: Date.now() };
  const bucket = tokens.get(token);
  bucket.queue.push(entry);

  return res.json({ ok: true, id, queued: bucket.queue.length });
});

// Poll endpoint for clients (spectator UI): GET /api/data/:token
app.get("/api/data/:token", (req, res) => {
  const token = String(req.params.token || "").toUpperCase();
  const bucket = tokens.get(token);
  if (!bucket) return res.status(404).json({ error: "token not found" });
  // return the queue array
  return res.json({ queue: bucket.queue });
});

// Ack: remove force by id -> POST /api/ack/:token  with JSON { forceId: "..." }
app.post("/api/ack/:token", (req, res) => {
  const token = String(req.params.token || "").toUpperCase();
  const bucket = tokens.get(token);
  if (!bucket) return res.status(404).json({ error: "token not found" });
  const forceId = req.body && req.body.forceId;
  if (!forceId) return res.status(400).json({ error: "missing forceId" });
  const idx = bucket.queue.findIndex(q => q.id === forceId);
  if (idx >= 0) bucket.queue.splice(idx, 1);
  return res.json({ ok: true });
});

// Serve static frontend (index.html etc.)
app.use(express.static(path.join(__dirname)));

// small status endpoints
app.get("/api/status", (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get("/health", (req, res) => res.send("ok"));

// cleanup old tokens optionally (not removing by default)
setInterval(() => {
  // placeholder: tokens are persistent until removed; no auto-deletion
}, 60 * 1000);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
