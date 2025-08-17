// server.js - Updated for SQL Database
require('dotenv').config(); // Load environment variables

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const Database = require('./database/db');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Initialize database
const db = new Database();
let dbInitialized = false;

// Initialize database on startup
async function initializeDatabase() {
    try {
        await db.init();
        dbInitialized = true;
        console.log('🗄️ Database initialized successfully');
        
        // Restore active sessions from database
        await restoreSessionsFromDatabase();
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
}

// Middleware to ensure database is initialized
function requireDB(req, res, next) {
    if (!dbInitialized) {
        return res.status(503).json({ error: 'Database not initialized' });
    }
    next();
}

// Helper function to get client info
function getClientInfo(req) {
    return {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    };
}

// Helper function to verify password
function verifyPassword(password, salt, hash) {
    const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

// Helper function to generate UUID
function generateUUID() {
    return crypto.randomUUID();
}

// In-memory sessions (enhanced)
const sessions = new Map();

// Restore sessions from database on startup
async function restoreSessionsFromDatabase() {
    try {
        const activeSessions = await db.getActiveSessions();
        let restoredCount = 0;
        
        for (const session of activeSessions) {
            sessions.set(session.session_id, {
                userId: session.user_id,
                createdAt: new Date(session.created_at),
                expiresAt: new Date(session.expires_at),
                lastActivity: new Date(session.last_activity || session.created_at),
                ip: session.ip_address,
                userAgent: session.user_agent
            });
            restoredCount++;
        }
        
        console.log(`✅ Restored ${restoredCount} active sessions from database`);
    } catch (error) {
        console.error('Failed to restore sessions:', error);
    }
}

function createSession(userId, clientInfo) {
    const sessionId = generateUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    sessions.set(sessionId, {
        userId,
        createdAt: new Date(),
        expiresAt,
        lastActivity: new Date(),
        ...clientInfo
    });
    
    // Store in database for persistence
    db.createSession(userId, sessionId, expiresAt.toISOString(), clientInfo.ip, clientInfo.userAgent)
        .catch(err => console.error('Failed to store session in DB:', err));
    
    return sessionId;
}

function getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    
    if (session.expiresAt < new Date()) {
        sessions.delete(sessionId);
        return null;
    }
    
    // Update last activity
    session.lastActivity = new Date();
    db.updateSessionActivity(sessionId).catch(err => console.error('Failed to update session activity:', err));
    
    return session;
}

function deleteSession(sessionId) {
    sessions.delete(sessionId);
    db.invalidateSession(sessionId).catch(err => console.error('Failed to invalidate session in DB:', err));
}

// Enhanced admin key check
function requireAdminKey(req, res, next) {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
        console.warn('⚠️ No ADMIN_KEY set - admin endpoints are unprotected!');
        return next();
    }
    
    const providedKey = req.headers['x-admin-key'];
    if (providedKey !== adminKey) {
        return res.status(401).json({ error: 'Invalid admin key' });
    }
    next();
}

// CORS and basic middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use(express.static('public'));

// 🔥 FIX: Hauptroute für PWA  
app.get('/', (req, res) => {
    res.redirect(301, '/maintick/login.html');
});

// Alternative route for PWA
app.get('/app', (req, res) => {
    res.redirect(301, '/maintick/login.html');
});

// === ENHANCED AUTHENTICATION ROUTES ===

