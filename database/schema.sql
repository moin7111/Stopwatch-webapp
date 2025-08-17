-- Stopwatch Magic Webapp Database Schema
-- SQLite compatible schema that can be easily ported to PostgreSQL

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table - core user authentication data
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255), -- for future use
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1,
    is_admin BOOLEAN DEFAULT 0
);

-- License codes table
CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    used_by_user_id INTEGER,
    is_used BOOLEAN DEFAULT 0,
    expires_at DATETIME, -- for future premium features
    license_type VARCHAR(20) DEFAULT 'standard', -- standard, premium, etc.
    FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- User tokens for API access
CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(10) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Force queue for token-based control
CREATE TABLE IF NOT EXISTS force_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    force_id VARCHAR(36) UNIQUE NOT NULL, -- UUID
    force_data JSON NOT NULL, -- stores the complete force object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT 0,
    processed_at DATETIME,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE
);

-- User settings - personal preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT, -- JSON or simple values
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Webapp settings - app-specific configurations per user
CREATE TABLE IF NOT EXISTS webapp_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    app_type VARCHAR(50) NOT NULL, -- 'stopwatch', 'fakebrowser', etc.
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT, -- JSON for complex settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, app_type, setting_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table for better session management
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(36) UNIQUE NOT NULL, -- UUID
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    ip_address VARCHAR(45), -- IPv4/IPv6
    user_agent TEXT,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit log for security and debugging
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'force_applied', etc.
    details JSON, -- additional context data
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_licenses_code ON licenses(code);
CREATE INDEX IF NOT EXISTS idx_licenses_used ON licenses(is_used, used_at);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_force_queue_token ON force_queue(token_id, is_processed);
CREATE INDEX IF NOT EXISTS idx_force_queue_processed ON force_queue(is_processed, created_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_lookup ON user_settings(user_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_webapp_settings_lookup ON webapp_settings(user_id, app_type, setting_key);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at);

-- Triggers to automatically update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_user_settings_timestamp 
    AFTER UPDATE ON user_settings
    BEGIN
        UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_webapp_settings_timestamp 
    AFTER UPDATE ON webapp_settings
    BEGIN
        UPDATE webapp_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Insert default admin user settings categories
INSERT OR IGNORE INTO user_settings (user_id, setting_key, setting_value) 
SELECT 1, 'theme', 'dark' WHERE EXISTS (SELECT 1 FROM users WHERE id = 1);

INSERT OR IGNORE INTO user_settings (user_id, setting_key, setting_value) 
SELECT 1, 'notifications', '{"email": true, "push": false}' WHERE EXISTS (SELECT 1 FROM users WHERE id = 1);

-- Insert default webapp settings for stopwatch
INSERT OR IGNORE INTO webapp_settings (user_id, app_type, setting_key, setting_value) 
SELECT 1, 'stopwatch', 'default_precision', '10' WHERE EXISTS (SELECT 1 FROM users WHERE id = 1);

INSERT OR IGNORE INTO webapp_settings (user_id, app_type, setting_key, setting_value) 
SELECT 1, 'stopwatch', 'auto_lap_count', '0' WHERE EXISTS (SELECT 1 FROM users WHERE id = 1);

-- Remote functionality tables for Imperia Magic System

-- Remote sessions for tracking connected remote devices
CREATE TABLE IF NOT EXISTS remote_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token VARCHAR(10) NOT NULL,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    UNIQUE(user_id, token),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (token) REFERENCES tokens(token) ON DELETE CASCADE
);

-- Active modules table for remote control
CREATE TABLE IF NOT EXISTS active_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    module_id VARCHAR(50) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    module_type VARCHAR(50) NOT NULL,
    module_icon VARCHAR(10),
    module_description TEXT,
    module_data JSON,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for remote functionality
CREATE INDEX IF NOT EXISTS idx_remote_sessions_user ON remote_sessions(user_id, last_active);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_token ON remote_sessions(token);
CREATE INDEX IF NOT EXISTS idx_active_modules_user ON active_modules(user_id, activated_at);