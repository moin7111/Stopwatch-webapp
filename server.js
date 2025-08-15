// server.js
const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// --- Simple CORS middleware (ermöglicht iOS Shortcuts / externe Clients) ---
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // bei Bedarf einschränken
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key, x-shortcut-key");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// In-memory session store (simple; geeignet für Demo / Render Free)
const sessions = new Map();

// Helper: prüft Admin-Key (ENV ADMIN_KEY)
// Falls ADMIN_KEY nicht gesetzt ist, erlauben wir Admin-Endpoints in Dev (wie vorher)
function checkAdminKeyFromReq(req) {
  const envAdminKey = process.env.ADMIN_KEY;
  if (!envAdminKey) return true;
  const provided = req.header("x-admin-key") || req.query.k || req.header("x-shortcut-key") || req.query.key;
  return provided === envAdminKey;
}

// Helper: prüft Shortcut-Key (ENV SHORTCUT_KEY) oder ADMIN_KEY
function checkShortcutAuth(req) {
  const envShortcutKey = process.env.SHORTCUT_KEY;
  const envAdminKey = process.env.ADMIN_KEY;
  const provided = req.header("x-shortcut-key") || req.query.k || req.header("x-admin-key") || req.query.key;
  if (envAdminKey && provided === envAdminKey) return true;
  if (envShortcutKey && provided === envShortcutKey) return true;
  // if neither env var set -> permissive dev mode
  if (!envAdminKey && !envShortcutKey) return true;
  return false;
}

// Create session (admin)
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

// Admin: push a force to a session
app.post("/api/force", (req, res) => {
  if (!checkAdminKeyFromReq(req)) return res.status(401).json({ error: "unauthorized" });
  const { sessionId, force } = req.body || {};
  if (!sessionId || !force) return res.status(400).json({ error: "missing sessionId or force" });

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });

  const id = crypto.randomUUID();
  const entry = { id, force, createdAt: Date.now() };
  session.queue.push(entry);

  return res.json({ ok: true, id });
});

// NEW: Shortcut endpoint (leichte Integration für iOS Shortcuts)
// Accepts POST JSON body or GET query params.
// Auth: either ADMIN_KEY or SHORTCUT_KEY header/query (`x-shortcut-key` or ?k=...).
// If neither ADMIN_KEY nor SHORTCUT_KEY are set in env -> permissive for dev.
app.all("/shortcut", (req, res) => {
  // Allow both GET and POST (GET supports quick test via browser or Shortcut using GET)
  if (!checkShortcutAuth(req)) return res.status(401).json({ error: "unauthorized" });

  // Input may be in JSON body (POST) or query params
  const payload = req.method === "POST" ? (req.body || {}) : req.query || {};
  // Support both shapes: { sessionId, force: {...} } or flat { sessionId, mode, target, trigger, ... }
  const sessionId = payload.sessionId || payload.sid || payload.s;
  if (!sessionId) return res.status(400).json({ error: "missing sessionId" });

  // Build force object
  let force = payload.force || null;
  if (!force) {
    // attempt to construct from flat params
    const mode = payload.mode;
    if (!mode) return res.status(400).json({ error: "missing force.mode or force object" });
    force = { mode };
    if (payload.target !== undefined) force.target = payload.target;
    if (payload.trigger !== undefined) force.trigger = payload.trigger;
    if (payload.minDurationMs !== undefined) force.minDurationMs = Number(payload.minDurationMs);
    if (payload.minPressCount !== undefined) force.minPressCount = Number(payload.minPressCount);
    if (payload.list) {
      try {
        force.list = typeof payload.list === "string" ? JSON.parse(payload.list) : payload.list;
      } catch (e) { force.list = payload.list; }
    }
  }

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });

  const id = crypto.randomUUID();
  const entry = { id, force, createdAt: Date.now() };
  session.queue.push(entry);

  return res.json({ ok: true, id, queued: session.queue.length });
});

// Client polls config (Spectator client)
app.get("/api/config", (req, res) => {
  const sessionId = req.query.sessionId;
  const token = req.query.token;
  if (!sessionId || !token) return res.status(400).json({ error: "missing sessionId or token" });

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });
  if (session.clientToken !== token) return res.status(403).json({ error: "invalid token" });

  // only return queue items
  return res.json({ queue: session.queue });
});

// Client ACK after applying a force -> remove it from queue
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

// Optional: admin can list sessions
app.get("/api/sessions", (req, res) => {
  if (!checkAdminKeyFromReq(req)) return res.status(401).json({ error: "unauthorized" });
  const data = [];
  for (const s of sessions.values()) {
    data.push({ sessionId: s.sessionId, expiresAt: s.expiresAt, queued: s.queue.length });
  }
  res.json({ sessions: data });
});

// Static files (index.html etc.)
app.use(express.static(path.join(__dirname)));

// Example status and health endpoints
app.get("/api/status", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});
app.get("/health", (req, res) => {
  res.send("ok");
});

// Cleanup expired sessions regularly
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt && session.expiresAt < now) sessions.delete(id);
  }
}, 60 * 1000);

// PORT from Render or 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
