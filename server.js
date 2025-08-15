// server.js
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

const usersStore = loadJSON(USERS_FILE, {});
const licensesStore = loadJSON(LICENSES_FILE, {});
const tokensStore = loadJSON(TOKENS_FILE, {});

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
  for (let i = 0; i < len; i++) out += alphabet[r[i] % alphabet.length];
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

// --- Middleware: require admin key ---
function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    console.warn('ADMIN_KEY not set - admin endpoints are open!');
    return next(); // dev mode, allow
  }
  const provided = req.headers['x-admin-key'];
  if (provided !== adminKey) {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}

// --- Middleware: require login ---
function requireLogin(req, res, next) {
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (!sid) return res.status(401).json({ error: 'not logged in' });
  const s = sessions.get(sid);
  if (!s) return res.status(401).json({ error: 'invalid session' });
  req.user = s;
  next();
}

// --- Auth endpoints for magicians (users) ---
app.post('/auth/register', (req, res) => {
  const { code, username, password, displayName } = req.body || {};
  if (!code || !username || !password) return res.status(400).json({ error: 'missing fields' });
  const codeU = String(code).toUpperCase();
  const lic = licensesStore[codeU];
  if (!lic) return res.status(400).json({ error: 'invalid code' });
  if (lic.usedBy) return res.status(400).json({ error: 'code already used' });

  const uname = String(username).toLowerCase();
  if (usersStore[uname]) return res.status(400).json({ error: 'username taken' });

  const { salt, hash } = hashPassword(password);
  usersStore[uname] = { username: uname, displayName: displayName || uname, salt, passwordHash: hash, createdAt: Date.now() };
  saveJSON(USERS_FILE, usersStore);

  licensesStore[codeU].usedBy = uname;
  licensesStore[codeU].usedAt = Date.now();
  saveJSON(LICENSES_FILE, licensesStore);

  const sid = crypto.randomUUID();
  sessions.set(sid, { username: uname, createdAt: Date.now() });
  res.cookie('MAGIC_SESSION', sid, { httpOnly: true, sameSite: 'lax' });
  
  // Ensure user has a token
  ensureUserToken(uname);
  
  return res.json({ ok:true, username: uname });
});

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
  
  // Ensure user has a token
  ensureUserToken(uname);
  
  return res.json({ ok:true, username: uname });
});

app.get('/auth/status', (req,res) => {
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (!sid) return res.json({ loggedIn:false });
  const s = sessions.get(sid);
  if (!s) return res.json({ loggedIn:false });
  return res.json({ loggedIn:true, username: s.username });
});

app.post('/auth/logout', (req,res) => {
  const sid = req.cookies && req.cookies.MAGIC_SESSION;
  if (sid) sessions.delete(sid);
  res.clearCookie('MAGIC_SESSION');
  res.json({ ok:true });
});

// --- License management (Admin) ---
app.post('/api/license', requireAdmin, (req, res) => {
  const { count } = req.body || {};
  const n = parseInt(count, 10) || 1;
  if (n < 1 || n > 100) return res.status(400).json({ error: 'count must be 1-100' });
  
  const created = [];
  for (let i = 0; i < n; i++) {
    let code;
    do { code = genCode(6); } while (licensesStore[code]);
    licensesStore[code] = { code, createdAt: Date.now(), usedBy: null, usedAt: null };
    created.push(code);
  }
  saveJSON(LICENSES_FILE, licensesStore);
  res.json({ ok: true, created });
});

app.get('/api/licenses', requireAdmin, (req, res) => {
  const list = Object.values(licensesStore);
  res.json({ licenses: list });
});

app.get('/api/users', requireAdmin, (req, res) => {
  const list = Object.values(usersStore).map(u => ({
    username: u.username,
    displayName: u.displayName,
    createdAt: u.createdAt
  }));
  res.json({ users: list });
});

// --- User token management (logged in users) ---
// Auto-create token on registration/login if user doesn't have one
function ensureUserToken(username) {
  const userTokens = Object.values(tokensStore).filter(t => t.owner === username);
  if (userTokens.length === 0) {
    let newToken;
    do { newToken = genCode(6); } while (tokensStore[newToken]);
    
    tokensStore[newToken] = {
      token: newToken,
      createdAt: Date.now(),
      owner: username,
      queue: []
    };
    saveJSON(TOKENS_FILE, tokensStore);
    return newToken;
  }
  return userTokens[0].token;
}

