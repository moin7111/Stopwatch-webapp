const fs = require('fs');
const path = require('path');
const util = require('util');

class Logger {
    constructor() {
        this.logsDir = path.join(process.cwd(), 'logs');
        this.ensureLogsDirectory();
        
        // Create different log files for different purposes
        const timestamp = new Date().toISOString().split('T')[0];
        this.mainLogFile = path.join(this.logsDir, `server-${timestamp}.log`);
        this.errorLogFile = path.join(this.logsDir, `error-${timestamp}.log`);
        this.authLogFile = path.join(this.logsDir, `auth-${timestamp}.log`);
        
        // Create write streams
        this.mainStream = fs.createWriteStream(this.mainLogFile, { flags: 'a' });
        this.errorStream = fs.createWriteStream(this.errorLogFile, { flags: 'a' });
        this.authStream = fs.createWriteStream(this.authLogFile, { flags: 'a' });
        
        // Write startup message
        this.info('='.repeat(80));
        this.info(`Server started at ${new Date().toISOString()}`);
        this.info('='.repeat(80));
    }
    
    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }
    
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? util.format(...args) : '';
        return `[${timestamp}] [${level}] ${message} ${formattedArgs}\n`;
    }
    
    writeToFile(stream, level, message, ...args) {
        const formattedMessage = this.formatMessage(level, message, ...args);
        stream.write(formattedMessage);
        
        // Also write to console
        const consoleMethod = level === 'ERROR' ? console.error : console.log;
        consoleMethod(`[${level}] ${message}`, ...args);
    }
    
    info(message, ...args) {
        this.writeToFile(this.mainStream, 'INFO', message, ...args);
    }
    
    warn(message, ...args) {
        this.writeToFile(this.mainStream, 'WARN', message, ...args);
    }
    
    error(message, ...args) {
        this.writeToFile(this.mainStream, 'ERROR', message, ...args);
        this.writeToFile(this.errorStream, 'ERROR', message, ...args);
    }
    
    debug(message, ...args) {
        if (process.env.NODE_ENV !== 'production') {
            this.writeToFile(this.mainStream, 'DEBUG', message, ...args);
        }
    }
    
    auth(action, userId, details = {}) {
        const message = `User: ${userId || 'anonymous'}, Action: ${action}, Details: ${JSON.stringify(details)}`;
        this.writeToFile(this.authStream, 'AUTH', message);
        this.writeToFile(this.mainStream, 'AUTH', message);
    }
    
    // Special method for request logging
    request(req, res, responseTime) {
        const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms - IP: ${req.ip}`;
        this.writeToFile(this.mainStream, 'REQUEST', message);
    }
    
    // Clean up old log files (older than 30 days)
    cleanOldLogs() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        fs.readdir(this.logsDir, (err, files) => {
            if (err) {
                this.error('Failed to read logs directory:', err);
                return;
            }
            
            files.forEach(file => {
                const filePath = path.join(this.logsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    
                    if (stats.mtime.getTime() < thirtyDaysAgo) {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                this.error('Failed to delete old log file:', filePath, err);
                            } else {
                                this.info('Deleted old log file:', filePath);
                            }
                        });
                    }
                });
            });
        });
    }
    
    // Close all streams
    close() {
        this.info('Logger shutting down...');
        this.mainStream.end();
        this.errorStream.end();
        this.authStream.end();
    }
}

// Create singleton instance
const logger = new Logger();

// Clean old logs once a day
setInterval(() => {
    logger.cleanOldLogs();
}, 24 * 60 * 60 * 1000);

// Handle process termination
process.on('SIGINT', () => {
    logger.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.close();
    process.exit(0);
});

module.exports = logger;