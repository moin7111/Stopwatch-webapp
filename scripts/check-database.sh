#!/bin/bash

# Script to check and backup database persistence
# This script ensures that the database persists across server restarts

echo "=== Database Persistence Check Script ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# Define database paths (unify on persistent path)
DB_PATH="/workspace/data/imperia_magic.db"
BACKUP_DIR="/workspace/data/backups"
PERSISTENT_DB="/workspace/data/imperia_magic.db"
LOG_FILE="/workspace/data/database-check.log"
LEGACY_DB="/workspace/database/imperia_magic.db"

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$PERSISTENT_DB")"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting database persistence check..."

# Migrate from legacy location if needed
if [ -f "$LEGACY_DB" ] && [ ! -f "$PERSISTENT_DB" ]; then
    log "🔄 Migrating legacy database from $LEGACY_DB to $PERSISTENT_DB"
    mkdir -p "$(dirname "$PERSISTENT_DB")"
    cp "$LEGACY_DB" "$PERSISTENT_DB"
fi

# Ensure database presence at persistent path
if [ -f "$PERSISTENT_DB" ]; then
    log "✅ Persistent database found at $PERSISTENT_DB"
else
    log "⚠️  No persistent database found"
    if [ -f "$LEGACY_DB" ]; then
        log "📋 Found legacy database at $LEGACY_DB, copying to persistent location"
        cp "$LEGACY_DB" "$PERSISTENT_DB"
        log "✅ Database backed up to persistent storage"
    else
        log "❌ No database found at all - will be created on first run"
    fi
fi

# If both exist and differ in size, prefer the larger one for persistence
if [ -f "$LEGACY_DB" ] && [ -f "$PERSISTENT_DB" ]; then
    PERSISTENT_SIZE=$(stat -c%s "$PERSISTENT_DB" 2>/dev/null || stat -f%z "$PERSISTENT_DB" 2>/dev/null)
    LEGACY_SIZE=$(stat -c%s "$LEGACY_DB" 2>/dev/null || stat -f%z "$LEGACY_DB" 2>/dev/null)
    log "Persistent DB size: $PERSISTENT_SIZE bytes"
    log "Legacy DB size: $LEGACY_SIZE bytes"
    if [ "$LEGACY_SIZE" -gt "$PERSISTENT_SIZE" ]; then
        log "📋 Legacy database is larger, copying to persistent location"
        cp "$LEGACY_DB" "$PERSISTENT_DB"
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