app.post('/auth/register', requireDB, async (req, res) => {
    try {
        const { code, username, password, displayName } = req.body;
        const clientInfo = getClientInfo(req);

        // Validate input
        if (!code || !username || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user already exists
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Validate license code
        const license = await db.getLicenseByCode(code);
        if (!license) {
            return res.status(400).json({ error: 'Invalid license code' });
        }
        if (license.is_used) {
            return res.status(400).json({ error: 'License code already used' });
        }

        // Create user
        const userId = await db.createUser({
            username,
            displayName: displayName || username,
            email: null, // for future use
            password
        });

        // Mark license as used
        await db.useLicense(code, userId);

        // Create token for user
        const token = await db.createToken(userId);

        // Create session
        const sessionId = createSession(userId, clientInfo);
        res.cookie('MAGIC_SESSION', sessionId, { 
            httpOnly: true, 
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });

        // Log registration
        await db.logAction(userId, 'user_registered', {
            username,
            license_code: code,
            token
        }, clientInfo.ip, clientInfo.userAgent);

        res.json({ ok: true, username });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/auth/login', requireDB, async (req, res) => {
    try {
        const { username, password } = req.body;
        const clientInfo = getClientInfo(req);

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Get user
        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        if (!verifyPassword(password, user.salt, user.password_hash)) {
            await db.logAction(user.id, 'login_failed', { reason: 'invalid_password' }, clientInfo.ip, clientInfo.userAgent);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await db.updateUserLastLogin(user.id);

        // Ensure user has a token
        let tokens = await db.getTokensByUserId(user.id);
        if (tokens.length === 0) {
            await db.createToken(user.id);
        }

        // Create session
        const sessionId = createSession(user.id, clientInfo);
        res.cookie('MAGIC_SESSION', sessionId, { 
            httpOnly: true, 
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });

        // Log login
        await db.logAction(user.id, 'login_success', null, clientInfo.ip, clientInfo.userAgent);

        res.json({ ok: true, username: user.username });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/auth/status', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        if (!sessionId) {
            return res.json({ loggedIn: false });
        }

        const session = getSession(sessionId);
        if (!session) {
            res.clearCookie('MAGIC_SESSION');
            return res.json({ loggedIn: false });
        }

        const user = await db.getUserById(session.userId);
        if (!user) {
            deleteSession(sessionId);
            res.clearCookie('MAGIC_SESSION');
            return res.json({ loggedIn: false });
        }

        res.json({ 
            loggedIn: true, 
            username: user.username,
            displayName: user.display_name,
            isAdmin: !!user.is_admin
        });

    } catch (error) {
        console.error('Auth status error:', error);
        res.json({ loggedIn: false });
    }
});

app.post('/auth/logout', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        if (sessionId) {
            const session = getSession(sessionId);
            if (session) {
                await db.logAction(session.userId, 'logout', null, getClientInfo(req).ip);
            }
            deleteSession(sessionId);
        }
        res.clearCookie('MAGIC_SESSION');
        res.json({ ok: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// === LICENSE VERIFICATION ===

app.post('/auth/verify-license', requireDB, async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Lizenz-Code erforderlich' });
        }
        
        // Check if license exists and is not used
        const license = await db.getLicenseByCode(code);
        
        if (!license) {
            return res.status(404).json({ error: 'Ungültiger Lizenz-Code' });
        }
        
        if (license.is_used) {
            return res.status(400).json({ error: 'Lizenz-Code wurde bereits verwendet' });
        }
        
        // License is valid
        res.json({ 
            ok: true, 
            message: 'Lizenz-Code ist gültig' 
        });
        
    } catch (error) {
        console.error('License verification error:', error);
        res.status(500).json({ error: 'Fehler bei der Lizenz-Verifizierung' });
    }
});

// === LICENSE MANAGEMENT (ADMIN) ===

app.post('/api/license', requireDB, requireAdminKey, async (req, res) => {
    try {
        const { count = 1 } = req.body;
        
        if (count < 1 || count > 100) {
            return res.status(400).json({ error: 'Count must be between 1 and 100' });
        }

        const licenses = await db.createLicenses(count);
        
        // Log admin action
        const clientInfo = getClientInfo(req);
        await db.logAction(null, 'licenses_created', { count, licenses }, clientInfo.ip, clientInfo.userAgent);

        res.json({ ok: true, created: licenses });

    } catch (error) {
        console.error('License creation error:', error);
        res.status(500).json({ error: 'Failed to create licenses' });
    }
});

app.get('/api/licenses', requireDB, requireAdminKey, async (req, res) => {
    try {
        const licenses = await db.getAllLicenses();
        res.json({ licenses });
    } catch (error) {
        console.error('Get licenses error:', error);
        res.status(500).json({ error: 'Failed to get licenses' });
    }
});

app.get('/api/users', requireDB, requireAdminKey, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// === TOKEN MANAGEMENT ===

app.get('/api/user/tokens', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await db.getUserById(session.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Get user's tokens
        const tokens = await db.getTokensByUserId(user.id);
        
        if (tokens.length === 0) {
            // Create token if none exists
            const newToken = await db.createToken(user.id);
            tokens.push({ token: newToken, created_at: new Date().toISOString() });
        }

        const token = tokens[0]; // Use first token
        
        // Get queue count
        const queue = await db.getForceQueue(token.token);
        
        // Generate API examples
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.secure ? 'https' : 'http';
        const baseUrl = `${protocol}://${host}`;

        const apiExamples = {
            spectatorUrl: `${baseUrl}/imperia-modul/tempral.html?token=${token.token}`,
            pushForce: {
                url: `${baseUrl}/api/data/${token.token}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    force: {
                        mode: 'ms',
                        target: 15,
                        trigger: 'stop',
                        minDurationMs: 3000,
                        app: 'stopwatch'
                    }
                })
            },
            pollQueue: {
                url: `${baseUrl}/api/data/${token.token}`,
                method: 'GET'
            },
            ackForce: {
                url: `${baseUrl}/api/ack/${token.token}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{"forceId":"FORCE_ID_FROM_QUEUE"}'
            }
        };

        res.json({
            token: token.token,
            createdAt: new Date(token.created_at).getTime(),
            queued: queue.length,
            apiExamples
        });

    } catch (error) {
        console.error('Get user tokens error:', error);
        res.status(500).json({ error: 'Failed to get tokens' });
    }
});

// === FORCE QUEUE MANAGEMENT ===

app.post('/api/data/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        const forceData = req.body.force || req.body; // Support both formats
        
        if (!forceData.mode) {
            return res.status(400).json({ error: 'Invalid force data - mode required' });
        }

        const forceId = generateUUID();
        const queueCount = await db.addForceToQueue(token, forceId, forceData);

        // Log force creation
        const tokenData = await db.getTokenByValue(token);
        if (tokenData) {
            await db.logAction(tokenData.user_id, 'force_created', {
                token,
                forceId,
                forceData
            }, getClientInfo(req).ip);
        }

        res.json({ ok: true, id: forceId, queued: queueCount });

    } catch (error) {
        console.error('Add force error:', error);
        if (error.message === 'Invalid token') {
            return res.status(404).json({ error: 'Token not found' });
        }
        res.status(500).json({ error: 'Failed to add force' });
    }
});

