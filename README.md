# Telegram Terminal & Claude Code Agent

A specialized Telegram Chatbot built with BunJS that acts as a remote terminal bridge and an AI orchestrator. It uses LLM providers (Gemini or Groq) to analyze user intent, execute standard shell commands, and optimize prompts for Claude Code (CLI) with a mandatory manual approval gate.

## Features

- **Remote Terminal**: Execute shell commands via Telegram (git, ls, pwd, etc.)
- **Claude Code Integration**: Propose and execute complex coding tasks with approval workflow
- **AI-Powered Intent Analysis**: Uses Gemini or Groq to determine whether to use shell or Claude
- **Multiple LLM Providers**: Switch between Gemini and Groq to avoid rate limits
- **Manual Approval Gate**: All Claude Code actions require explicit confirmation
- **Working Directory Restriction**: All commands execute in a configurable directory
- **Admin Whitelist**: Only authorized users can interact with the bot
- **Session Management**: Tracks pending actions and active processes
- **MarkdownV2 Formatting**: Beautiful formatted output in Telegram

## Tech Stack

- **Runtime**: BunJS (v1.1+)
- **LLM Providers**: Google Generative AI (Gemini) or Groq
- **Telegram Framework**: Grammy (High-performance TypeScript framework)
- **Shell Execution**: Bun Shell (Bun.$ and Bun.spawn)
- **Language**: TypeScript (Strict mode)

## Installation

### Prerequisites

