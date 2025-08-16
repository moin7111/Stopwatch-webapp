const fs = require('fs');
const path = require('path');
const Database = require('./db');

class Migration {
    constructor() {
        this.db = new Database();
        this.dataDir = path.join(__dirname, '..', 'data');
    }

    async run() {
        console.log('🚀 Starting database migration...');
        
        try {
            // Initialize database
            await this.db.init();
            
            // Migrate existing data
            await this.migrateUsers();
            await this.migrateLicenses();
            await this.migrateTokens();
            
            // Create backup of old files
            await this.backupOldFiles();
            
            console.log('✅ Migration completed successfully!');
            console.log('📁 Old JSON files backed up to data/backup/');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        } finally {
            this.db.close();
        }
    }

    async migrateUsers() {
        const usersFile = path.join(this.dataDir, 'users.json');
        
        if (!fs.existsSync(usersFile)) {
            console.log('📝 No existing users file found');
            return;
        }

        try {
            const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
            let migratedCount = 0;

            for (const [username, userData] of Object.entries(usersData)) {
                try {
                    // Check if user already exists
                    const existingUser = await this.db.getUserByUsername(username);
                    if (existingUser) {
                        console.log(`👤 User ${username} already exists, skipping`);
                        continue;
                    }

                    // Create user in database
                    const userId = await this.db.run(`
                        INSERT INTO users (username, display_name, password_hash, salt, created_at) 
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        username,
                        userData.displayName || username,
                        userData.passwordHash,
                        userData.salt,
                        new Date(userData.createdAt).toISOString()
                    ]);

                    migratedCount++;
                    console.log(`✅ Migrated user: ${username} (ID: ${userId.lastID})`);
                    
                    // Log migration
                    await this.db.logAction(userId.lastID, 'user_migrated', {
                        from: 'json_file',
                        username: username
                    });

                } catch (error) {
                    console.error(`❌ Failed to migrate user ${username}:`, error);
                }
            }

            console.log(`📊 Users migration: ${migratedCount} users migrated`);
            
        } catch (error) {
            console.error('❌ Error reading users file:', error);
        }
    }

    async migrateLicenses() {
        const licensesFile = path.join(this.dataDir, 'licenses.json');
        
        if (!fs.existsSync(licensesFile)) {
            console.log('📝 No existing licenses file found');
            return;
        }

        try {
            const licensesData = JSON.parse(fs.readFileSync(licensesFile, 'utf8'));
            let migratedCount = 0;

            for (const [code, licenseData] of Object.entries(licensesData)) {
                try {
                    // Check if license already exists
                    const existingLicense = await this.db.getLicenseByCode(code);
                    if (existingLicense) {
                        console.log(`🎫 License ${code} already exists, skipping`);
                        continue;
                    }

                    // Get user ID if license was used
                    let usedByUserId = null;
                    if (licenseData.usedBy) {
                        const user = await this.db.getUserByUsername(licenseData.usedBy);
                        if (user) {
                            usedByUserId = user.id;
                        }
                    }

                    // Create license in database
                    await this.db.run(`
                        INSERT INTO licenses (code, created_at, used_at, used_by_user_id, is_used) 
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        code,
                        new Date(licenseData.createdAt).toISOString(),
                        licenseData.usedAt ? new Date(licenseData.usedAt).toISOString() : null,
                        usedByUserId,
                        licenseData.usedBy ? 1 : 0
                    ]);

                    migratedCount++;
                    console.log(`✅ Migrated license: ${code} ${licenseData.usedBy ? `(used by ${licenseData.usedBy})` : '(unused)'}`);

                } catch (error) {
                    console.error(`❌ Failed to migrate license ${code}:`, error);
                }
            }

            console.log(`📊 Licenses migration: ${migratedCount} licenses migrated`);
            
        } catch (error) {
            console.error('❌ Error reading licenses file:', error);
        }
    }

    async migrateTokens() {
        const tokensFile = path.join(this.dataDir, 'tokens.json');
        
        if (!fs.existsSync(tokensFile)) {
            console.log('📝 No existing tokens file found');
            return;
        }

        try {
            const tokensData = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
            let migratedTokens = 0;
            let migratedForces = 0;

            for (const [token, tokenData] of Object.entries(tokensData)) {
                try {
                    // Check if token already exists
                    const existingToken = await this.db.getTokenByValue(token);
                    if (existingToken) {
                        console.log(`🎯 Token ${token} already exists, skipping`);
                        continue;
                    }

                    // Get user ID
                    const user = await this.db.getUserByUsername(tokenData.owner);
                    if (!user) {
                        console.log(`❌ User ${tokenData.owner} not found for token ${token}, skipping`);
                        continue;
                    }

                    // Create token in database
                    const tokenResult = await this.db.run(`
                        INSERT INTO tokens (token, user_id, created_at) 
                        VALUES (?, ?, ?)
                    `, [
                        token,
                        user.id,
                        new Date(tokenData.createdAt).toISOString()
                    ]);

                    migratedTokens++;

                    // Migrate force queue
                    if (tokenData.queue && Array.isArray(tokenData.queue)) {
                        for (const force of tokenData.queue) {
                            try {
                                await this.db.run(`
                                    INSERT INTO force_queue (token_id, force_id, force_data, created_at) 
                                    VALUES (?, ?, ?, ?)
                                `, [
                                    tokenResult.lastID,
                                    force.id,
                                    JSON.stringify(force.force),
                                    new Date(force.createdAt).toISOString()
                                ]);

                                migratedForces++;
                            } catch (error) {
                                console.error(`❌ Failed to migrate force ${force.id}:`, error);
                            }
                        }
                    }

                    console.log(`✅ Migrated token: ${token} (owner: ${tokenData.owner}, forces: ${tokenData.queue?.length || 0})`);
                    
                    // Log migration
                    await this.db.logAction(user.id, 'token_migrated', {
                        from: 'json_file',
                        token: token,
                        forces_count: tokenData.queue?.length || 0
                    });

                } catch (error) {
                    console.error(`❌ Failed to migrate token ${token}:`, error);
                }
            }

            console.log(`📊 Tokens migration: ${migratedTokens} tokens, ${migratedForces} forces migrated`);
            
        } catch (error) {
            console.error('❌ Error reading tokens file:', error);
        }
    }

    async backupOldFiles() {
        const backupDir = path.join(this.dataDir, 'backup');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const files = ['users.json', 'licenses.json', 'tokens.json'];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        for (const file of files) {
            const sourcePath = path.join(this.dataDir, file);
            if (fs.existsSync(sourcePath)) {
                const backupPath = path.join(backupDir, `${timestamp}_${file}`);
                fs.copyFileSync(sourcePath, backupPath);
                console.log(`📁 Backed up ${file} to ${backupPath}`);
            }
        }
    }

    // Test database connection and setup
    async test() {
        console.log('🧪 Testing database connection...');
        
        try {
            await this.db.init();
            
            // Test creating a user
            const testUserId = await this.db.createUser({
                username: 'test_user_' + Date.now(),
                displayName: 'Test User',
                email: 'test@example.com',
                password: 'test123'
            });
            
            console.log(`✅ Test user created with ID: ${testUserId}`);
            
            // Test creating a license
            const licenses = await this.db.createLicenses(1);
            console.log(`✅ Test license created: ${licenses[0]}`);
            
            // Test creating a token
            const token = await this.db.createToken(testUserId);
            console.log(`✅ Test token created: ${token}`);
            
            // Test settings
            await this.db.setUserSetting(testUserId, 'test_setting', 'test_value');
            const setting = await this.db.getUserSetting(testUserId, 'test_setting');
            console.log(`✅ Test setting: ${setting}`);
            
            console.log('✅ All database tests passed!');
            
        } catch (error) {
            console.error('❌ Database test failed:', error);
            throw error;
        } finally {
            this.db.close();
        }
    }
}

// CLI usage
if (require.main === module) {
    const command = process.argv[2];
    const migration = new Migration();
    
    switch (command) {
        case 'test':
            migration.test();
            break;
        case 'migrate':
        default:
            migration.run();
            break;
    }
}

module.exports = Migration;