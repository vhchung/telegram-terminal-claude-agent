# Claude Code Execution Fix

## Problem

When using terminal session mode (`/start`), Claude was not able to complete tasks that involve file operations. For example:

```
You: Update the README.md file to add a new section
Claude: [Shows what it would do, but doesn't actually write the file]
```

The issue was that Claude Code would respond with its plan but not execute the actual file writes.

## Root Cause

The original implementation passed the prompt to Claude Code via stdin and immediately closed the stream:

```typescript
const proc = spawn({
  cmd: [config.claudeCliPath],
  cwd: config.workingDir,
  stdout: 'pipe',
  stderr: 'stderr',
  stdin: 'pipe',
});

// Write prompt and close stdin
await proc.stdin.write(prompt);
await proc.stdin.end();  // ❌ This closes the session too early
```

This made Claude Code think the interactive session was ending, so it would just respond with text instead of executing its full tool-use cycle (Read → Edit → Write).

## Solution

Use Claude Code CLI's `--print` flag with `--permission-mode acceptEdits`:

```typescript
const proc = spawn({
  cmd: [
    config.claudeCliPath,
    '--print',                      // Non-interactive mode
    '--permission-mode', 'acceptEdits',  // Auto-approve changes
    prompt
  ],
  cwd: config.workingDir,
  stdout: 'pipe',
  stderr: 'pipe',
});
```

### Key Changes

1. **`--print` flag**: Makes Claude Code non-interactive
   - Executes the prompt fully
   - Completes all tool operations (Read, Edit, Write, Bash, etc.)
   - Exits when done

2. **`--permission-mode acceptEdits`**: Auto-approves changes
   - Doesn't ask for permission to edit files
   - Doesn't ask for permission to run commands
   - Safe in terminal mode since user initiated the session

3. **Pass prompt as argument**: Instead of stdin
   - Cleaner command structure
   - No stdin management needed
   - Better integration with CLI

## Verification

Tested with actual file operations:

```bash
# Create a file
claude --print --permission-mode acceptEdits \
  "create a test file called test.txt with content 'Hello'"

# Update a file
claude --print --permission-mode acceptEdits \
  "update the README.md file to add a test section"
```

Both operations completed successfully with actual file modifications.

## Impact

### Terminal Session Mode (✅ Fixed)

Now works correctly for file operations:

```
You: /start
Bot: [Session started]

You: Add error handling to src/auth.ts
Claude: [Reads file] → [Makes changes] → [Writes file] ✅
Claude: Done! I've added error handling to src/auth.ts
```

### Normal Mode (✅ Improved)

Also benefits from the fix:

```
You: Refactor auth logic
Bot: 🛠 Proposed Claude Action: ...
You: [Confirm]
Claude: [Actually writes files] ✅
```

## Security Considerations

### Why `acceptEdits` is Safe in Terminal Mode

1. **User-initiated**: User explicitly starts session with `/start`
2. **Explicit approval**: Every message in terminal mode is a user request
3. **Can exit anytime**: User can `/exit` if concerned
4. **Working directory restriction**: All operations confined to `WORKING_DIR`

### Alternative Permission Modes

If you want more control, you can use different modes:

- `default` - Ask for permissions (not recommended for bot use)
- `acceptEdits` - Auto-accept file edits (current setting)
- `bypassPermissions` - Skip all permission checks (most permissive)
- `delegate` - Delegate permission decisions

## Testing

To verify the fix works:

1. Start your bot: `bun run dev` or `pm2 restart telegram-claude-bot`
2. Send `/start` to enter terminal mode
3. Try a file operation: "Create a new file called hello.txt with content 'World'"
4. Check the file was actually created

## Files Modified

- `src/tools/claude.ts` - Updated `executeClaudePrompt()` to use `--print` flag
- `src/tools/claude.ts` - Removed unused `executeClaudeInteractive()` function
- `src/tools/claude.ts` - Added `--permission-mode acceptEdits` for auto-approval

## Backward Compatibility

This change is fully backward compatible:
- Normal mode (with Gemini analysis) still works
- Approval workflow still works
- All existing functionality preserved
- Only improvement: Claude now actually executes file operations