app.get('/api/data/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        const queue = await db.getForceQueue(token);
        res.json({ queue });
    } catch (error) {
        console.error('Get queue error:', error);
        res.status(500).json({ error: 'Failed to get queue' });
    }
});

app.post('/api/ack/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        const { forceId } = req.body;
        
        if (!forceId) {
            return res.status(400).json({ error: 'Force ID required' });
        }

        const acknowledged = await db.acknowledgeForce(token, forceId);
        
        if (acknowledged) {
            // Log acknowledgment
            const tokenData = await db.getTokenByValue(token);
            if (tokenData) {
                await db.logAction(tokenData.user_id, 'force_acknowledged', {
                    token,
                    forceId
                }, getClientInfo(req).ip);
            }
            res.json({ ok: true });
        } else {
            res.status(404).json({ error: 'Force not found' });
        }

    } catch (error) {
        console.error('Acknowledge force error:', error);
        res.status(500).json({ error: 'Failed to acknowledge force' });
    }
});

// === ADMIN ENDPOINTS ===

app.get('/api/tokens', requireDB, requireAdminKey, async (req, res) => {
    try {
        const tokens = await db.getAllTokens();
        res.json({ tokens });
    } catch (error) {
        console.error('Get all tokens error:', error);
        res.status(500).json({ error: 'Failed to get tokens' });
    }
});

