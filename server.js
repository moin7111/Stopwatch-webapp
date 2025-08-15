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

// --- Serve static files from "public" folder ---
app.use(express.static(path.join(__dirname, 'public')));

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

// --- 404 fallback ---
app.use((req, res) => {
  res.status(404).send('Seite nicht gefunden');
});

// --- start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
