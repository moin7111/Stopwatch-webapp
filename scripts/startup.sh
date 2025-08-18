#!/bin/bash

# Startup script for Imperia Magic Server
# This script ensures database persistence across container restarts

echo "🚀 Starting Imperia Magic Server..."
echo "=================================="

# Run database check first
if [ -f "/workspace/scripts/check-database.sh" ]; then
    echo "📊 Checking database persistence..."
    /workspace/scripts/check-database.sh
    echo ""
fi

# Ensure log directory exists
mkdir -p /workspace/logs

# Start the Node.js server
echo "🖥️  Starting Node.js server..."
exec node /workspace/server.js