- [Bun](https://bun.sh/) v1.1 or higher
- [Claude Code CLI](https://claude.ai/code) installed and accessible via `claude` command
- A Telegram Bot Token (get from [@BotFather](https://t.me/botfather))
- A Google AI API Key (get from [Google AI Studio](https://makersuite.google.com/app/apikey)) OR
- A Groq API Key (get from [Groq Console](https://console.groq.com/keys))

### Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd my-telegram-chatbot
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in the required values:
   ```env
   # Required
   TELEGRAM_TOKEN=your_telegram_bot_token_here

   # Choose your LLM provider: gemini or groq
   PROVIDER=groq

   # For Gemini (required if PROVIDER=gemini)
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash

   # For Groq (required if PROVIDER=groq)
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile

   # Security
   ADMIN_ID=your_telegram_user_id_here
   # OR use username (easier, no @ symbol)
   ADMIN_USERNAME=your_telegram_username

   # Optional
   CLAUDE_CLI_PATH=claude
   WORKING_DIR=/path/to/your/project
   ```

   **Important**: Set `WORKING_DIR` to restrict all commands to a specific directory. All shell and Claude commands will be executed in this directory.

4. **Get your Telegram User ID**
   - Message [@userinfobot](https://t.me/userinfobot) on Telegram
   - It will reply with your user ID
   - Add this ID to `ADMIN_ID` in `.env` (or use `ADMIN_USERNAME` for easier setup)

## Usage

### Development Mode (with auto-reload)

```bash
bun run dev
```

### Production Mode (Manual)

```bash
bun run start
```

### Production Mode with PM2 (Recommended)

PM2 provides automatic restarts, logging, and startup on boot.

**Quick Setup:**
```bash
# Run the automated setup script
./setup-pm2.sh
```

**Manual Setup:**
```bash
# Install PM2 globally
bun install -g pm2

# Start the bot with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script (follow the output command)
pm2 startup
```

**PM2 Commands:**
```bash
pm2 logs telegram-claude-bot      # View logs
pm2 status                        # Check status
pm2 restart telegram-claude-bot   # Restart
pm2 stop telegram-claude-bot      # Stop
pm2 monit                         # Monitor dashboard
```

For detailed PM2 setup and troubleshooting, see [PM2_SETUP.md](PM2_SETUP.md).

### Type Checking

```bash
bun run type-check
```

## How It Works

### 1. Simple Commands (Shell)

For lightweight, non-destructive operations:

```
You: git status
Bot: ✅ Executes git status and shows output

You: ls -la
Bot: ✅ Lists files in current directory

You: pwd
Bot: ✅ Shows current directory
```

### 2. Complex Tasks (Claude Code)

For coding, refactoring, or complex tasks:

```
You: Refactor the auth logic in src/auth.ts to use cookies

Bot: 🛠 Proposed Claude Action:
    claude "Refactor src/auth.ts to implement cookie-based authentication,
            replacing the current localStorage logic. Ensure CSRF protection
            is included."

    [ ✅ Confirm & Run ] [ ❌ Cancel ] [ 📝 Edit Prompt ]

You: [Presses Confirm]

Bot: ✅ Executes Claude Code and shows results
```

## Working Directory Restriction

The bot can be configured to restrict all commands to a specific directory. This is useful for:

- Safety: Prevent accidental modifications outside your project
- Convenience: Always work in the same project directory
- Security: Limit the bot's access to a specific folder

### Configuration

Set the `WORKING_DIR` environment variable in your `.env` file:

```env
# Absolute path
WORKING_DIR=/home/user/projects/my-app

# Relative path (from bot's current directory)
WORKING_DIR=./projects/my-app

# If not set, defaults to the directory where the bot is running
```

### How It Works

- All shell commands are executed with `cd "$WORKING_DIR" && command`
- Claude CLI is spawned with `cwd: workingDir`
- The directory is validated and resolved to an absolute path on startup
- All file operations (git, ls, Claude edits) are relative to this directory

### Example

```env
WORKING_DIR=/home/user/projects/my-telegram-chatbot
```

Now when you run:
```
You: ls
Bot: [Shows files in /home/user/projects/my-telegram-chatbot]

You: git status
Bot: [Shows git status of /home/user/projects/my-telegram-chatbot]

You: pwd
Bot: /home/user/projects/my-telegram-chatbot
```

## Architecture

```
src/
├── index.ts           # Main entry, Telegram bot setup
├── config.ts          # Env validation & provider configuration
├── agents/
│   ├── base.ts        # Provider interface & types
│   ├── gemini.ts      # Gemini provider implementation
│   ├── groq.ts        # Groq provider implementation
│   └── factory.ts     # Provider factory
├── tools/
│   ├── shell.ts       # Bun.$ shell wrappers
│   └── claude.ts      # Claude CLI execution
├── services/
│   ├── session.ts     # State management (pending approvals)
│   └── terminal.ts    # Command execution & output formatting
├── utils/
│   ├── formatter.ts   # Telegram Markdown escaping
│   └── logger.ts      # Logging utilities
└── types/
    └── index.ts       # TypeScript definitions
```

## LLM Provider Comparison

| Feature | Gemini | Groq |
|---------|--------|------|
| **Speed** | Fast | Very Fast |
| **Rate Limits** | Moderate | Generous |
| **Cost** | Free tier available | Free tier available |
| **Models** | gemini-2.5-flash, gemini-1.5-pro | llama-3.3-70b, mixtral-8x7b |
| **JSON Mode** | Manual parsing | Native support |
| **Best For** | Complex reasoning | Fast responses, high volume |

**Recommendation**: Start with Groq for faster responses and higher rate limits. Switch to Gemini if you need more advanced reasoning capabilities.

## Security

- **Admin Whitelist**: Only the configured `ADMIN_ID` can use the bot
- **Manual Approval**: All Claude Code actions require explicit confirmation
- **Safe Command Detection**: The bot checks for destructive patterns
- **Environment Variables**: Sensitive data stored in `.env` (never commit)

## Commands via Telegram

### Shell Commands
- `git status`, `git log`, `git branch` - Git operations
- `ls`, `ls -la`, `pwd` - File system navigation
- `whoami`, `hostname` - System information

### Claude Code Actions
- Code refactoring
- Feature implementation
- Bug fixing
- File creation/modification
- Multi-step coding tasks

## Troubleshooting

### Bot doesn't respond
- Check `ADMIN_ID` is correct
- Verify `TELEGRAM_TOKEN` is valid
- Check bot logs for errors

### Claude commands fail
- Ensure Claude CLI is installed: `claude --version`
- Check `CLAUDE_CLI_PATH` in `.env`
- Verify you've logged in to Claude CLI

### Gemini API errors
- Verify `GEMINI_API_KEY` is valid
- Check API quota in Google Cloud Console
- Ensure the model name is correct
- Try switching to Groq provider if you hit rate limits

### Groq API errors
- Verify `GROQ_API_KEY` is valid
- Check your quota at [Groq Console](https://console.groq.com/)
- Ensure the model name is correct (e.g., `llama-3.3-70b-versatile`)
- Try switching to Gemini provider if you hit rate limits

### Switching Between Providers

If you encounter rate limits with one provider, you can easily switch:

1. **Using Gemini (default)**
   ```env
   PROVIDER=gemini
   GEMINI_API_KEY=your_key
   GEMINI_MODEL=gemini-2.5-flash
   ```

2. **Using Groq (faster, often higher rate limits)**
   ```env
   PROVIDER=groq
   GROQ_API_KEY=your_key
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

3. **Recommended Groq Models:**
   - `llama-3.3-70b-versatile` - Best balance of speed and capability
   - `llama-3.1-70b-versatile` - Slightly older but still excellent
   - `mixtral-8x7b-32768` - Good for complex reasoning

## Project Structure

- **Orchestrator** (`src/agents/gemini.ts`): Uses Gemini to analyze intent
- **Tool Registry** (`src/tools/`): Defines `execute_shell` and `propose_claude_action`
- **Session Manager** (`src/services/session.ts`): Manages pending approval states
- **Terminal Bridge** (`src/services/terminal.ts`): Handles command execution

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.
