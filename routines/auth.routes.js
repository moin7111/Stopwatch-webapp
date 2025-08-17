const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Helper function to verify password
function verifyPassword(password, salt, hash) {
    const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

// Helper function to get client info
function getClientInfo(req) {
    return {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    };
}

function createAuthRoutes(db, requireDB, createSession, getSession, deleteSession) {
    const router = express.Router();

    // Register new user
    router.post('/register', requireDB, async (req, res) => {
        try {
            const { code, username, password, displayName, email } = req.body;
            const clientInfo = getClientInfo(req);

            // Validate input
            if (!code || !username || !password) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Validate email format if provided
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ error: 'Invalid email format' });
                }
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
                email: email || null,
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
                email: email || 'not provided',
                license_code: code,
                token
            }, clientInfo.ip, clientInfo.userAgent);

            res.json({ ok: true, username });

        } catch (error) {
            logger.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    });

    // Login
    router.post('/login', requireDB, async (req, res) => {
        try {
            const { username, password } = req.body;
            const clientInfo = getClientInfo(req);

            logger.auth('login_attempt', username, { ip: clientInfo.ip });

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }

            // Get user
            const user = await db.getUserByUsername(username);
            if (!user) {
                logger.auth('login_failed', username, { reason: 'user_not_found', ip: clientInfo.ip });
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            logger.debug(`User found: ${username}, verifying password...`);

            // Verify password
            if (!verifyPassword(password, user.salt, user.password_hash)) {
                logger.auth('login_failed', username, { reason: 'invalid_password', ip: clientInfo.ip });
                await db.logAction(user.id, 'login_failed', { reason: 'invalid_password' }, clientInfo.ip, clientInfo.userAgent);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            logger.debug(`Password verified for user: ${username}`);

            // Update last login
            await db.updateUserLastLogin(user.id);

            // Ensure user has a token
            let tokens = await db.getTokensByUserId(user.id);
            if (tokens.length === 0) {
                await db.createToken(user.id);
            }

            // Create session
            const sessionId = createSession(user.id, clientInfo);
            logger.debug(`Session created: ${sessionId} for user: ${username}`);
            
            res.cookie('MAGIC_SESSION', sessionId, { 
                httpOnly: true, 
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production'
            });

            // Log login
            await db.logAction(user.id, 'login_success', null, clientInfo.ip, clientInfo.userAgent);

            logger.auth('login_success', username, { userId: user.id, ip: clientInfo.ip });
            res.json({ ok: true, username: user.username });

        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    // Check auth status
    router.get('/status', requireDB, async (req, res) => {
        try {
            const sessionId = req.cookies.MAGIC_SESSION;
            
            logger.debug(`Auth status check - Session ID: ${sessionId ? sessionId.substring(0, 8) + '...' : 'none'}`);
            
            if (!sessionId) {
                logger.debug('No session cookie found');
                return res.json({ loggedIn: false });
            }

            const session = getSession(sessionId);
            if (!session) {
                logger.debug(`Session not found in memory: ${sessionId.substring(0, 8)}...`);
                res.clearCookie('MAGIC_SESSION');
                return res.json({ loggedIn: false });
            }

            logger.debug(`Session found for user ID: ${session.userId}`);
            
            const user = await db.getUserById(session.userId);
            if (!user) {
                logger.warn(`User not found for ID: ${session.userId}`);
                deleteSession(sessionId);
                res.clearCookie('MAGIC_SESSION');
                return res.json({ loggedIn: false });
            }

            logger.debug(`Auth status: User ${user.username} is logged in`);
            
            res.json({ 
                loggedIn: true, 
                username: user.username,
                displayName: user.display_name,
                isAdmin: user.is_admin
            });

        } catch (error) {
            logger.error('Auth status error:', error);
            res.status(500).json({ error: 'Failed to check auth status' });
        }
    });

    // Logout
    router.post('/logout', requireDB, async (req, res) => {
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
            logger.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    });

    // Verify license code
    router.post('/verify-license', requireDB, async (req, res) => {
        try {
            const { code } = req.body;
            
            if (!code) {
                return res.status(400).json({ error: 'License code required' });
            }
            
            // Check if license exists and is not used
            const license = await db.getLicenseByCode(code);
            
            if (!license) {
                return res.status(404).json({ error: 'Invalid license code' });
            }
            
            if (license.is_used) {
                return res.status(400).json({ error: 'License code already used' });
            }
            
            res.json({ 
                valid: true,
                code: license.code,
                type: license.license_type || 'standard'
            });
            
        } catch (error) {
            logger.error('License verification error:', error);
            res.status(500).json({ error: 'Verification failed' });
        }
    });

    return router;
}

module.exports = createAuthRoutes;