// === USER SETTINGS API ===

app.get('/api/user/settings', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const settings = await db.getUserSettings(session.userId);
        res.json({ settings });

    } catch (error) {
        console.error('Get user settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

app.post('/api/user/settings', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { key, value } = req.body;
        if (!key) {
            return res.status(400).json({ error: 'Setting key required' });
        }

        await db.setUserSetting(session.userId, key, typeof value === 'object' ? JSON.stringify(value) : value);
        
        // Log setting change
        await db.logAction(session.userId, 'setting_changed', { key, value }, getClientInfo(req).ip);
        
        res.json({ ok: true });

    } catch (error) {
        console.error('Set user setting error:', error);
        res.status(500).json({ error: 'Failed to set setting' });
    }
});

// === WEBAPP SETTINGS API ===

app.get('/api/webapp/:appType/settings', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { appType } = req.params;
        const settings = await db.getWebappSettings(session.userId, appType);
        res.json({ settings });

    } catch (error) {
        console.error('Get webapp settings error:', error);
        res.status(500).json({ error: 'Failed to get webapp settings' });
    }
});

app.post('/api/webapp/:appType/settings', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { appType } = req.params;
        const { key, value } = req.body;
        
        if (!key) {
            return res.status(400).json({ error: 'Setting key required' });
        }

        await db.setWebappSetting(session.userId, appType, key, typeof value === 'object' ? JSON.stringify(value) : value);
        
        // Log setting change
        await db.logAction(session.userId, 'webapp_setting_changed', { appType, key, value }, getClientInfo(req).ip);
        
        res.json({ ok: true });

    } catch (error) {
        console.error('Set webapp setting error:', error);
        res.status(500).json({ error: 'Failed to set webapp setting' });
    }
});

// === PRESETS API ===

// Get user's presets (authenticated)
app.get('/api/presets', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const presets = await db.getPresets(session.userId);
        res.json(presets);

    } catch (error) {
        console.error('Get presets error:', error);
        res.status(500).json({ error: 'Failed to get presets' });
    }
});

// Get presets by token (for ModulTick)
app.get('/api/presets/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        
        // Get user ID from token
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }

        const user = await db.getUserByUsername(tokenData.owner_username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const presets = await db.getPresets(user.id);
        res.json(presets);

    } catch (error) {
        console.error('Get presets by token error:', error);
        res.status(500).json({ error: 'Failed to get presets' });
    }
});

// Create preset
app.post('/api/presets', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { name, description, forceType, forceSequence, conditions, trigger } = req.body;
        
        if (!name || !forceType || !forceSequence || forceSequence.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Add trigger to conditions if provided
        const fullConditions = conditions ? { ...conditions, trigger } : { trigger };

        const presetId = await db.createPreset(
            session.userId,
            name,
            description || '',
            forceType,
            forceSequence,
            fullConditions
        );

        // Log action
        await db.logAction(session.userId, 'preset_created', { presetId, name }, getClientInfo(req).ip);

        res.json({ ok: true, presetId });

    } catch (error) {
        console.error('Create preset error:', error);
        res.status(500).json({ error: 'Failed to create preset' });
    }
});

// Update preset
app.put('/api/presets/:id', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;
        const updates = req.body;

        await db.updatePreset(id, updates);

        // Log action
        await db.logAction(session.userId, 'preset_updated', { presetId: id, updates }, getClientInfo(req).ip);

        res.json({ ok: true });

    } catch (error) {
        console.error('Update preset error:', error);
        res.status(500).json({ error: 'Failed to update preset' });
    }
});

// Delete preset
app.delete('/api/presets/:id', requireDB, async (req, res) => {
    try {
        const sessionId = req.cookies.MAGIC_SESSION;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;

        await db.deletePreset(id);

        // Log action
        await db.logAction(session.userId, 'preset_deleted', { presetId: id }, getClientInfo(req).ip);

        res.json({ ok: true });

    } catch (error) {
        console.error('Delete preset error:', error);
        res.status(500).json({ error: 'Failed to delete preset' });
    }
});

