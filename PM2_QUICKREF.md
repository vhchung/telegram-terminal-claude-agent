# PM2 Quick Reference Guide

## Installation

```bash
bun install -g pm2
```

## Setup (One-Time)

```bash
# Option 1: Automated setup
./setup-pm2.sh

# Option 2: Manual setup
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Then run the command it outputs
```

## Daily Commands

### Starting & Stopping
```bash
pm2 start telegram-claude-bot      # Start
pm2 stop telegram-claude-bot       # Stop
pm2 restart telegram-claude-bot    # Restart
pm2 reload telegram-claude-bot     # Zero-downtime reload
```

### Viewing Status
```bash
pm2 status                         # List all processes
pm2 show telegram-claude-bot       # Detailed info
pm2 monit                          # Real-time monitoring
```

### Viewing Logs
```bash
pm2 logs telegram-claude-bot       # All logs
pm2 logs telegram-claude-bot --err # Error logs only
pm2 logs telegram-claude-bot --out # Output logs only
pm2 logs telegram-claude-bot --lines 100  # Last 100 lines
pm2 flush                          # Clear all logs
```

### Managing Multiple Processes
```bash
pm2 list                           # List all
pm2 restart all                   # Restart all
pm2 stop all                      # Stop all
pm2 delete all                    # Delete all
```

## NPM Scripts

```bash
bun run pm2:start     # Start with PM2
bun run pm2:stop      # Stop with PM2
bun run pm2:restart   # Restart with PM2
bun run pm2:logs      # View logs
bun run pm2:status    # Check status
```

## Updating the Bot

```bash
# Pull latest changes
git pull

# Install dependencies
bun install

# Restart with PM2
pm2 restart telegram-claude-bot
```

## Troubleshooting

```bash
# Check if bot is running
pm2 status

# View recent logs
pm2 logs telegram-claude-bot --lines 50

# Check detailed info
pm2 show telegram-claude-bot

# Reset restart counter
pm2 reset telegram-claude-bot
```

## Log Files Location

Logs are stored in `./logs/`:
- `pm2-error.log` - Error logs
- `pm2-out.log` - Output logs
- `pm2-combined.log` - Combined logs

## Uninstall

```bash
pm2 delete telegram-claude-bot
pm2 save
pm2 unstartup
```
