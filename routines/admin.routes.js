const express = require('express');
const logger = require('../utils/logger');

function createAdminRoutes(db, requireDB, requireAdminKey) {
    const router = express.Router();

    // Get client info helper
    function getClientInfo(req) {
        return {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        };
    }

    // Create licenses
    router.post('/license', requireDB, requireAdminKey, async (req, res) => {
        try {
            const { count = 1 } = req.body;
            
            if (count < 1 || count > 100) {
                return res.status(400).json({ error: 'Count must be between 1 and 100' });
            }

            const licenses = await db.createLicenses(count);
            
            // Log admin action
            const clientInfo = getClientInfo(req);
            await db.logAction(null, 'licenses_created', { count, licenses }, clientInfo.ip, clientInfo.userAgent);

            logger.info(`Admin created ${count} licenses`);
            res.json({ ok: true, created: licenses });

        } catch (error) {
            logger.error('Create licenses error:', error);
            res.status(500).json({ error: 'Failed to create licenses' });
        }
    });

    // Get all licenses
    router.get('/licenses', requireDB, requireAdminKey, async (req, res) => {
        try {
            const licenses = await db.getAllLicenses();
            res.json({ licenses });
        } catch (error) {
            logger.error('Get licenses error:', error);
            res.status(500).json({ error: 'Failed to get licenses' });
        }
    });

    // Get all users
    router.get('/users', requireDB, requireAdminKey, async (req, res) => {
        try {
            const users = await db.getAllUsers();
            res.json({ users });
        } catch (error) {
            logger.error('Get users error:', error);
            res.status(500).json({ error: 'Failed to get users' });
        }
    });

    // Get all tokens
    router.get('/tokens', requireDB, requireAdminKey, async (req, res) => {
        try {
            const tokens = await db.getAllTokens();
            res.json({ tokens });
        } catch (error) {
            logger.error('Get tokens error:', error);
            res.status(500).json({ error: 'Failed to get tokens' });
        }
    });

    // Get audit log
    router.get('/audit-log', requireDB, requireAdminKey, async (req, res) => {
        try {
            const { limit = 100, userId } = req.query;
            const logs = await db.getAuditLog(userId, parseInt(limit));
            res.json({ logs });
        } catch (error) {
            logger.error('Get audit log error:', error);
            res.status(500).json({ error: 'Failed to get audit log' });
        }
    });

    // Delete user (soft delete)
    router.delete('/users/:userId', requireDB, requireAdminKey, async (req, res) => {
        try {
            const { userId } = req.params;
            
            // Soft delete by setting is_active to false
            await db.run('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
            
            // Log admin action
            const clientInfo = getClientInfo(req);
            await db.logAction(null, 'user_deactivated', { userId }, clientInfo.ip, clientInfo.userAgent);
            
            logger.info(`Admin deactivated user ${userId}`);
            res.json({ ok: true, message: 'User deactivated' });
            
        } catch (error) {
            logger.error('Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    });

    // Revoke license
    router.delete('/licenses/:code', requireDB, requireAdminKey, async (req, res) => {
        try {
            const { code } = req.params;
            
            // Delete license
            await db.run('DELETE FROM licenses WHERE code = ?', [code]);
            
            // Log admin action
            const clientInfo = getClientInfo(req);
            await db.logAction(null, 'license_revoked', { code }, clientInfo.ip, clientInfo.userAgent);
            
            logger.info(`Admin revoked license ${code}`);
            res.json({ ok: true, message: 'License revoked' });
            
        } catch (error) {
            logger.error('Revoke license error:', error);
            res.status(500).json({ error: 'Failed to revoke license' });
        }
    });

    // Get database statistics
    router.get('/stats', requireDB, requireAdminKey, async (req, res) => {
        try {
            const stats = {};
            
            // User statistics
            const userCount = await db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
            const adminCount = await db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND is_admin = 1');
            
            // License statistics
            const totalLicenses = await db.get('SELECT COUNT(*) as count FROM licenses');
            const usedLicenses = await db.get('SELECT COUNT(*) as count FROM licenses WHERE is_used = 1');
            
            // Token statistics
            const activeTokens = await db.get('SELECT COUNT(*) as count FROM tokens WHERE is_active = 1');
            
            // Session statistics
            const activeSessions = await db.get('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1 AND expires_at > datetime("now")');
            
            // Force queue statistics
            const queuedForces = await db.get('SELECT COUNT(*) as count FROM force_queue WHERE is_processed = 0');
            const processedForces = await db.get('SELECT COUNT(*) as count FROM force_queue WHERE is_processed = 1');
            
            stats.users = {
                total: userCount.count,
                admins: adminCount.count,
                regular: userCount.count - adminCount.count
            };
            
            stats.licenses = {
                total: totalLicenses.count,
                used: usedLicenses.count,
                available: totalLicenses.count - usedLicenses.count
            };
            
            stats.tokens = {
                active: activeTokens.count
            };
            
            stats.sessions = {
                active: activeSessions.count
            };
            
            stats.forces = {
                queued: queuedForces.count,
                processed: processedForces.count,
                total: queuedForces.count + processedForces.count
            };
            
            res.json({ stats });
            
        } catch (error) {
            logger.error('Get statistics error:', error);
            res.status(500).json({ error: 'Failed to get statistics' });
        }
    });

    return router;
}

module.exports = createAdminRoutes;