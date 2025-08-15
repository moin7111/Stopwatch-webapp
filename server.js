// server.js (komplett ersetzten)
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());

// --- CORS (erlaubt Shortcuts / externe Clients) ---
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// In-memory stores (simple; good for Render Free demos)
const tokens = new Map(); // token -> { token, createdAt, queue: [ {id,force,createdAt} ] }
const sessions = new Map(); // sessionId -> { createdAt, admin: boolean }

// Helpers
function generateToken(len = 6) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  const bytes = crypto.randomBytes(len);
  for (let i=0;i<len;i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}
function requireAdmin(req, res) {
  // if ADMIN_KEY env set, require either header x-admin-key or session cookie with admin true
  const ADMIN_KEY = process.env.ADMIN_KEY;
  if (!ADMIN_KEY) return true; // dev: open
  // check header
  const header = req.header('x-admin-key');
  if (header && header === ADMIN_KEY) return true;
  // check session cookie
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (!sid) return false;
  const s = sessions.get(sid);
  return !!(s && s.admin);
}

// ---------------- AUTH (magician simple login) ----------------
// POST /auth/login  { key?: string }  -> sets MAGIG_SESSION cookie (httpOnly)
app.post('/auth/login', (req, res) => {
  const ADMIN_KEY = process.env.ADMIN_KEY;
  const provided = (req.body && req.body.key) ? String(req.body.key) : null;

  // If ADMIN_KEY is set, require exact match. If not set, any login allowed (dev mode).
  if (ADMIN_KEY) {
    if (!provided || provided !== ADMIN_KEY) return res.status(401).json({ error: 'invalid key' });
  }
  // create session
  const sessionId = crypto.randomUUID();
  const isAdmin = !!ADMIN_KEY; // if ADMIN_KEY exists, the login with key gives admin privileges
  sessions.set(sessionId, { createdAt: Date.now(), admin: isAdmin });
  // set cookie (httponly)
  res.cookie('MAGIC_SESSION', sessionId, { httpOnly: true, sameSite: 'lax' });
  res.json({ ok:true, admin: isAdmin });
});

// GET /auth/status  -> checks cookie
app.get('/auth/status', (req, res) => {
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (!sid) return res.json({ loggedIn: false });
  const s = sessions.get(sid);
  if (!s) return res.json({ loggedIn: false });
  return res.json({ loggedIn: true, admin: !!s.admin });
});

// POST /auth/logout -> clears cookie
app.post('/auth/logout', (req, res) => {
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (sid) sessions.delete(sid);
  res.clearCookie('MAGIC_SESSION');
  res.json({ ok:true });
});

// ---------------- TOKEN management (admin only) ----------------
// Create token -> POST /api/token  { token?: "ABC" }
app.post('/api/token', (req, res) => {
  if (!requireAdmin(req, res)) return res.status(401).json({ error: 'unauthorized' });
  let t = (req.body && req.body.token) ? String(req.body.token).toUpperCase() : generateToken(6);
  while (tokens.has(t)) t = generateToken(6);
  tokens.set(t, { token: t, createdAt: Date.now(), queue: [] });
  res.json({ ok:true, token: t });
});

// List tokens -> GET /api/tokens
app.get('/api/tokens', (req, res) => {
  if (!requireAdmin(req, res)) return res.status(401).json({ error: 'unauthorized' });
  const out = Array.from(tokens.values()).map(t => ({ token: t.token, queued: t.queue.length, createdAt: t.createdAt }));
  res.json({ tokens: out });
});

// Delete token -> DELETE /api/token/:token
app.delete('/api/token/:token', (req, res) => {
  if (!requireAdmin(req, res)) return res.status(401).json({ error: 'unauthorized' });
  const token = String(req.params.token || '').toUpperCase();
  if (!tokens.has(token)) return res.status(404).json({ error: 'not found' });
  tokens.delete(token);
  res.json({ ok:true, token });
});

// ---------------- FORCE endpoints (spectator / api) ----------------
// Push force -> POST /api/data/:token
app.post('/api/data/:token', (req, res) => {
  const token = String(req.params.token || '').toUpperCase();
  if (!tokens.has(token)) return res.status(404).json({ error: 'token not found' });

  const payload = req.body || {};
  // require 'app' to be 'stopwatch' (or payload.force.app)
  const appName = (payload.force && payload.force.app) || payload.app || req.query.app;
  if (!appName || String(appName).toLowerCase() !== 'stopwatch') {
    return res.status(400).json({ error: "force must target app 'stopwatch' (provide force.app or app='stopwatch')" });
  }

  let force = payload.force || null;
  if (!force) {
    const mode = payload.mode;
    if (!mode) return res.status(400).json({ error: 'missing force or mode' });
    force = { mode };
    if (payload.target !== undefined) force.target = payload.target;
    if (payload.trigger !== undefined) force.trigger = payload.trigger;
    if (payload.minDurationMs !== undefined) force.minDurationMs = Number(payload.minDurationMs);
    if (payload.minPressCount !== undefined) force.minPressCount = Number(payload.minPressCount);
    if (payload.list) {
      try { force.list = typeof payload.list === 'string' ? JSON.parse(payload.list) : payload.list; } catch(e) { force.list = payload.list; }
    }
    force.app = 'stopwatch';
  }

  const id = crypto.randomUUID();
  const entry = { id, force, createdAt: Date.now() };
  tokens.get(token).queue.push(entry);
  res.json({ ok:true, id, queued: tokens.get(token).queue.length });
});

// Poll -> GET /api/data/:token
app.get('/api/data/:token', (req, res) => {
  const token = String(req.params.token || '').toUpperCase();
  if (!tokens.has(token)) return res.status(404).json({ error: 'token not found' });
  res.json({ queue: tokens.get(token).queue });
});

// Ack -> POST /api/ack/:token  { forceId }
app.post('/api/ack/:token', (req, res) => {
  const token = String(req.params.token || '').toUpperCase();
  if (!tokens.has(token)) return res.status(404).json({ error: 'token not found' });
  const forceId = req.body && req.body.forceId;
  if (!forceId) return res.status(400).json({ error: 'missing forceId' });
  const bucket = tokens.get(token);
  const idx = bucket.queue.findIndex(q => q.id === forceId);
  if (idx >= 0) bucket.queue.splice(idx, 1);
  res.json({ ok:true });
});

// Convenience: POST /api/list/:token  -> send a "list" force (magician can push a sequence)
app.post('/api/list/:token', (req, res) => {
  if (!requireAdmin(req, res)) return res.status(401).json({ error: 'unauthorized' });
  const token = String(req.params.token || '').toUpperCase();
  if (!tokens.has(token)) return res.status(404).json({ error: 'token not found' });
  const list = req.body && req.body.list;
  if (!Array.isArray(list) || list.length === 0) return res.status(400).json({ error: 'missing list array' });
  const force = { mode: 'list', list: list.map(item => ({ mode: item.mode||'ms', target: item.target, trigger: item.trigger||'stop' })), app: 'stopwatch' };
  const id = crypto.randomUUID();
  tokens.get(token).queue.push({ id, force, createdAt: Date.now() });
  res.json({ ok:true, id });
});

// Serve static UI from /public
app.use(express.static(path.join(__dirname, 'public')));

// status
app.get('/api/status', (req,res) => res.json({ ok:true, uptime: process.uptime() }));
app.get('/health', (req,res)=> res.send('ok'));

// cleanup (no auto-delete of tokens)
setInterval(()=>{}, 60*1000);

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log(`Server läuft auf Port ${port}`));
