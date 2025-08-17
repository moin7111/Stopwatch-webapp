#!/bin/bash

# View logs utility script
echo "🔍 Imperia Magic Server Logs Viewer"
echo "=================================="

# Check if logs directory exists
if [ ! -d "logs" ]; then
    echo "❌ No logs directory found. Server might not have been started yet."
    exit 1
fi

# Function to display menu
show_menu() {
    echo ""
    echo "Select log to view:"
    echo "1) Today's server log"
    echo "2) Today's error log"
    echo "3) Today's authentication log"
    echo "4) All server logs"
    echo "5) All error logs"
    echo "6) All auth logs"
    echo "7) Live tail server log"
    echo "8) Live tail error log"
    echo "9) Search in logs"
    echo "0) Exit"
    echo ""
    read -p "Enter choice: " choice
}

# Get today's date
TODAY=$(date +%Y-%m-%d)

# Main loop
while true; do
    show_menu
    
    case $choice in
        1)
            echo "📄 Today's Server Log (server-$TODAY.log):"
            echo "----------------------------------------"
            if [ -f "logs/server-$TODAY.log" ]; then
                cat "logs/server-$TODAY.log"
            else
                echo "No server log found for today."
            fi
            ;;
        2)
            echo "❌ Today's Error Log (error-$TODAY.log):"
            echo "----------------------------------------"
            if [ -f "logs/error-$TODAY.log" ]; then
                cat "logs/error-$TODAY.log"
            else
                echo "No error log found for today."
            fi
            ;;
        3)
            echo "🔐 Today's Auth Log (auth-$TODAY.log):"
            echo "--------------------------------------"
            if [ -f "logs/auth-$TODAY.log" ]; then
                cat "logs/auth-$TODAY.log"
            else
                echo "No auth log found for today."
            fi
            ;;
        4)
            echo "📄 All Server Logs:"
            echo "-------------------"
            ls -la logs/server-*.log 2>/dev/null || echo "No server logs found."
            ;;
        5)
            echo "❌ All Error Logs:"
            echo "------------------"
            ls -la logs/error-*.log 2>/dev/null || echo "No error logs found."
            ;;
        6)
            echo "🔐 All Auth Logs:"
            echo "-----------------"
            ls -la logs/auth-*.log 2>/dev/null || echo "No auth logs found."
            ;;
        7)
            echo "👀 Live Server Log (Ctrl+C to stop):"
            echo "------------------------------------"
            if [ -f "logs/server-$TODAY.log" ]; then
                tail -f "logs/server-$TODAY.log"
            else
                echo "No server log found for today."
            fi
            ;;
        8)
            echo "👀 Live Error Log (Ctrl+C to stop):"
            echo "-----------------------------------"
            if [ -f "logs/error-$TODAY.log" ]; then
                tail -f "logs/error-$TODAY.log"
            else
                echo "No error log found for today."
            fi
            ;;
        9)
            read -p "Enter search term: " search_term
            echo "🔍 Searching for '$search_term' in all logs:"
            echo "--------------------------------------------"
            grep -n "$search_term" logs/*.log 2>/dev/null || echo "No matches found."
            ;;
        0)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please try again."
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done