// === ENHANCED FORCE API ===

// Create force with new types and conditions
app.post('/api/data/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        const { mode, target, app, trigger, minDurationMs, conditions, force_type, value, preset_name } = req.body;
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }

        // Determine force type and value
        const finalForceType = force_type || mode || 'ms';
        const finalValue = value || target;
        
        if (!finalValue && finalValue !== 0) {
            return res.status(400).json({ error: 'Force value required' });
        }

        // If preset name provided, load preset
        let presetId = null;
        if (preset_name) {
            const user = await db.getUserByUsername(tokenData.owner_username);
            const preset = await db.getPresetByName(user.id, preset_name);
            if (preset) {
                presetId = preset.id;
                // Use preset values if not overridden
                if (!force_type && !mode) {
                    finalForceType = preset.force_type;
                }
                if (!conditions) {
                    conditions = preset.conditions;
                }
            }
        }

        // Create force with enhanced data
        const forceId = generateUUID();
        const forceData = {
            forceId,
            mode: finalForceType,
            force_type: finalForceType,
            target: finalValue,
            value: finalValue,
            app: app || 'stopwatch',
            trigger: trigger || conditions?.trigger || 'both',
            minDurationMs: minDurationMs || 0,
            conditions,
            timestamp: Date.now()
        };

        await db.createEnhancedForce(
            tokenData.id,
            forceId,
            forceData,
            finalForceType,
            conditions,
            presetId
        );

        // Log action
        await db.logAction(null, 'force_created', { token, forceId, forceType: finalForceType }, getClientInfo(req).ip);

        res.json({ ok: true, forceId });

    } catch (error) {
        console.error('Create force error:', error);
        res.status(500).json({ error: 'Failed to create force' });
    }
});

// === MANUAL INPUT HISTORY API ===

app.post('/api/manual-input/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        const { forceType, forceValues } = req.body;
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }

        const user = await db.getUserByUsername(tokenData.owner_username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const historyId = await db.createManualInputHistory(
            user.id,
            tokenData.id,
            forceType,
            forceValues
        );

        res.json({ ok: true, historyId });

    } catch (error) {
        console.error('Create manual input history error:', error);
        res.status(500).json({ error: 'Failed to save manual input' });
    }
});

// === TICK CONNECTIONS API ===

app.post('/api/tick-connection', requireDB, async (req, res) => {
    try {
        const { mainTickToken, modulTickToken } = req.body;
        
        if (!mainTickToken || !modulTickToken) {
            return res.status(400).json({ error: 'Both tokens required' });
        }

        // Get token data
        const mainToken = await db.getTokenByValue(mainTickToken);
        const modulToken = await db.getTokenByValue(modulTickToken);
        
        if (!mainToken || !modulToken) {
            return res.status(404).json({ error: 'Invalid token(s)' });
        }

        const connectionId = await db.createTickConnection(mainToken.id, modulToken.id);

        res.json({ ok: true, connectionId });

    } catch (error) {
        console.error('Create tick connection error:', error);
        res.status(500).json({ error: 'Failed to create connection' });
    }
});

// === STOPWATCH API ENDPOINTS ===

