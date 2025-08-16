const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Database {
    constructor(dbPath = 'database/stopwatch_magic.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.isConnected = false;
    }

    // Initialize database connection and run schema
    async init() {
        try {
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Connect to database
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    throw err;
                }
                console.log('✅ Connected to SQLite database');
            });

            // Run schema
            await this.runSchema();
            this.isConnected = true;
            console.log('✅ Database schema initialized');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    // Run SQL schema from file
    async runSchema() {
        return new Promise((resolve, reject) => {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            this.db.exec(schema, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Generic query method
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Generic run method for INSERT/UPDATE/DELETE
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    // Get single row
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // === USER METHODS ===

    async createUser(userData) {
        const { username, displayName, email, password } = userData;
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');

        const sql = `
            INSERT INTO users (username, display_name, email, password_hash, salt)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await this.run(sql, [username, displayName, email, passwordHash, salt]);
        return result.lastID;
    }

    async getUserByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ? AND is_active = 1';
        return await this.get(sql, [username]);
    }

    async getUserById(id) {
        const sql = 'SELECT * FROM users WHERE id = ? AND is_active = 1';
        return await this.get(sql, [id]);
    }

    async updateUserLastLogin(userId) {
        const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
        return await this.run(sql, [userId]);
    }

    async getAllUsers() {
        const sql = 'SELECT id, username, display_name, email, created_at, last_login, is_admin FROM users WHERE is_active = 1';
        return await this.query(sql);
    }

    // === LICENSE METHODS ===

    async createLicenses(count) {
        const licenses = [];
        const sql = 'INSERT INTO licenses (code) VALUES (?)';
        
        for (let i = 0; i < count; i++) {
            const code = this.generateLicenseCode();
            await this.run(sql, [code]);
            licenses.push(code);
        }
        
        return licenses;
    }

    async getLicenseByCode(code) {
        const sql = 'SELECT * FROM licenses WHERE code = ?';
        return await this.get(sql, [code]);
    }

    async useLicense(code, userId) {
        const sql = `
            UPDATE licenses 
            SET used_by_user_id = ?, used_at = CURRENT_TIMESTAMP, is_used = 1 
            WHERE code = ? AND is_used = 0
        `;
        return await this.run(sql, [userId, code]);
    }

    async getAllLicenses() {
        const sql = `
            SELECT l.*, u.username as used_by_username 
            FROM licenses l 
            LEFT JOIN users u ON l.used_by_user_id = u.id 
            ORDER BY l.created_at DESC
        `;
        return await this.query(sql);
    }

    generateLicenseCode() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return code;
    }

    // === TOKEN METHODS ===

    async createToken(userId) {
        const token = this.generateToken();
        const sql = 'INSERT INTO tokens (token, user_id) VALUES (?, ?)';
        await this.run(sql, [token, userId]);
        return token;
    }

    async getTokenByValue(token) {
        const sql = `
            SELECT t.*, u.username, u.display_name 
            FROM tokens t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.token = ? AND t.is_active = 1 AND u.is_active = 1
        `;
        return await this.get(sql, [token]);
    }

    async getTokensByUserId(userId) {
        const sql = 'SELECT * FROM tokens WHERE user_id = ? AND is_active = 1';
        return await this.query(sql, [userId]);
    }

    async updateTokenLastUsed(token) {
        const sql = 'UPDATE tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?';
        return await this.run(sql, [token]);
    }

    async getAllTokens() {
        const sql = `
            SELECT t.token, u.username as owner, 
                   (SELECT COUNT(*) FROM force_queue fq WHERE fq.token_id = t.id AND fq.is_processed = 0) as queued
            FROM tokens t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.is_active = 1 AND u.is_active = 1
        `;
        return await this.query(sql);
    }

    generateToken() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let token = "";
        for (let i = 0; i < 6; i++) {
            token += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return token;
    }

    // === FORCE QUEUE METHODS ===

    async addForceToQueue(token, forceId, forceData) {
        const tokenData = await this.getTokenByValue(token);
        if (!tokenData) {
            throw new Error('Invalid token');
        }

        const sql = 'INSERT INTO force_queue (token_id, force_id, force_data) VALUES (?, ?, ?)';
        await this.run(sql, [tokenData.id, forceId, JSON.stringify(forceData)]);
        
        // Update token last used
        await this.updateTokenLastUsed(token);
        
        // Get queue count
        const countSql = 'SELECT COUNT(*) as count FROM force_queue WHERE token_id = ? AND is_processed = 0';
        const countResult = await this.get(countSql, [tokenData.id]);
        
        return countResult.count;
    }

    async getForceQueue(token) {
        const tokenData = await this.getTokenByValue(token);
        if (!tokenData) {
            return [];
        }

        const sql = `
            SELECT force_id as id, force_data as force, created_at as createdAt 
            FROM force_queue 
            WHERE token_id = ? AND is_processed = 0 
            ORDER BY created_at ASC
        `;
        
        const queue = await this.query(sql, [tokenData.id]);
        return queue.map(item => ({
            id: item.id,
            force: JSON.parse(item.force),
            createdAt: new Date(item.createdAt).getTime()
        }));
    }

    async acknowledgeForce(token, forceId) {
        const tokenData = await this.getTokenByValue(token);
        if (!tokenData) {
            throw new Error('Invalid token');
        }

        const sql = `
            UPDATE force_queue 
            SET is_processed = 1, processed_at = CURRENT_TIMESTAMP 
            WHERE token_id = ? AND force_id = ? AND is_processed = 0
        `;
        
        const result = await this.run(sql, [tokenData.id, forceId]);
        return result.changes > 0;
    }

    // === SETTINGS METHODS ===

    async getUserSetting(userId, key) {
        const sql = 'SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?';
        const result = await this.get(sql, [userId, key]);
        return result ? result.setting_value : null;
    }

    async setUserSetting(userId, key, value) {
        const sql = `
            INSERT INTO user_settings (user_id, setting_key, setting_value) 
            VALUES (?, ?, ?) 
            ON CONFLICT(user_id, setting_key) 
            DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
        `;
        return await this.run(sql, [userId, key, value, value]);
    }

    async getUserSettings(userId) {
        const sql = 'SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?';
        const settings = await this.query(sql, [userId]);
        
        const result = {};
        settings.forEach(setting => {
            try {
                result[setting.setting_key] = JSON.parse(setting.setting_value);
            } catch {
                result[setting.setting_key] = setting.setting_value;
            }
        });
        
        return result;
    }

    async getWebappSetting(userId, appType, key) {
        const sql = 'SELECT setting_value FROM webapp_settings WHERE user_id = ? AND app_type = ? AND setting_key = ?';
        const result = await this.get(sql, [userId, appType, key]);
        return result ? result.setting_value : null;
    }

    async setWebappSetting(userId, appType, key, value) {
        const sql = `
            INSERT INTO webapp_settings (user_id, app_type, setting_key, setting_value) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT(user_id, app_type, setting_key) 
            DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
        `;
        return await this.run(sql, [userId, appType, key, value, value]);
    }

    async getWebappSettings(userId, appType) {
        const sql = 'SELECT setting_key, setting_value FROM webapp_settings WHERE user_id = ? AND app_type = ?';
        const settings = await this.query(sql, [userId, appType]);
        
        const result = {};
        settings.forEach(setting => {
            try {
                result[setting.setting_key] = JSON.parse(setting.setting_value);
            } catch {
                result[setting.setting_key] = setting.setting_value;
            }
        });
        
        return result;
    }

    // === SESSION METHODS ===

    async createSession(userId, sessionId, expiresAt, ipAddress = null, userAgent = null) {
        const sql = `
            INSERT INTO sessions (session_id, user_id, expires_at, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)
        `;
        return await this.run(sql, [sessionId, userId, expiresAt, ipAddress, userAgent]);
    }

    async getSession(sessionId) {
        const sql = `
            SELECT s.*, u.username, u.display_name 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.session_id = ? AND s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP
        `;
        return await this.get(sql, [sessionId]);
    }

    async updateSessionActivity(sessionId) {
        const sql = 'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?';
        return await this.run(sql, [sessionId]);
    }

    async invalidateSession(sessionId) {
        const sql = 'UPDATE sessions SET is_active = 0 WHERE session_id = ?';
        return await this.run(sql, [sessionId]);
    }

    async invalidateUserSessions(userId) {
        const sql = 'UPDATE sessions SET is_active = 0 WHERE user_id = ?';
        return await this.run(sql, [userId]);
    }

    // === AUDIT LOG METHODS ===

    async logAction(userId, action, details = null, ipAddress = null, userAgent = null) {
        const sql = `
            INSERT INTO audit_log (user_id, action, details, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)
        `;
        return await this.run(sql, [userId, action, JSON.stringify(details), ipAddress, userAgent]);
    }

    async getAuditLog(userId = null, limit = 100) {
        let sql = `
            SELECT al.*, u.username 
            FROM audit_log al 
            LEFT JOIN users u ON al.user_id = u.id 
        `;
        let params = [];
        
        if (userId) {
            sql += ' WHERE al.user_id = ?';
            params.push(userId);
        }
        
        sql += ' ORDER BY al.created_at DESC LIMIT ?';
        params.push(limit);
        
        return await this.query(sql, params);
    }

    // ============= PRESETS MANAGEMENT =============
    
    async createPreset(userId, name, description, forceType, forceSequence, conditions) {
        const sql = `
            INSERT INTO presets (user_id, name, description, force_type, force_sequence, conditions)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [
            userId, 
            name, 
            description, 
            forceType, 
            JSON.stringify(forceSequence), 
            JSON.stringify(conditions)
        ]);
        return result.lastID;
    }

    async getPresets(userId, isActive = true) {
        const sql = `
            SELECT * FROM presets 
            WHERE user_id = ? AND is_active = ?
            ORDER BY name ASC
        `;
        const presets = await this.query(sql, [userId, isActive ? 1 : 0]);
        
        // Parse JSON fields
        return presets.map(preset => ({
            ...preset,
            force_sequence: JSON.parse(preset.force_sequence || '[]'),
            conditions: JSON.parse(preset.conditions || '{}')
        }));
    }

    async getPresetByName(userId, name) {
        const sql = `SELECT * FROM presets WHERE user_id = ? AND name = ? AND is_active = 1`;
        const preset = await this.queryOne(sql, [userId, name]);
        
        if (preset) {
            preset.force_sequence = JSON.parse(preset.force_sequence || '[]');
            preset.conditions = JSON.parse(preset.conditions || '{}');
        }
        
        return preset;
    }

    async updatePreset(presetId, updates) {
        const fields = [];
        const values = [];
        
        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.description !== undefined) {
            fields.push('description = ?');
            values.push(updates.description);
        }
        if (updates.force_type !== undefined) {
            fields.push('force_type = ?');
            values.push(updates.force_type);
        }
        if (updates.force_sequence !== undefined) {
            fields.push('force_sequence = ?');
            values.push(JSON.stringify(updates.force_sequence));
        }
        if (updates.conditions !== undefined) {
            fields.push('conditions = ?');
            values.push(JSON.stringify(updates.conditions));
        }
        if (updates.is_active !== undefined) {
            fields.push('is_active = ?');
            values.push(updates.is_active ? 1 : 0);
        }
        
        if (fields.length === 0) return;
        
        values.push(presetId);
        const sql = `UPDATE presets SET ${fields.join(', ')} WHERE id = ?`;
        await this.run(sql, values);
    }

    async deletePreset(presetId) {
        const sql = `UPDATE presets SET is_active = 0 WHERE id = ?`;
        await this.run(sql, [presetId]);
    }

    // ============= MANUAL INPUT HISTORY =============
    
    async createManualInputHistory(userId, tokenId, forceType, forceValues) {
        const sql = `
            INSERT INTO manual_input_history (user_id, token_id, force_type, force_values)
            VALUES (?, ?, ?, ?)
        `;
        const result = await this.run(sql, [
            userId,
            tokenId,
            forceType,
            JSON.stringify(forceValues)
        ]);
        return result.lastID;
    }

    async getManualInputHistory(userId, tokenId, limit = 10) {
        const sql = `
            SELECT * FROM manual_input_history 
            WHERE user_id = ? AND token_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `;
        const history = await this.query(sql, [userId, tokenId, limit]);
        
        return history.map(item => ({
            ...item,
            force_values: JSON.parse(item.force_values || '[]')
        }));
    }

    async incrementManualInputAppliedCount(historyId) {
        const sql = `UPDATE manual_input_history SET applied_count = applied_count + 1 WHERE id = ?`;
        await this.run(sql, [historyId]);
    }

    // ============= TICK CONNECTIONS =============
    
    async createTickConnection(mainTickTokenId, modulTickTokenId) {
        const sql = `
            INSERT INTO tick_connections (maintick_token_id, modultick_token_id)
            VALUES (?, ?)
            ON CONFLICT(maintick_token_id, modultick_token_id) DO UPDATE
            SET connection_status = 'active', last_sync = CURRENT_TIMESTAMP
        `;
        const result = await this.run(sql, [mainTickTokenId, modulTickTokenId]);
        return result.lastID;
    }

    async getTickConnections(tokenId, role = 'maintick') {
        const column = role === 'maintick' ? 'maintick_token_id' : 'modultick_token_id';
        const sql = `
            SELECT tc.*, 
                   mt.token as maintick_token, 
                   modt.token as modultick_token
            FROM tick_connections tc
            JOIN tokens mt ON tc.maintick_token_id = mt.id
            JOIN tokens modt ON tc.modultick_token_id = modt.id
            WHERE ${column} = ? AND tc.connection_status = 'active'
        `;
        return await this.query(sql, [tokenId]);
    }

    async updateTickConnectionSync(connectionId) {
        const sql = `UPDATE tick_connections SET last_sync = CURRENT_TIMESTAMP WHERE id = ?`;
        await this.run(sql, [connectionId]);
    }

    async disconnectTickConnection(connectionId) {
        const sql = `UPDATE tick_connections SET connection_status = 'inactive' WHERE id = ?`;
        await this.run(sql, [connectionId]);
    }

    // ============= ENHANCED FORCE QUEUE =============
    
    async createEnhancedForce(tokenId, forceId, forceData, forceType, conditions = null, presetId = null) {
        const sql = `
            INSERT INTO force_queue (token_id, force_id, force_data, force_type, conditions, preset_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [
            tokenId,
            forceId,
            JSON.stringify(forceData),
            forceType,
            conditions ? JSON.stringify(conditions) : null,
            presetId
        ]);
        return result.lastID;
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;