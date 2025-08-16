#!/usr/bin/env node

const Database = require('./db');
const fs = require('fs');
const path = require('path');

class UpdateV2Migration {
    constructor() {
        this.db = new Database();
    }

    async run() {
        console.log('🚀 Starting MainTick/ModulTick Update (v2) Migration...\n');

        try {
            // Initialize database
            await this.db.init();
            console.log('✅ Database connection established\n');

            // Run schema updates
            await this.runSchemaUpdates();
            console.log('✅ Schema updates completed\n');

            // Update existing forces with new structure
            await this.updateExistingForces();
            console.log('✅ Force queue updated\n');

            console.log('🎉 Migration completed successfully!');
            console.log('📝 Next steps:');
            console.log('   1. Restart the server');
            console.log('   2. Test MainTick and ModulTick functionality');
            console.log('   3. Create some presets in MainTick');

        } catch (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        } finally {
            this.db.close();
        }
    }

    async runSchemaUpdates() {
        console.log('📊 Running schema updates...');

        // Read and execute the update SQL
        const updateSqlPath = path.join(__dirname, 'schema_update_v2.sql');
        const updateSql = fs.readFileSync(updateSqlPath, 'utf8');
        
        // Split SQL statements and execute them
        const statements = updateSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                await this.db.run(statement + ';');
                console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
            } catch (error) {
                // Some statements might fail if columns already exist
                if (error.message.includes('duplicate column name') || 
                    error.message.includes('already exists')) {
                    console.log(`⚠️  Skipping (already exists): ${statement.substring(0, 50)}...`);
                } else {
                    throw error;
                }
            }
        }
    }

    async updateExistingForces() {
        console.log('🔄 Updating existing force queue entries...');

        try {
            // Get all existing forces
            const forces = await this.db.query(`
                SELECT id, force_data 
                FROM force_queue 
                WHERE force_type IS NULL
            `);

            console.log(`Found ${forces.length} forces to update`);

            for (const force of forces) {
                try {
                    const forceData = JSON.parse(force.force_data);
                    
                    // Determine force type from existing data
                    const forceType = forceData.mode || 'ms';
                    
                    // Update the force with new fields
                    await this.db.run(`
                        UPDATE force_queue 
                        SET force_type = ?,
                            conditions = ?
                        WHERE id = ?
                    `, [
                        forceType,
                        forceData.conditions ? JSON.stringify(forceData.conditions) : null,
                        force.id
                    ]);

                } catch (error) {
                    console.error(`Failed to update force ${force.id}:`, error);
                }
            }

            console.log(`✅ Updated ${forces.length} force entries`);

        } catch (error) {
            console.error('Error updating forces:', error);
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migration = new UpdateV2Migration();
    migration.run();
}

module.exports = UpdateV2Migration;