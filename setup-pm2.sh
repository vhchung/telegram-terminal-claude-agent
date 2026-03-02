#!/bin/bash

# PM2 Setup Script for Telegram Claude Bot
# This script sets up PM2 to run the bot at startup

set -e

echo "=== PM2 Setup for Telegram Claude Bot ==="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    bun install -g pm2
    echo "✓ PM2 installed"
else
    echo "✓ PM2 is already installed"
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  Warning: .env file not found!"
    echo "Please create .env file first:"
    echo "  cp .env.example .env"
    echo "Then edit .env with your configuration"
    echo ""
    exit 1
fi

echo ""
echo "Creating logs directory..."
mkdir -p logs
echo "✓ Logs directory created"

echo ""
echo "Starting the bot with PM2..."
pm2 start ecosystem.config.js
echo "✓ Bot started"

echo ""
echo "Saving PM2 process list..."
pm2 save
echo "✓ PM2 process list saved"

echo ""
echo "Setting up PM2 to start on system boot..."
pm2 startup | tail -n 1 > /tmp/pm2_startup_command.txt

echo "✓ To complete setup, run the following command:"
echo ""
cat /tmp/pm2_startup_command.txt
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Useful PM2 commands:"
echo "  pm2 logs telegram-claude-bot      - View logs"
echo "  pm2 status                        - Check status"
echo "  pm2 restart telegram-claude-bot   - Restart bot"
echo "  pm2 stop telegram-claude-bot      - Stop bot"
echo "  pm2 delete telegram-claude-bot    - Remove from PM2"
echo "  pm2 monit                         - Monitor dashboard"
echo ""
echo "Current status:"
pm2 status
