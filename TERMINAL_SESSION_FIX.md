# Terminal Session Interactive Workflow Fix

## Problem

You reported two issues with the terminal session mode:

1. **"Session disconnects after each answer"** - The session appeared to end after Claude's response
2. **"Can't handle Claude asking for approval in the first response"** - When Claude asked for approval using the `AskUserQuestion` tool, the workflow broke

## Root Cause Analysis

### Issue 1: Session State
The terminal session state was actually **NOT** being cleared - the session remained active. However, there was no visual indicator to show the user that the session was still active, making it appear as if it had disconnected.

### Issue 2: Not Parsing AskUserQuestion in Responses
When a user answered Claude's question, the code at **line 298** was:
```typescript
const { plainText: result } = await executeAndFormatClaude(fullPrompt);
await ctx.reply(result);
```

This directly executed Claude and sent the raw response without checking if Claude had asked another question using the `AskUserQuestion` tool. The response could contain another `<ask_user_question>` tag that wasn't being parsed.

## Solution

### Fix: Always Use `executeClaudeInTerminalMode`

Changed the pending question handler to use `executeClaudeInTerminalMode` instead of `executeAndFormatClaude`:

**Before:**
```typescript
const { plainText: result } = await executeAndFormatClaude(fullPrompt);
sessionManager.clearCurrentProcess(chatId);
sessionManager.addToConversationHistory(chatId, `Claude: ${result}`);
await ctx.reply(result);
return;
```

**After:**
```typescript
const claudeResult = await executeClaudeInTerminalMode(fullPrompt, chatId, ctx);
sessionManager.clearCurrentProcess(chatId);

if (claudeResult.needsAnswer) {
  // Claude asked another question - buttons were already sent
  return;
}

// No new question, add response to history and send it
sessionManager.addToConversationHistory(chatId, `Claude: ${claudeResult.response}`);
await ctx.reply(claudeResult.response);
return;
```

This ensures that **every** response from Claude is checked for `AskUserQuestion` tags, allowing for multi-turn interactive workflows.

## How the Interactive Workflow Works

### Flow Diagram

```
User sends message
    ↓
Check if in terminal session?
    ↓ YES
Is there a pending question?
    ↓ NO
Execute Claude with conversation history
    ↓
Parse response for <ask_user_question>
    ↓
Found?
    ↓ YES                                        ↓ NO
Store question + options                   Add response to history
    ↓                                           ↓
Send buttons to user                        Send response to user
    ↓                                           ↓
[SESSION STAYS ACTIVE]                    [SESSION STAYS ACTIVE]
    ↓                                           ↓
User clicks button / sends text          User sends next message
    ↓                                           ↓
Execute Claude with answer              [Loop continues...]
    ↓
Parse response for <ask_user_question>
    ↓
Found?
    ↓ YES                      ↓ NO
Send new buttons            Add response to history
    ↓                            ↓
[SESSION STAYS ACTIVE]     Send response
    ↓                            ↓
[Loop continues...]       [SESSION STAYS ACTIVE]
```

### Example Multi-Turn Workflow

**Turn 1:**
```
User: "Refactor the authentication code"

Claude: "I'll refactor the authentication code. This will involve:
1. Updating the login function
2. Adding cookie support
3. Implementing CSRF protection

<ask_user_question>
<question>Should I proceed with these changes?</question>
<options>
<option><label>✅ Yes, proceed</label><value>yes</value></option>
<option><label>❌ No, cancel</label><value>no</value></option>
<option><label>📝 Modify plan</label><value>modify</value></option>
</options>
</ask_user_question>

[Bot sends inline buttons]
```

**Turn 2: User clicks "✅ Yes, proceed"**

```
[System: Executes Claude with user's answer]

Claude: "Great! I'll proceed with the refactoring.
<ask_user_question>
<question>Which authentication method should I use?</question>
<options>
<option><label>🍪 Cookies</label><value>cookies</value></option>
<option><label>🔑 JWT Tokens</label><value>jwt</value></option>
<option><label>📝 Session-based</label><value>session</value></option>
</options>
</ask_user_question>

[Bot sends NEW inline buttons]
```

