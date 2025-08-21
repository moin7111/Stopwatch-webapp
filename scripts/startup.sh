#!/bin/bash

# Startup script for Imperia Magic Server
# This script ensures database persistence across container restarts

echo "🚀 Starting Imperia Magic Server..."
echo "=================================="
echo "📅 $(date)"
echo ""

# Ensure critical directories exist
echo "📁 Creating required directories..."
mkdir -p /workspace/data
mkdir -p /workspace/logs
mkdir -p /workspace/data/backups

# Check directory permissions
echo "🔒 Checking permissions..."
ls -la /workspace/data/
echo ""

# Run database check first
if [ -f "/workspace/scripts/check-database.sh" ]; then
    echo "📊 Checking database persistence..."
    /workspace/scripts/check-database.sh
    echo ""
else
    echo "⚠️  Database check script not found!"
fi

# Display current database status
echo "📊 Current database status:"
if [ -f "/workspace/data/imperia_magic.db" ]; then
    echo "✅ Database exists at /workspace/data/imperia_magic.db"
    echo "   Size: $(du -h /workspace/data/imperia_magic.db | cut -f1)"
    echo "   Modified: $(stat -c %y /workspace/data/imperia_magic.db 2>/dev/null || stat -f "%Sm" /workspace/data/imperia_magic.db 2>/dev/null)"
else
    echo "❌ Database not found at /workspace/data/imperia_magic.db"
    echo "   A new database will be created on first run"
fi
echo ""

# Start the Node.js server
echo "🖥️  Starting Node.js server..."
exec node /workspace/server.js