app.get('/api/user/tokens', requireLogin, (req, res) => {
  const userToken = ensureUserToken(req.user.username);
  const tokenData = tokensStore[userToken];
  
  res.json({ 
    token: userToken,
    createdAt: tokenData.createdAt,
    queued: tokenData.queue.length,
    apiExamples: {
      spectatorUrl: `${req.protocol}://${req.get('host')}/spectator.html?token=${userToken}`,
      pushForce: {
        url: `${req.protocol}://${req.get('host')}/api/data/${userToken}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"force":{"mode":"ms","target":15,"trigger":"stop","minDurationMs":3000,"app":"stopwatch"}}'
      },
      pollQueue: {
        url: `${req.protocol}://${req.get('host')}/api/data/${userToken}`,
        method: 'GET'
      },
      ackForce: {
        url: `${req.protocol}://${req.get('host')}/api/ack/${userToken}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"forceId":"FORCE_ID_FROM_QUEUE"}'
      }
    }
  });
});

// --- Force / Queue endpoints (public, require valid token) ---
app.post('/api/data/:token', (req, res) => {
  const token = req.params.token;
  const tokenData = tokensStore[token];
  if (!tokenData) return res.status(404).json({ error: 'token not found' });

  const body = req.body || {};
  let force;
  
  // Handle both formats: { force: {...} } and flat { mode, target, ... }
  if (body.force) {
    force = body.force;
  } else {
    force = { ...body };
  }
  
  // Validate app field
  if (!force.app || force.app !== 'stopwatch') {
    return res.status(400).json({ error: 'app must be "stopwatch"' });
  }

  const forceId = crypto.randomUUID();
  const entry = {
    id: forceId,
    force,
    createdAt: Date.now()
  };
  
  tokenData.queue.push(entry);
  saveJSON(TOKENS_FILE, tokensStore);
  
  res.json({ ok: true, id: forceId, queued: tokenData.queue.length });
});

app.get('/api/data/:token', (req, res) => {
  const token = req.params.token;
  const tokenData = tokensStore[token];
  if (!tokenData) return res.status(404).json({ error: 'token not found' });
  
  res.json({ queue: tokenData.queue });
});

app.post('/api/ack/:token', (req, res) => {
  const token = req.params.token;
  const { forceId } = req.body || {};
  const tokenData = tokensStore[token];
  if (!tokenData) return res.status(404).json({ error: 'token not found' });
  
  const initialLength = tokenData.queue.length;
  tokenData.queue = tokenData.queue.filter(entry => entry.id !== forceId);
  
  if (tokenData.queue.length < initialLength) {
    saveJSON(TOKENS_FILE, tokensStore);
  }
  
  res.json({ ok: true });
});

// --- Convenience admin endpoint for sending lists ---
app.post('/api/list/:token', requireAdmin, (req, res) => {
  const token = req.params.token;
  const { list } = req.body || {};
  const tokenData = tokensStore[token];
  if (!tokenData) return res.status(404).json({ error: 'token not found' });
  
  if (!Array.isArray(list)) return res.status(400).json({ error: 'list must be array' });
  
  const forceId = crypto.randomUUID();
  const entry = {
    id: forceId,
    force: {
      mode: 'list',
      list: list.slice(), // copy array
      app: 'stopwatch'
    },
    createdAt: Date.now()
  };
  
  tokenData.queue.push(entry);
  saveJSON(TOKENS_FILE, tokensStore);
  
  res.json({ ok: true, id: forceId });
});

// --- Admin global token list ---
app.get('/api/tokens', requireAdmin, (req, res) => {
  const tokens = Object.values(tokensStore).map(t => ({
    token: t.token,
    owner: t.owner,
    queued: t.queue.length
  }));
  res.json({ tokens });
});

// --- Health endpoints ---
app.get('/health', (req, res) => {
  res.send('ok');
});

app.get('/api/status', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// --- Serve static files from "public" folder ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Root redirect ---
app.get('/', (req, res) => {
  res.redirect('/magician/login.html');
});

// --- 404 fallback ---
app.use((req, res) => {
  console.log('404:', req.url);
  res.status(404).send('Seite nicht gefunden');
});

// --- start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
  console.log('Static files served from:', path.join(__dirname, 'public'));
});
