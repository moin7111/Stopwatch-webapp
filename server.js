// server.js (ERSETZEN)
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cookieParser());

// --- file-backed simple stores (users, licenses, tokens) ---
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LICENSES_FILE = path.join(DATA_DIR, 'licenses.json');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

function loadJSON(file, def) {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(def, null, 2)); return def; }
    const txt = fs.readFileSync(file, 'utf8');
    return JSON.parse(txt || 'null') || def;
  } catch (e) { console.error('loadJSON error', file, e); return def; }
}
function saveJSON(file, obj) {
  try { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); } catch (e) { console.error('saveJSON error', file, e); }
}

const usersStore = loadJSON(USERS_FILE, {});      // username -> { username, displayName, salt, passwordHash, createdAt }
const licensesStore = loadJSON(LICENSES_FILE, {});// code -> { code, createdAt, usedBy: null|username, usedAt:null }
const tokensStore = loadJSON(TOKENS_FILE, {});    // token -> { token, createdAt, owner: username|null, queue:[] }

// helper crypto password hash (scrypt)
function hashPassword(password, salt = null) {
  salt = salt || crypto.randomBytes(12).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash: derived };
}
function verifyPassword(password, salt, hash) {
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}
function genCode(len = 6) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const r = crypto.randomBytes(len);
  let out = "";
  for (let i=0;i<len;i++) out += alphabet[r[i] % alphabet.length];
  return out;
}

// in-memory session store: sessionId -> { username, createdAt }
const sessions = new Map();

// --- CORS (for Shortcuts / external clients) ---
app.use((req,res,next) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// --- Auth endpoints for magicians (users) ---
// POST /auth/register { code, username, password, displayName? }
app.post('/auth/register', (req, res) => {
  const { code, username, password, displayName } = req.body || {};
  if (!code || !username || !password) return res.status(400).json({ error: 'missing fields' });
  const codeU = String(code).toUpperCase();
  const lic = licensesStore[codeU];
  if (!lic) return res.status(400).json({ error: 'invalid code' });
  if (lic.usedBy) return res.status(400).json({ error: 'code already used' });

  const uname = String(username).toLowerCase();
  if (usersStore[uname]) return res.status(400).json({ error: 'username taken' });

  // create user
  const { salt, hash } = hashPassword(password);
  usersStore[uname] = { username: uname, displayName: displayName || uname, salt, passwordHash: hash, createdAt: Date.now() };
  saveJSON(USERS_FILE, usersStore);

  // mark license used
  licensesStore[codeU].usedBy = uname;
  licensesStore[codeU].usedAt = Date.now();
  saveJSON(LICENSES_FILE, licensesStore);

  // create session
  const sid = crypto.randomUUID();
  sessions.set(sid, { username: uname, createdAt: Date.now() });
  res.cookie('MAGIC_SESSION', sid, { httpOnly: true, sameSite: 'lax' });
  return res.json({ ok:true, username: uname });
});

// POST /auth/login { username, password }
app.post('/auth/login', (req,res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error:'missing' });
  const uname = String(username).toLowerCase();
  const u = usersStore[uname];
  if (!u) return res.status(401).json({ error:'invalid' });
  if (!verifyPassword(password, u.salt, u.passwordHash)) return res.status(401).json({ error:'invalid' });
  const sid = crypto.randomUUID();
  sessions.set(sid, { username: uname, createdAt: Date.now() });
  res.cookie('MAGIC_SESSION', sid, { httpOnly: true, sameSite: 'lax' });
  return res.json({ ok:true, username: uname });
});

// GET /auth/status
app.get('/auth/status', (req,res) => {
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (!sid) return res.json({ loggedIn:false });
  const s = sessions.get(sid);
  if (!s) return res.json({ loggedIn:false });
  return res.json({ loggedIn:true, username: s.username });
});

// POST /auth/logout
app.post('/auth/logout', (req,res) => {
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (sid) sessions.delete(sid);
  res.clearCookie('MAGIC_SESSION');
  res.json({ ok:true });
});

// --- admin helpers (protected by ADMIN_KEY env var) ---
function requireAdminHeader(req) {
  const ADMIN_KEY = process.env.ADMIN_KEY;
  if (!ADMIN_KEY) return false;
  const provided = req.header('x-admin-key');
  return provided && provided === ADMIN_KEY;
}

// Admin: create license codes -> POST /api/license { count: number }
app.post('/api/license', (req,res) => {
  if (!requireAdminHeader(req)) return res.status(401).json({ error:'unauthorized' });
  const count = parseInt(req.body && req.body.count || 1, 10);
  const created = [];
  for (let i=0;i<count;i++) {
    let code = genCode(6);
    while (licensesStore[code]) code = genCode(6);
    licensesStore[code] = { code, createdAt: Date.now(), usedBy: null, usedAt: null };
    created.push(code);
  }
  saveJSON(LICENSES_FILE, licensesStore);
  return res.json({ ok:true, created });
});

