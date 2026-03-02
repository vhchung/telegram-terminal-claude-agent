# Telegram Terminal & Claude Code Agent - Implementation Complete

## Project Overview

A specialized Telegram Chatbot built with BunJS that acts as a remote terminal bridge and an AI orchestrator. It uses Gemini 2.5 Flash-Lite to analyze user intent, execute standard shell commands, and optimize prompts for Claude Code (CLI) with a mandatory manual approval gate.

## Implementation Status: ✅ COMPLETE

All components have been successfully implemented and type-checked.

## Project Structure

```
my-telegram-chatbot/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore patterns
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Full documentation
├── QUICKSTART.md             # This file
├── bun.lock                  # Lock file
└── src/
    ├── index.ts              # Main entry point (Telegram bot setup)
    ├── config.ts             # Environment variable validation
    ├── agents/
    │   └── gemini.ts         # Gemini AI orchestrator with tool definitions
    ├── tools/
    │   ├── shell.ts          # Shell command execution (Bun.$)
    │   └── claude.ts         # Claude CLI execution logic
    ├── services/
    │   ├── session.ts        # Session state management (in-memory Map)
    │   └── terminal.ts       # Terminal bridge service
    ├── utils/
    │   ├── formatter.ts      # Telegram MarkdownV2 formatting
    │   └── logger.ts         # Logging utilities
    └── types/
        └── index.ts          # TypeScript type definitions
```

## Key Features Implemented

### 1. Core Modules
- ✅ **Orchestrator** (`src/agents/gemini.ts`): Uses Gemini 2.5 Flash-Lite for intent analysis
- ✅ **Tool Registry**: `execute_shell` and `propose_claude_action` functions
- ✅ **Session State Machine**: In-memory Map for pending approval states
- ✅ **Terminal Bridge**: Async command execution with output streaming

### 2. Security Features
- ✅ **Admin Whitelist**: Only configured `ADMIN_ID` can use the bot
- ✅ **Manual Approval Gate**: All Claude actions require explicit confirmation
- ✅ **Environment Variables**: Sensitive data in `.env` (git-ignored)
- ✅ **Safe Command Detection**: Checks for destructive patterns

### 3. Telegram UI Features
- ✅ **Inline Keyboards**: Confirm/Cancel/Edit buttons for Claude actions
- ✅ **MarkdownV2 Formatting**: Properly escaped formatted messages
- ✅ **Edit Messages**: Updates existing messages instead of spamming
- ✅ **Long-running Process Support**: Shows "Processing..." status

### 4. Interaction Flow
```
User Message → Gemini Analysis → Tool Selection
                                   ↓
                    ┌──────────────┴──────────────┐
                    ↓                              ↓
            execute_shell                 propose_claude_action
                    ↓                              ↓
            Direct execution           UI with buttons
                    ↓                    ↓
                 Results           User confirms → Execute Claude
                                          ↓
                                      Results
```

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
TELEGRAM_TOKEN=your_bot_token
GEMINI_API_KEY=your_gemini_key
ADMIN_ID=your_telegram_user_id
WORKING_DIR=/path/to/your/project  # Optional, defaults to current directory
```

### 3. Get Your Telegram User ID
Message [@userinfobot](https://t.me/userinfobot) on Telegram

### 4. Run the Bot
```bash
# Development mode (auto-reload)
bun run dev

# Production mode
bun run start
```

## Usage Examples

### Shell Commands
```
You: git status
Bot: [Shows git status output]

You: ls -la
Bot: [Lists files]

You: pwd
Bot: [Shows current directory]
```

### Claude Code Actions
```
You: Refactor auth logic in src/auth.ts

Bot: 🛠 Proposed Claude Action:
    claude "Refactor src/auth.ts to implement cookie-based
            authentication, replacing the current localStorage
            logic. Ensure CSRF protection is included."

    [ ✅ Confirm & Run ] [ ❌ Cancel ] [ 📝 Edit Prompt ]

You: [Press Confirm]
Bot: [Executes Claude and shows results]
```

## Working Directory Restriction

### Why Use It?

- **Safety**: Prevent accidental modifications outside your project
- **Convenience**: Always work in the same project directory
- **Security**: Limit the bot's access to a specific folder

### Configuration

Set `WORKING_DIR` in `.env`:

```env
# Absolute path
WORKING_DIR=/home/user/projects/my-app

# Relative path (from bot's current directory)
WORKING_DIR=./my-project

# If not set, defaults to the bot's current directory
```

### How It Works

1. All shell commands are wrapped with `cd "$WORKING_DIR" && command`
2. Claude CLI is spawned with `cwd: workingDir`
3. Directory is validated and resolved on startup
4. All file operations are relative to this directory

### Example

```env
WORKING_DIR=/home/user/my-project
```

```
You: ls
Bot: [Shows files in /home/user/my-project]

You: git status
Bot: [Shows git status of /home/user/my-project]
```

## Technical Details

### Tech Stack
- **Runtime**: BunJS v1.1+
- **LLM**: Google Gemini 2.0 Flash (experimental thinking-cache model)
- **Telegram Framework**: Grammy v1.41.0
- **Language**: TypeScript (ES modules, strict mode disabled for Bun compatibility)

### Tool Definitions
1. **execute_shell**: For lightweight, non-destructive commands (git, ls, pwd)
2. **propose_claude_action**: For code editing, refactoring, complex tasks

### System Prompt
The Gemini agent is configured as a "Terminal Orchestrator" that:
- Routes simple queries to `execute_shell`
- Routes coding tasks to `propose_claude_action`
- Optimizes user prompts for Claude CLI
- Never asks for confirmation (handled by UI)

## Configuration Files

### package.json
```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "type-check": "tsc --noEmit"
  }
}
```

### tsconfig.json
- Target: ESNext
- Module: ESNext
- Module Resolution: bundler
- Types: bun-types
- Strict: false (for Bun compatibility)

## Testing

TypeScript compilation:
```bash
bun run type-check
```

## Troubleshooting

### Bot doesn't respond
- Verify `ADMIN_ID` is correct
- Check `TELEGRAM_TOKEN` is valid
- Review logs for errors

### Claude commands fail
- Ensure Claude CLI is installed: `claude --version`
- Check `CLAUDE_CLI_PATH` in `.env`
- Verify you're logged in to Claude CLI

### Gemini API errors
- Verify `GEMINI_API_KEY` is valid
- Check API quota in Google Cloud Console
- Ensure model name is correct

## Architecture Highlights

### State Management
- In-memory Map keyed by chatId
- Tracks pending Claude actions
- Tracks active processes
- Auto-cleanup every 5 minutes

### Message Flow
1. User sends message
2. Admin whitelist check
3. Check for pending actions
4. Gemini analyzes intent
5. Execute tool or propose Claude action
6. Format and send result

### Error Handling
- Graceful error handling with user-friendly messages
- Proper cleanup of sessions
- Logs all errors for debugging

## Next Steps (Optional Enhancements)

1. **Persistent Session Storage**: Use Redis or database
2. **Edit Prompt Feature**: Full implementation for editing pending prompts
3. **Multi-user Support**: Multiple admin users
4. **Command History**: Track and replay commands
5. **File Upload**: Support file operations via Telegram
6. **Webhook Mode**: Use webhooks instead of polling

## License

MIT

## Credits

Built with:
- [BunJS](https://bun.sh/)
- [Grammy](https://grammy.dev/)
- [Google Generative AI](https://ai.google.dev/)
- [Claude Code CLI](https://claude.ai/code)
