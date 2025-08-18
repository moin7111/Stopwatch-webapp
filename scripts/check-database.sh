#!/bin/bash

# Script to check and backup database persistence
# This script ensures that the database persists across server restarts

echo "=== Database Persistence Check Script ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# Define database paths
DB_PATH="/workspace/database/imperia_magic.db"
BACKUP_DIR="/workspace/data/backups"
PERSISTENT_DB="/workspace/data/imperia_magic.db"
LOG_FILE="/workspace/data/database-check.log"

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$PERSISTENT_DB")"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting database persistence check..."

# Check if persistent database exists
if [ -f "$PERSISTENT_DB" ]; then
    log "✅ Persistent database found at $PERSISTENT_DB"
    
    # Check if working database exists
    if [ -f "$DB_PATH" ]; then
        log "⚠️  Working database also exists at $DB_PATH"
        
        # Compare sizes to determine which is newer/larger
        PERSISTENT_SIZE=$(stat -c%s "$PERSISTENT_DB" 2>/dev/null || stat -f%z "$PERSISTENT_DB" 2>/dev/null)
        WORKING_SIZE=$(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH" 2>/dev/null)
        
        log "Persistent DB size: $PERSISTENT_SIZE bytes"
        log "Working DB size: $WORKING_SIZE bytes"
        
        # Backup both databases
        TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
        cp "$PERSISTENT_DB" "$BACKUP_DIR/persistent_backup_$TIMESTAMP.db"
        cp "$DB_PATH" "$BACKUP_DIR/working_backup_$TIMESTAMP.db"
        log "✅ Created backups in $BACKUP_DIR"
        
        # Use the larger database (likely has more data)
        if [ "$WORKING_SIZE" -gt "$PERSISTENT_SIZE" ]; then
            log "📋 Working database is larger, copying to persistent location"
            cp "$DB_PATH" "$PERSISTENT_DB"
        else
            log "📋 Persistent database is larger, copying to working location"
            mkdir -p "$(dirname "$DB_PATH")"
            cp "$PERSISTENT_DB" "$DB_PATH"
        fi
    else
        log "📋 No working database found, copying persistent to working location"
        mkdir -p "$(dirname "$DB_PATH")"
        cp "$PERSISTENT_DB" "$DB_PATH"
    fi
else
    log "⚠️  No persistent database found"
    
    if [ -f "$DB_PATH" ]; then
        log "✅ Working database exists, copying to persistent location"
        cp "$DB_PATH" "$PERSISTENT_DB"
        log "✅ Database backed up to persistent storage"
    else
        log "❌ No database found at all - will be created on first run"
    fi
fi

# Create symlink for database directory if not exists
if [ ! -L "/workspace/database" ] && [ -d "/workspace/database" ]; then
    log "🔗 Setting up database directory link..."
    # Move existing database directory contents
    if [ -d "/workspace/database" ]; then
        cp -r /workspace/database/* /workspace/data/ 2>/dev/null || true
    fi
fi

# Display current status
echo ""
echo "Current Database Status:"
echo "========================"
if [ -f "$DB_PATH" ]; then
    echo "✅ Working database: $DB_PATH ($(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH" 2>/dev/null) bytes)"
else
    echo "❌ Working database: Not found"
fi

if [ -f "$PERSISTENT_DB" ]; then
    echo "✅ Persistent database: $PERSISTENT_DB ($(stat -c%s "$PERSISTENT_DB" 2>/dev/null || stat -f%z "$PERSISTENT_DB" 2>/dev/null) bytes)"
else
    echo "❌ Persistent database: Not found"
fi

echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR" 2>/dev/null | tail -5 || echo "No backups found"

log "Database persistence check completed"