// Get forces for MainTick/ModulTick
app.get('/api/stopwatch/:type/data/:token', requireDB, async (req, res) => {
    try {
        const { type, token } = req.params;
        
        if (type !== 'maintick' && type !== 'modultick') {
            return res.status(400).json({ error: 'Invalid type' });
        }
        
        // Get active forces for token
        const forces = await db.getActiveForces(token);
        
        // Filter forces based on app type
        const filteredForces = forces.filter(f => {
            const forceApp = f.data.app || 'stopwatch';
            return forceApp === 'stopwatch' || forceApp === type;
        });
        
        res.json({ 
            forces: filteredForces,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Get stopwatch data error:', error);
        res.status(500).json({ error: 'Failed to get data' });
    }
});

// Create force from MainTick
app.post('/api/stopwatch/maintick/force/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        const { force } = req.body;
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }
        
        // Create force
        const forceId = generateUUID();
        const forceData = {
            forceId,
            ...force,
            app: 'stopwatch',
            timestamp: Date.now()
        };
        
        await db.createEnhancedForce(
            tokenData.id,
            forceId,
            forceData,
            force.mode,
            force.conditions || null,
            null
        );
        
        res.json({ ok: true, forceId });
        
    } catch (error) {
        console.error('Create force from MainTick error:', error);
        res.status(500).json({ error: 'Failed to create force' });
    }
});

// Acknowledge force
app.post('/api/stopwatch/:type/ack/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        const { forceId } = req.body;
        
        await db.acknowledgeForce(forceId);
        
        res.json({ ok: true });
        
    } catch (error) {
        console.error('Acknowledge force error:', error);
        res.status(500).json({ error: 'Failed to acknowledge force' });
    }
});

// Get presets for token
app.get('/api/stopwatch/presets/:token', requireDB, async (req, res) => {
    try {
        const { token } = req.params;
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }
        
        // Get user
        const user = await db.getUserByUsername(tokenData.owner_username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get presets
        const presets = await db.getUserPresets(user.id);
        
        res.json(presets);
        
    } catch (error) {
        console.error('Get presets error:', error);
        res.status(500).json({ error: 'Failed to get presets' });
    }
});

// Get specific preset
app.get('/api/stopwatch/preset/:name', requireDB, async (req, res) => {
    try {
        const { name } = req.params;
        const token = req.query.token;
        
        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }
        
        // Get user
        const user = await db.getUserByUsername(tokenData.owner_username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get preset
        const preset = await db.getPresetByName(user.id, name);
        if (!preset) {
            return res.status(404).json({ error: 'Preset not found' });
        }
        
        res.json(preset);
        
    } catch (error) {
        console.error('Get preset error:', error);
        res.status(500).json({ error: 'Failed to get preset' });
    }
});

// Save preset from MainTick
app.post('/api/stopwatch/preset', requireDB, async (req, res) => {
    try {
        const preset = req.body;
        const { token, name, forces, condition } = preset;
        
        if (!token || !name || !forces || !Array.isArray(forces)) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }
        
        // Get user
        const user = await db.getUserByUsername(tokenData.owner_username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Extract force type from first force
        const forceType = forces[0]?.mode || 'ms';
        
        // Create preset
        const presetId = await db.createPreset(
            user.id,
            name,
            `Preset erstellt von MainTick`,
            forceType,
            forces.map(f => f.target),
            condition,
            forces[0]?.trigger || 'egal'
        );
        
        res.json({ ok: true, presetId });
        
    } catch (error) {
        console.error('Save preset error:', error);
        res.status(500).json({ error: 'Failed to save preset' });
    }
});

// Connect MainTick to ModulTick
app.post('/api/stopwatch/connect', requireDB, async (req, res) => {
    try {
        const { mainTickToken, modulTickToken } = req.body;
        
        if (!mainTickToken || !modulTickToken) {
            return res.status(400).json({ error: 'Both tokens required' });
        }
        
        // Verify both tokens
        const mainToken = await db.getTokenByValue(mainTickToken);
        const modulToken = await db.getTokenByValue(modulTickToken);
        
        if (!mainToken || !modulToken) {
            return res.status(404).json({ error: 'Invalid token(s)' });
        }
        
        // Create connection
        const connectionId = await db.createTickConnection(mainToken.id, modulToken.id);
        
        res.json({ ok: true, connectionId });
        
    } catch (error) {
        console.error('Connect ticks error:', error);
        res.status(500).json({ error: 'Failed to connect' });
    }
});

