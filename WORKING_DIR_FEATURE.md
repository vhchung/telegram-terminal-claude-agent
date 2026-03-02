# Working Directory Restriction Feature - Implementation Summary

## Overview

Added a working directory restriction feature that ensures all commands (shell and Claude CLI) execute within a configured directory.

## Changes Made

### 1. Environment Variable (.env.example)
- Added `WORKING_DIR` variable (optional, defaults to current directory)
- Supports both absolute and relative paths
- Example: `WORKING_DIR=/path/to/project` or `WORKING_DIR=./my-project`

### 2. Configuration (src/config.ts)
- Added `workingDir: string` to Config interface
- Added `resolveWorkingDir()` function to validate and resolve the directory path
- Updated `validateConfig()` to be async and resolve the working directory on startup
- Directory is validated by attempting to `cd` into it and getting the absolute path via `pwd`
- Displays resolved directory on startup

### 3. Shell Tool (src/tools/shell.ts)
- Updated `executeShellCommand()` to change to working directory before executing commands
- All shell commands now run as: `cd "$WORKING_DIR" && command`
- This ensures all file operations are relative to the configured directory

### 4. Claude Tool (src/tools/claude.ts)
- Updated `executeClaudePrompt()` to spawn Claude CLI with `cwd: config.workingDir`
- This ensures all Claude file operations are relative to the configured directory

### 5. Main Entry Point (src/index.ts)
- Removed synchronous `validateConfig()` call from top level
- Added `await validateConfig()` as the first step in `startBot()` function
- This ensures working directory is resolved before bot starts

### 6. Documentation
- Updated README.md with working directory section
- Updated QUICKSTART.md with working directory configuration and examples
- Explained benefits: safety, convenience, security

## How It Works

### Startup Flow
1. Bot starts and calls `validateConfig()`
2. `WORKING_DIR` env var is read (or defaults to `process.cwd()`)
3. Directory is resolved to absolute path via `cd "$DIR" && pwd`
4. Config is updated with resolved path
5. Working directory is logged to console
6. Bot initializes and starts polling

### Command Execution Flow

**Shell Commands:**
```
User: ls
→ executeShellCommand("ls")
→ Runs: cd "$WORKING_DIR" && ls
→ Returns: Files in working directory
```

**Claude Commands:**
```
User: Refactor auth.ts
→ executeClaudePrompt("Refactor auth.ts")
→ Spawns: claude "Refactor auth.ts" with cwd=WORKING_DIR
→ Claude operates in working directory
→ Returns: Results
```

## Security Benefits

1. **Containment**: All file operations are restricted to the working directory
2. **No Escalation**: Commands cannot accidentally affect system files
3. **Predictable**: All paths are relative to the configured directory
4. **Explicit**: Directory is set and logged on startup

## Configuration Examples

### Absolute Path
```env
WORKING_DIR=/home/user/projects/my-app
```

### Relative Path
```env
WORKING_DIR=./projects/my-app
```

### Default (Current Directory)
```env
# Leave empty or don't set
WORKING_DIR=
```

## Testing

To verify the working directory is correctly set:

1. Start the bot and check the console output:
   ```
   ✓ Working directory: /path/to/your/directory
   ```

2. In Telegram, send `pwd` command:
   ```
   You: pwd
   Bot: [Should show configured working directory]
   ```

3. Send `ls` command:
   ```
   You: ls
   Bot: [Should show files in working directory]
   ```

## Files Modified

- `.env.example` - Added WORKING_DIR variable
- `src/config.ts` - Added working directory resolution
- `src/tools/shell.ts` - Added cd to working directory
- `src/tools/claude.ts` - Added cwd for Claude CLI
- `src/index.ts` - Made validateConfig async
- `README.md` - Added documentation
- `QUICKSTART.md` - Added documentation

## Type Safety

- All TypeScript changes compile without errors
- Config interface properly typed with `workingDir: string`
- Async/await properly handled in config validation

## Backward Compatibility

- Feature is fully backward compatible
- If `WORKING_DIR` is not set, defaults to `process.cwd()`
- Existing installations will continue to work without changes
