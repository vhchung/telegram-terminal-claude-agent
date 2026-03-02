# Running the Bot with PM2 (Process Manager)

PM2 is a production process manager for Node.js/Bun applications with a built-in load balancer. It keeps your bot alive forever, reloads it without downtime, and helps you manage application logging and monitoring.

## Prerequisites

1. **Install PM2 globally:**
   ```bash
   bun install -g pm2
   ```

2. **Configure your `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env with your tokens and configuration
   ```

## Quick Setup (Recommended)

Run the automated setup script:

```bash
./setup-pm2.sh
```

This script will:
- ✓ Check if PM2 is installed
- ✓ Verify `.env` file exists
- ✓ Create logs directory
- ✓ Start the bot with PM2
- ✓ Save PM2 configuration
- ✓ Generate startup command for you

Follow the command shown at the end to enable PM2 startup on boot.

## Manual Setup

### Step 1: Start the Bot

```bash
pm2 start ecosystem.config.js
```

### Step 2: Save PM2 Configuration

```bash
pm2 save
```

### Step 3: Setup PM2 Startup Script

```bash
# Generate the startup command
pm2 startup

# This will output a command to run, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u yourusername --hp /home/yourusername

# Run the displayed command to enable PM2 on boot
```

## PM2 Commands

### Basic Management

```bash
# Start the bot
pm2 start ecosystem.config.js

# Stop the bot
pm2 stop telegram-claude-bot

# Restart the bot
pm2 restart telegram-claude-bot

# Delete from PM2
pm2 delete telegram-claude-bot

# View status
pm2 status

# View detailed info
pm2 show telegram-claude-bot
```

### Monitoring & Logs

```bash
# View logs (real-time)
pm2 logs telegram-claude-bot

# View logs with lines limit
pm2 logs telegram-claude-bot --lines 100

# View error logs only
pm2 logs telegram-claude-bot --err

# View output logs only
pm2 logs telegram-claude-bot --out

# Clear logs
pm2 flush

# Monitor dashboard (interactive)
pm2 monit
```

### Process Management

```bash
# Reload (zero-downtime reload)
pm2 reload telegram-claude-bot

# Reset restart count
pm2 reset telegram-claude-bot

# List all processes
pm2 list

# Display process details
pm2 describe telegram-claude-bot
```

## Configuration (ecosystem.config.js)

The bot uses `ecosystem.config.js` with the following settings:

- **Name**: `telegram-claude-bot`
- **Script**: `src/index.ts`
- **Interpreter**: `bun`
- **Instances**: 1
- **Auto-restart**: Enabled
- **Max Memory**: 500MB (restarts if exceeded)
- **Logs**: Stored in `./logs/` directory

### Customization

Edit `ecosystem.config.js` to customize:

```javascript
{
  name: 'telegram-claude-bot',      // Process name
  instances: 1,                      // Number of instances
  max_memory_restart: '500M',        // Memory limit
  autorestart: true,                 // Auto-restart on failure
  watch: false,                      // Watch for file changes
  env: {
    NODE_ENV: 'production',          // Production environment
  }
}
```

## Troubleshooting

### Bot Won't Start

1. **Check if `.env` exists:**
   ```bash
   ls -la .env
   ```

2. **Check PM2 logs:**
   ```bash
   pm2 logs telegram-claude-bot --lines 50
   ```

3. **Check configuration:**
   ```bash
   pm2 show telegram-claude-bot
   ```

### High Memory Usage

1. **Monitor memory usage:**
   ```bash
   pm2 monit
   ```

2. **Adjust memory limit in `ecosystem.config.js`:**
   ```javascript
   max_memory_restart: '1G',  // Increase to 1GB
   ```

### Bot Keeps Restarting

1. **Check error logs:**
   ```bash
   pm2 logs telegram-claude-bot --err
   ```

2. **Check for configuration errors:**
   - Verify `TELEGRAM_TOKEN` is correct
   - Verify `GEMINI_API_KEY` is correct
   - Verify `ADMIN_ID` is correct
   - Verify `WORKING_DIR` exists

3. **Increase restart limits in `ecosystem.config.js`:**
   ```javascript
   max_restarts: 20,              // Increase from 10
   min_uptime: '30s',             // Increase from 10s
   ```

## Updating the Bot

### Method 1: PM2 Update (Recommended)

```bash
# Pull latest changes
git pull

# Restart the bot
pm2 restart telegram-claude-bot

# Or reload for zero-downtime
pm2 reload telegram-claude-bot
```

### Method 2: Using PM2 Plus

```bash
# Pull changes
git pull

# Install dependencies
bun install

# Restart
pm2 restart telegram-claude-bot
```

## Monitoring & Alerts

### PM2 Plus (Optional)

For advanced monitoring, use PM2 Plus:

```bash
pm2 link <secret_key> <public_key>
```

Features:
- Real-time metrics
- Custom alerts
- Transaction tracing
- CPU/memory profiling

### System Monitoring

```bash
# View all PM2 processes
pm2 list

# View resource usage
pm2 monit

# Check startup script status
pm2 startup show
```

## Backup & Restore

### Backup PM2 Configuration

```bash
# Dump current processes to file
pm2 save

# Export to JSON
pm2 export > pm2-backup.json
```

### Restore PM2 Configuration

```bash
# Import from JSON
pm2 import pm2-backup.json

# Or restore from saved state
pm2 resurrect
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` file
2. **Log Files**: Logs may contain sensitive information
   - Logs are stored in `./logs/` directory
   - Add `logs/` to `.gitignore`
   - Rotate logs regularly: `pm2 install pm2-logrotate`
3. **User Permissions**: Run PM2 under non-root user when possible

## Log Rotation

Install PM2 logrotate module to manage log file sizes:

```bash
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## Uninstalling

```bash
# Stop and delete the bot
pm2 delete telegram-claude-bot

# Disable PM2 startup
pm2 unstartup

# Remove PM2 (optional)
bun uninstall -g pm2
```

## Cross-Platform Notes

### Linux (systemd)
- PM2 creates a systemd service
- Works with `systemctl` commands
- Survives system reboots

### macOS (launchd)
- PM2 creates a launchd agent
- Works with macOS startup
- Survives system reboots

### Windows
- PM2 creates a Windows service
- Requires additional setup
- May need administrative privileges

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Log Rotation](https://github.com/keymetrics/pm2-logrotate)
- [Bun + PM2 Guide](https://bun.sh/guides/runtime/process-manager)