**Turn 3: User clicks "🍪 Cookies"**

```
[System: Executes Claude with user's answer]

Claude: "Perfect! I'll implement cookie-based authentication with CSRF protection.

[Code changes...]

✅ Refactoring complete!"
```

**Session is STILL active** - User can send another message like "Now add rate limiting"

## Key Features

### 1. Session Persistence
The terminal session remains active until:
- User explicitly sends `/exit` command
- User hasn't sent a message in 10 minutes (cleanup interval)

### 2. Conversation History
All messages are stored in `conversationHistory` array:
- Limited to last 20 messages to avoid memory issues
- Includes both user messages and Claude responses
- Passed to Claude in each turn for context

### 3. Multi-Turn Approval Workflow
- Claude can ask multiple questions in sequence
- Each question is parsed and buttons are sent
- Session stays active throughout the entire workflow
- User can continue conversation after all approvals

### 4. AskUserQuestion Format
Claude must use this XML-like format:

```xml
<ask_user_question>
<question>Your question here?</question>
<options>
<option><label>Button Label</label><value>actual_value</value></option>
<option><label>Another Label</label><value>another_value</value></option>
</options>
</ask_user_question>
```

## Testing the Fix

### Test 1: Simple Question → Approval → Response
1. Start terminal session: `/start`
2. Send: "Create a new component"
3. Claude asks: "What type of component?"
4. Click: "Button component"
5. ✅ Claude creates the component
6. ✅ Session is still active

### Test 2: Multi-Turn Approval
1. Send: "Refactor the API"
2. Claude asks: "Should I proceed?" → Click "Yes"
3. Claude asks: "Which endpoints?" → Click "All endpoints"
4. Claude asks: "Add tests?" → Click "Yes"
5. ✅ Claude completes refactoring
6. ✅ Session is still active

### Test 3: Mixed Conversation
1. Send: "What files changed?"
2. ✅ Claude responds (no question)
3. Send: "Update the auth file"
4. Claude asks: "Are you sure?" → Click "Yes"
5. ✅ Claude updates the file
6. ✅ Session is still active

## Verifying Session State

To check if the session is active:
```bash
# Send /status command
```

Response:
```
📊 Session Status

• Terminal Session: ✅ Active
• Active Process: ❌ None
• Pending Question: ❌ None
• Messages in Session: 8

Use /exit to leave the session.
```

## Code Changes

**File:** `src/index.ts`

**Lines changed:** ~298-313

**Function affected:** Pending question handler in terminal session mode

**What changed:**
- Use `executeClaudeInTerminalMode` instead of `executeAndFormatClaude`
- Check if `claudeResult.needsAnswer` is true
- Only send response if no new question was asked

## Backward Compatibility

✅ All existing functionality preserved:
- Shell commands still work
- Normal mode (non-terminal) unchanged
- Single-turn conversations work as before
- Session management unchanged

## Future Enhancements

Possible improvements:
1. Add visual indicator (e.g., a dot) next to messages when in terminal session
2. Allow user to configure auto-hint messages
3. Add session timeout warning before cleanup
4. Support for more complex question types (multi-select, text input)
5. Session export/import functionality

## Troubleshooting

### "Session appears disconnected after response"
**Solution:** The session is still active! Just send another message. Use `/status` to verify.

### "Buttons don't appear when Claude asks a question"
**Check:**
1. Is Claude using the correct `<ask_user_question>` format?
2. Are there XML parsing errors in the logs?
3. Is the session still active? Check with `/status`

### "Can't continue after answering a question"
**Solution:** This should now be fixed. If it still happens:
1. Check logs for errors
2. Try `/exit` then `/start` to restart session
3. Report the issue with logs

## Summary

The fix ensures that **every response from Claude is parsed for AskUserQuestion tags**, enabling true multi-turn interactive workflows in terminal session mode. The session stays active throughout the entire conversation until explicitly exited.
