const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// In-memory session store (simple, suitable für Demo / Render Free).
// Jede Session: { sessionId, clientToken, expiresAt(ms), queue: [ { id, force, createdAt } ] }
const sessions = new Map();

// Helper: admin auth (simple, über ENV ADMIN_KEY)
function checkAdmin(req) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return true; // wenn kein ADMIN_KEY gesetzt ist: development mode -> allowed
  return req.header('x-admin-key') === adminKey;
}

// Erstelle Session
app.post('/api/session', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'unauthorized' });

  const expiresInSec = parseInt(req.body.expiresInSec || 300, 10);
  const sessionId = crypto.randomUUID();
  const clientToken = crypto.randomBytes(12).toString('hex');
  const now = Date.now();
  const expiresAt = now + Math.max(30, expiresInSec) * 1000;

  const session = { sessionId, clientToken, expiresAt, queue: [] };
  sessions.set(sessionId, session);

  return res.json({ sessionId, clientToken, expiresAt });
});

// Admin: push a force to a session
app.post('/api/force', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  const { sessionId, force } = req.body || {};
  if (!sessionId || !force) return res.status(400).json({ error: 'missing sessionId or force' });

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'session not found' });

  const id = crypto.randomUUID();
  const entry = { id, force, createdAt: Date.now() };
  session.queue.push(entry);

  return res.json({ ok: true, id });
});

// Client polls config (Spectator client)
app.get('/api/config', (req, res) => {
  const sessionId = req.query.sessionId;
  const token = req.query.token;
  if (!sessionId || !token) return res.status(400).json({ error: 'missing sessionId or token' });

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'session not found' });
  if (session.clientToken !== token) return res.status(403).json({ error: 'invalid token' });

  // only return queue items that are not expired (we don't set individual expiry for forces here)
  return res.json({ queue: session.queue });
});

// Client ACK after applying a force -> remove it from queue (or remove specific id)
app.post('/api/ack', (req, res) => {
  const { sessionId, token, forceId } = req.body || {};
  if (!sessionId || !token || !forceId) return res.status(400).json({ error: 'missing fields' });
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'session not found' });
  if (session.clientToken !== token) return res.status(403).json({ error: 'invalid token' });

  const idx = session.queue.findIndex(q => q.id === forceId);
  if (idx >= 0) session.queue.splice(idx,1);

  return res.json({ ok: true });
});

// Optional: admin can list sessions
app.get('/api/sessions', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  const data = [];
  for (const s of sessions.values()) {
    data.push({ sessionId: s.sessionId, expiresAt: s.expiresAt, queued: s.queue.length });
  }
  res.json({ sessions: data });
});

// Static files
app.use(express.static(path.join(__dirname)));

// Beispiel-API (GET)
app.get("/api/status", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Health-Check für Render
app.get("/health", (req, res) => {
  res.send("ok");
});

// Cleanup: entferne abgelaufene sessions regelmäßig
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt && session.expiresAt < now) {
      sessions.delete(id);
    }
  }
}, 60 * 1000);

// Render setzt PORT automatisch
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
