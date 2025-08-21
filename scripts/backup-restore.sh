#!/bin/bash

# Backup and Restore Script for Imperia Magic Database
# Usage: ./backup-restore.sh [backup|restore|list]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="/workspace/data"
BACKUP_DIR="$DATA_DIR/backups"
DB_PATH="/workspace/data/imperia_magic.db"
PERSISTENT_DB="$DATA_DIR/imperia_magic.db"
LEGACY_DB="/workspace/database/imperia_magic.db"

# Create necessary directories
mkdir -p "$BACKUP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [backup|restore|list|auto-backup]"
    echo ""
    echo "Commands:"
    echo "  backup       - Create a new backup of the current database"
    echo "  restore      - Restore database from a backup"
    echo "  list         - List all available backups"
    echo "  auto-backup  - Create an automatic backup (used by cron)"
    echo ""
    exit 1
}

# Function to create backup
backup() {
    echo -e "${GREEN}Creating database backup...${NC}"
    
    # Determine which database to backup (prefer unified persistent path)
    if [ -f "$DB_PATH" ]; then
        SOURCE_DB="$DB_PATH"
        echo "Backing up database at $DB_PATH..."
    elif [ -f "$LEGACY_DB" ]; then
        SOURCE_DB="$LEGACY_DB"
        echo "Backing up legacy database at $LEGACY_DB..."
    else
        echo -e "${RED}Error: No database found to backup!${NC}"
        exit 1
    fi
    
    # Create backup filename with timestamp
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.db"
    
    # Copy database
    cp "$SOURCE_DB" "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✅ Backup created successfully!${NC}"
        echo "Location: $BACKUP_FILE"
        echo "Size: $SIZE"
        
        # Also create a latest backup link
        ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.db"
        
        # Keep only last 10 backups
        ls -t "$BACKUP_DIR"/backup_*.db | tail -n +11 | xargs -r rm
        echo "Old backups cleaned up (keeping last 10)"
    else
        echo -e "${RED}❌ Backup failed!${NC}"
        exit 1
    fi
}

# Function to list backups
list_backups() {
    echo -e "${GREEN}Available backups:${NC}"
    echo "=================="
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR/backup_*.db 2>/dev/null)" ]; then
        ls -lht "$BACKUP_DIR"/backup_*.db | awk '{print NR".", $9, "-", $5, "-", $6, $7, $8}'
        
        if [ -L "$BACKUP_DIR/latest.db" ]; then
            echo ""
            echo -e "${YELLOW}Latest backup:${NC}"
            ls -lh "$BACKUP_DIR/latest.db" | awk '{print $9, "->", $11}'
        fi
    else
        echo -e "${YELLOW}No backups found${NC}"
    fi
}

# Function to restore backup
restore() {
    echo -e "${GREEN}Database Restore${NC}"
    echo "================"
    
    # List available backups
    list_backups
    
    # Check if there are any backups
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/backup_*.db 2>/dev/null)" ]; then
        echo -e "${RED}No backups available to restore!${NC}"
        exit 1
    fi
    
    # Get user input
    echo ""
    echo -n "Enter backup number to restore (or 'latest' for most recent): "
    read choice
    
    if [ "$choice" = "latest" ]; then
        if [ -L "$BACKUP_DIR/latest.db" ]; then
            RESTORE_FILE="$BACKUP_DIR/latest.db"
        else
            echo -e "${RED}No latest backup link found!${NC}"
            exit 1
        fi
    else
        # Get the nth backup file
        RESTORE_FILE=$(ls -t "$BACKUP_DIR"/backup_*.db | sed -n "${choice}p")
        
        if [ -z "$RESTORE_FILE" ]; then
            echo -e "${RED}Invalid selection!${NC}"
            exit 1
        fi
    fi
    
    echo ""
    echo -e "${YELLOW}Warning: This will replace the current database!${NC}"
    echo "Restore from: $RESTORE_FILE"
    echo -n "Continue? (y/N): "
    read confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Restore cancelled."
        exit 0
    fi
    
    # Create backup of current database before restore
    echo "Creating backup of current database first..."
    backup
    
    # Restore the database
    echo "Restoring database to persistent path..."
    cp "$RESTORE_FILE" "$DB_PATH"
    
    # Backward-compatibility: also update legacy path if present/needed
    mkdir -p "$(dirname "$LEGACY_DB")"
    cp "$RESTORE_FILE" "$LEGACY_DB" 2>/dev/null || true
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database restored successfully!${NC}"
        echo "Restored from: $RESTORE_FILE"
    else
        echo -e "${RED}❌ Restore failed!${NC}"
        exit 1
    fi
}

# Function for automatic backups (called by cron)
auto_backup() {
    LOG_FILE="$DATA_DIR/auto-backup.log"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting automatic backup..." >> "$LOG_FILE"
    
    # Only backup if database exists and has been modified in last 24 hours
    if [ -f "$DB_PATH" ]; then
        if [ $(find "$DB_PATH" -mtime -1 | wc -l) -gt 0 ]; then
            backup >> "$LOG_FILE" 2>&1
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Automatic backup completed" >> "$LOG_FILE"
        else
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database not modified, skipping backup" >> "$LOG_FILE"
        fi
    fi
}

# Main script logic
case "$1" in
    backup)
        backup
        ;;
    restore)
        restore
        ;;
    list)
        list_backups
        ;;
    auto-backup)
        auto_backup
        ;;
    *)
        usage
        ;;
esac