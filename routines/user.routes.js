const express = require('express');
const logger = require('../utils/logger');

function createUserRoutes(db, requireDB, getSession) {
    const router = express.Router();

    // Get user tokens
    router.get('/tokens', requireDB, async (req, res) => {
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

            const token = tokens[0];
            
            // Get queue count
            const queue = await db.getForceQueue(token.token);
            
            // Generate API examples
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const examples = {
                sendForce: {
                    method: 'POST',
                    url: `${baseUrl}/api/data/${token.token}`,
                    body: {
                        force: {
                            card: "Ace of Spades",
                            position: 1,
                            deck: "red"
                        }
                    }
                },
                getQueue: {
                    method: 'GET',
                    url: `${baseUrl}/api/data/${token.token}`
                },
                acknowledge: {
                    method: 'POST',
                    url: `${baseUrl}/api/ack/${token.token}`,
                    body: {
                        forceId: "force-uuid-here"
                    }
                }
            };

            res.json({ 
                token: token.token,
                queueCount: queue.length,
                apiExamples: examples,
                spectatorUrl: `${baseUrl}/spectator.html?token=${token.token}`
            });

        } catch (error) {
            logger.error('Get user tokens error:', error);
            res.status(500).json({ error: 'Failed to get tokens' });
        }
    });

    // Get user settings
    router.get('/settings', requireDB, async (req, res) => {
        try {
            const sessionId = req.cookies.MAGIC_SESSION;
            const session = getSession(sessionId);
            
            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const settings = await db.getUserSettings(session.userId);
            res.json({ settings });

        } catch (error) {
            logger.error('Get user settings error:', error);
            res.status(500).json({ error: 'Failed to get settings' });
        }
    });

    // Update user settings
    router.post('/settings', requireDB, async (req, res) => {
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
            await db.logAction(session.userId, 'setting_changed', { key, value }, req.ip);
            
            res.json({ ok: true });

        } catch (error) {
            logger.error('Update user settings error:', error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    });

    return router;
}

module.exports = createUserRoutes;