// Update stopwatch status
app.post('/api/stopwatch/:type/status/:token', requireDB, async (req, res) => {
    try {
        const { type, token } = req.params;
        const { status } = req.body;
        
        // Update status in database or cache
        // For now, just acknowledge
        res.json({ ok: true });
        
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Activate preset
app.post('/api/stopwatch/:type/activate-preset/:token', requireDB, async (req, res) => {
    try {
        const { type, token } = req.params;
        const { presetName } = req.body;
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }
        
        // Get user
        const user = await db.getUserByUsername(tokenData.owner_username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get preset
        const preset = await db.getPresetByName(user.id, presetName);
        if (!preset) {
            return res.status(404).json({ error: 'Preset not found' });
        }
        
        // Create forces from preset
        if (preset.forces && Array.isArray(preset.forces)) {
            for (const force of preset.forces) {
                const forceId = generateUUID();
                const forceData = {
                    forceId,
                    ...force,
                    app: 'stopwatch',
                    timestamp: Date.now()
                };
                
                await db.createEnhancedForce(
                    tokenData.id,
                    forceId,
                    forceData,
                    force.mode,
                    force.condition || null,
                    null
                );
            }
        }
        
        res.json({ ok: true });
        
    } catch (error) {
        console.error('Activate preset error:', error);
        res.status(500).json({ error: 'Failed to activate preset' });
    }
});

// Manual force
app.post('/api/stopwatch/:type/manual-force/:token', requireDB, async (req, res) => {
    try {
        const { type, token } = req.params;
        const { force } = req.body;
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }
        
        // Create force
        const forceId = force.id || generateUUID();
        const forceData = {
            forceId,
            ...force,
            app: 'stopwatch',
            timestamp: Date.now()
        };
        
        await db.createEnhancedForce(
            tokenData.id,
            forceId,
            forceData,
            force.mode,
            force.condition || null,
            null
        );
        
        res.json({ ok: true, forceId });
        
    } catch (error) {
        console.error('Manual force error:', error);
        res.status(500).json({ error: 'Failed to create manual force' });
    }
});

// Delete preset
app.delete('/api/stopwatch/preset/:name', requireDB, async (req, res) => {
    try {
        const { name } = req.params;
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }
        
        // Get token data
        const tokenData = await db.getTokenByValue(token);
        if (!tokenData || !tokenData.is_active) {
            return res.status(404).json({ error: 'Invalid token' });
        }
        
        // Get user
        const user = await db.getUserByUsername(tokenData.owner_username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Delete preset
        const deleted = await db.deletePreset(user.id, name);
        
        if (deleted) {
            res.json({ ok: true });
        } else {
            res.status(404).json({ error: 'Preset not found' });
        }
        
    } catch (error) {
        console.error('Delete preset error:', error);
        res.status(500).json({ error: 'Failed to delete preset' });
    }
});

// === HEALTH & STATUS ===

app.get('/health', (req, res) => {
    res.send('ok');
});

app.get('/api/status', requireDB, (req, res) => {
    const sessionId = req.cookies.MAGIC_SESSION;
    const session = sessionId ? getSession(sessionId) : null;
    
    res.json({ 
        ok: true, 
        uptime: process.uptime(),
        database: dbInitialized ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        authenticated: !!session
    });
});

// === GRACEFUL SHUTDOWN ===

process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down gracefully...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔄 Shutting down gracefully...');
    db.close();
    process.exit(0);
});

// === START SERVER ===

const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`🌐 Production URL: https://stopwatch-webapp-1.onrender.com`);
        } else {
            console.log(`🌐 Local URL: http://localhost:${PORT}`);
        }
        console.log(`🗄️ Database: SQLite (${db.dbPath})`);
        console.log(`🔐 Admin protection: ${process.env.ADMIN_KEY ? 'ENABLED' : 'DISABLED (dev mode)'}`);
        console.log(`📱 PWA Login: ${process.env.NODE_ENV === 'production' ? 'https://stopwatch-webapp-1.onrender.com/maintick/login.html' : `http://localhost:${PORT}/maintick/login.html`}`);
    });
}).catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