// Admin: list license codes -> GET /api/licenses
app.get('/api/licenses', (req,res) => {
  if (!requireAdminHeader(req)) return res.status(401).json({ error:'unauthorized' });
  return res.json({ licenses: Object.values(licensesStore) });
});

// Admin: list users -> GET /api/users
app.get('/api/users', (req,res) => {
  if (!requireAdminHeader(req)) return res.status(401).json({ error:'unauthorized' });
  return res.json({ users: Object.values(usersStore) });
});

// --- user-scoped token management (users create their own tokens) ---
// helper to get current user from cookie
function getCurrentUser(req) {
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (!sid) return null;
  const s = sessions.get(sid);
  return s ? s.username : null;
}

// create token owned by logged-in user -> POST /api/user/token  { token?: "ABC" }
app.post('/api/user/token', (req,res) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error:'login required' });

  let t = req.body && req.body.token ? String(req.body.token).toUpperCase() : genCode(6);
  while (tokensStore[t]) t = genCode(6);

  tokensStore[t] = { token: t, createdAt: Date.now(), owner: user, queue: [] };
  saveJSON(TOKENS_FILE, tokensStore);
  return res.json({ ok:true, token: t });
});

// list tokens for current user -> GET /api/user/tokens
app.get('/api/user/tokens', (req,res) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error:'login required' });
  const list = Object.values(tokensStore).filter(x => x.owner === user).map(t => ({ token: t.token, createdAt: t.createdAt, queued: t.queue.length }));
  return res.json({ tokens: list });
});

// delete user's token -> DELETE /api/user/token/:token
app.delete('/api/user/token/:token', (req,res) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error:'login required' });
  const token = String(req.params.token || '').toUpperCase();
  const t = tokensStore[token];
  if (!t) return res.status(404).json({ error:'not found' });
  if (t.owner !== user) return res.status(403).json({ error:'forbidden' });
  delete tokensStore[token];
  saveJSON(TOKENS_FILE, tokensStore);
  return res.json({ ok:true });
});

// --- force endpoints (unchanged shape) ---
// POST /api/data/:token  -> push force (app must be 'stopwatch')
app.post('/api/data/:token', (req,res) => {
  const token = String(req.params.token || '').toUpperCase();
  const bucket = tokensStore[token];
  if (!bucket) return res.status(404).json({ error:'token not found' });

  const payload = req.body || {};
  const appName = (payload.force && payload.force.app) || payload.app || req.query.app;
  if (!appName || String(appName).toLowerCase() !== 'stopwatch') {
    return res.status(400).json({ error: "force must target app 'stopwatch'" });
  }

  let force = payload.force || null;
  if (!force) {
    const mode = payload.mode;
    if (!mode) return res.status(400).json({ error:'missing force or mode' });
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
  bucket.queue.push(entry);
  saveJSON(TOKENS_FILE, tokensStore);
  return res.json({ ok:true, id, queued: bucket.queue.length });
});

// GET /api/data/:token -> poll queue
app.get('/api/data/:token', (req,res) => {
  const token = String(req.params.token || '').toUpperCase();
  const bucket = tokensStore[token];
  if (!bucket) return res.status(404).json({ error:'token not found' });
  return res.json({ queue: bucket.queue });
});

// POST /api/ack/:token { forceId }
app.post('/api/ack/:token', (req,res) => {
  const token = String(req.params.token || '').toUpperCase();
  const bucket = tokensStore[token];
  if (!bucket) return res.status(404).json({ error:'token not found' });
  const forceId = req.body && req.body.forceId;
  if (!forceId) return res.status(400).json({ error:'missing forceId' });
  const idx = bucket.queue.findIndex(q => q.id === forceId);
  if (idx >= 0) bucket.queue.splice(idx, 1);
  saveJSON(TOKENS_FILE, tokensStore);
  return res.json({ ok:true });
});

// convenience: admin list tokens (all)
app.get('/api/tokens', (req,res) => {
  if (!requireAdminHeader(req)) return res.status(401).json({ error:'unauthorized' });
  return res.json({ tokens: Object.values(tokensStore).map(t => ({ token: t.token, owner: t.owner, queued: t.queue.length })) });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// health/status
app.get('/api/status', (req,res) => res.json({ ok:true, uptime: process.uptime() }));
app.get('/health', (req,res) => res.send('ok'));

// start
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
