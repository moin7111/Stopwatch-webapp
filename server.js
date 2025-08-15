// server.js (ersetzen)
const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// --- CORS (erlaubt Shortcuts / externe Clients) ---
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key, x-shortcut-key");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// In-memory stores
const sessions = new Map();           // sessionId -> { sessionId, clientToken, expiresAt, queue:[] }
const shortcutBindings = new Map();  // key -> sessionId

// Helpers
function checkAdminKeyFromReq(req) {
  const envAdminKey = process.env.ADMIN_KEY;
  if (!envAdminKey) return true;
  const provided = req.header("x-admin-key") || req.query.k || req.query.key;
  return provided === envAdminKey;
}
function getProvidedKey(req) {
  return req.header("x-shortcut-key") || req.query.k || req.query.key;
}
function checkShortcutAuth(req) {
  const envShortcutKey = process.env.SHORTCUT_KEY;
  const envAdminKey = process.env.ADMIN_KEY;
  const provided = getProvidedKey(req);
  if (envAdminKey && provided === envAdminKey) return true;
  if (envShortcutKey && provided === envShortcutKey) return true;
  if (!envAdminKey && !envShortcutKey) return true; // permissive dev mode
  return false;
}

// Admin: create session
app.post("/api/session", (req, res) => {
  if (!checkAdminKeyFromReq(req)) return res.status(401).json({ error: "unauthorized" });

  const expiresInSec = parseInt(req.body.expiresInSec || 300, 10);
  const sessionId = crypto.randomUUID();
  const clientToken = crypto.randomBytes(12).toString("hex");
  const now = Date.now();
  const expiresAt = now + Math.max(30, expiresInSec) * 1000;

  const session = { sessionId, clientToken, expiresAt, queue: [] };
  sessions.set(sessionId, session);
  return res.json({ sessionId, clientToken, expiresAt });
});

// Admin: push force
app.post("/api/force", (req, res) => {
  if (!checkAdminKeyFromReq(req)) return res.status(401).json({ error: "unauthorized" });
  const { sessionId, force } = req.body || {};
  if (!sessionId || !force) return res.status(400).json({ error: "missing sessionId or force" });
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });
  const id = crypto.randomUUID();
  session.queue.push({ id, force, createdAt: Date.now() });
  return res.json({ ok: true, id });
});

// Admin: bind a shortcut key to a session (so shortcut doesn't need sessionId)
app.post("/api/bind", (req, res) => {
  if (!checkAdminKeyFromReq(req)) return res.status(401).json({ error: "unauthorized" });
  const { key, sessionId } = req.body || {};
  if (!key || !sessionId) return res.status(400).json({ error: "missing key or sessionId" });
  if (!sessions.has(sessionId)) return res.status(404).json({ error: "session not found" });
  shortcutBindings.set(key, sessionId);
  return res.json({ ok: true, key, sessionId });
});

// Shortcut endpoint: accepts POST/GET; sessionId optional.
// If sessionId not provided, server tries following (in order):
//  1) find binding: provided key -> bound sessionId
//  2) if exactly one active session exists -> use that
//  otherwise -> error (ask to bind)
app.all("/shortcut", (req, res) => {
  if (!checkShortcutAuth(req)) return res.status(401).json({ error: "unauthorized" });

  const payload = req.method === "POST" ? (req.body || {}) : (req.query || {});
  let sessionId = payload.sessionId || payload.sid || payload.s;
  const providedKey = getProvidedKey(req);

  // if no sessionId, try binding
  if (!sessionId) {
    if (providedKey && shortcutBindings.has(providedKey)) {
      sessionId = shortcutBindings.get(providedKey);
    } else {
      // fallback: if exactly one session exists, use it
      const activeSessions = Array.from(sessions.keys());
      if (activeSessions.length === 1) sessionId = activeSessions[0];
    }
  }

  if (!sessionId) return res.status(400).json({ error: "missing sessionId and no binding available; bind a key or provide sessionId" });

  const force = payload.force || null;
  if (!force) {
    // attempt to build from flat params
    const mode = payload.mode;
    if (!mode) return res.status(400).json({ error: "missing force.mode or force object" });
    // construct
    const f = { mode };
    if (payload.target !== undefined) f.target = payload.target;
    if (payload.trigger !== undefined) f.trigger = payload.trigger;
    if (payload.minDurationMs !== undefined) f.minDurationMs = Number(payload.minDurationMs);
    if (payload.minPressCount !== undefined) f.minPressCount = Number(payload.minPressCount);
    if (payload.list) {
      try { f.list = typeof payload.list === "string" ? JSON.parse(payload.list) : payload.list; } catch (e) { f.list = payload.list; }
    }
    // assign
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "session not found" });
    const id = crypto.randomUUID();
    session.queue.push({ id, force: f, createdAt: Date.now() });
    return res.json({ ok: true, id, queued: session.queue.length });
  } else {
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "session not found" });
    const id = crypto.randomUUID();
    session.queue.push({ id, force, createdAt: Date.now() });
    return res.json({ ok: true, id, queued: session.queue.length });
  }
});

// Client poll config
app.get("/api/config", (req, res) => {
  const sessionId = req.query.sessionId;
  const token = req.query.token;
  if (!sessionId || !token) return res.status(400).json({ error: "missing sessionId or token" });
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });
  if (session.clientToken !== token) return res.status(403).json({ error: "invalid token" });
  return res.json({ queue: session.queue });
});

// Client ack
app.post("/api/ack", (req, res) => {
  const { sessionId, token, forceId } = req.body || {};
  if (!sessionId || !token || !forceId) return res.status(400).json({ error: "missing fields" });
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });
  if (session.clientToken !== token) return res.status(403).json({ error: "invalid token" });
  const idx = session.queue.findIndex(q => q.id === forceId);
  if (idx >= 0) session.queue.splice(idx, 1);
  return res.json({ ok: true });
});

// List sessions
app.get("/api/sessions", (req, res) => {
  if (!checkAdminKeyFromReq(req)) return res.status(401).json({ error: "unauthorized" });
  const data = [];
  for (const s of sessions.values()) data.push({ sessionId: s.sessionId, expiresAt: s.expiresAt, queued: s.queue.length });
  res.json({ sessions: data });
});

// Static files
app.use(express.static(path.join(__dirname)));

app.get("/api/status", (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get("/health", (req, res) => res.send("ok"));

// Cleanup
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt && session.expiresAt < now) sessions.delete(id);
  }
}, 60 * 1000);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
