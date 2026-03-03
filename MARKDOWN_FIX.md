# MarkdownV2 Escaping Fix

## Problem

When Claude Code returned complex output (like commit messages with special characters), the bot failed to send the message with this error:

```
GrammyError: Call to 'sendMessage' failed! (400: Bad Request: can't parse entities:
Character '-' is reserved and must be escaped with the preceding '\')
```

## Root Cause

Telegram's MarkdownV2 format is extremely strict about special characters. When the bot tried to send Claude's output with `parse_mode: 'MarkdownV2'`, any unescaped special characters in the output caused parsing errors.

The issue occurred because:
1. Claude's output contains arbitrary text (commit messages, code, etc.)
2. This text was being wrapped in code blocks but sent with MarkdownV2 parsing
3. Special characters like `-`, `_`, `*`, etc. in the output caused Telegram to reject the message

## Solution

Instead of trying to escape all special characters (which is impractical for complex output), the fix sends Claude's output **without** Markdown formatting. This approach:

1. **For shell commands**: Still use MarkdownV2 formatting (simple, predictable output)
2. **For Claude output**: Use plain text (complex, unpredictable output)

### Changes Made

#### 1. Updated `executeAndFormatClaude` Return Type
**File:** `src/services/terminal.ts`

Changed from returning a single string to returning an object with both formatted and plain text versions:

```typescript
// Before
export async function executeAndFormatClaude(
  prompt: string,
  options: TerminalExecutionOptions = {}
): Promise<string>

// After
export async function executeAndFormatClaude(
  prompt: string,
  options: TerminalExecutionOptions = {}
): Promise<{formatted: string; plainText: string}>
```

#### 2. Added `useMarkdown` Parameter to `formatTerminalResult`
**File:** `src/services/terminal.ts`

Added a parameter to control whether to use Markdown formatting:

```typescript
export function formatTerminalResult(
  result: ShellResult,
  command: string,
  useMarkdown: boolean = true
): string
```

- When `useMarkdown = true`: Uses MarkdownV2 formatting (for shell commands)
- When `useMarkdown = false`: Uses plain text (for Claude output)

#### 3. Updated All Call Sites
**File:** `src/index.ts`

Updated all places where `executeAndFormatClaude` is called:

1. **Terminal session mode (line ~298)**
   ```typescript
   // Before
   const result = await executeAndFormatClaude(fullPrompt);

   // After
   const { plainText: result } = await executeAndFormatClaude(fullPrompt);
   await ctx.reply(result); // No parse_mode
   ```

2. **Normal mode callback handler (line ~553)**
   ```typescript
   // Before
   const result = await executeAndFormatClaude(pendingAction.optimizedPrompt);
   await ctx.api.sendMessage(chatId, result, { parse_mode: 'MarkdownV2' });

   // After
   const { plainText: result } = await executeAndFormatClaude(pendingAction.optimizedPrompt);
   await ctx.api.sendMessage(chatId, result); // No parse_mode
   ```

3. **Terminal mode response (lines ~342, ~684)**
   ```typescript
   // Before
   await ctx.reply(result.response, { parse_mode: 'MarkdownV2' });

   // After
   await ctx.reply(result.response); // No parse_mode
   ```

## Impact

### Benefits
- ✅ Claude output with special characters now works correctly
- ✅ No more Markdown parsing errors
- ✅ Simpler code (no need for complex escaping logic)
- ✅ Better user experience (messages sent successfully)

### Trade-offs
- ❌ Claude output won't have Markdown formatting (bold, code blocks, etc.)
- ✅ Shell commands still have Markdown formatting (predictable output)

## Example

### Before (Failed)
```
User: Create a commit message for this change
Bot: [Error: can't parse entities: Character '-' is reserved]
```

### After (Works)
```
User: Create a commit message for this change
Bot:
✅ Command executed successfully
🔹 Command: claude "Create a commit message..."
⏱ Duration: 42226ms

Output:
WEBAPP-4268 Add retry logic for LLM parsing errors

- Add retry_on_llm_error decorator to handle JSON parsing errors
- Apply retry to _generate_style_profile function (max 2 attempts)
...
```

## Testing

Tested with various Claude outputs:
- ✅ Commit messages with hyphens, underscores, asterisks
- ✅ Code snippets with special characters
- ✅ Multiline output
- ✅ Vietnamese text with special characters
- ✅ Shell commands still work with Markdown formatting

## Related Files

- `src/services/terminal.ts` - Core formatting changes
- `src/index.ts` - Updated all call sites
- No changes to configuration or environment variables needed
