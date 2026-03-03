# Tool Selection Rule - "Claude" Keyword Requirement

## Problem

Simple requests like "Refactor auth" or "Add error handling" were incorrectly triggering `propose_claude_action`, even when the user didn't explicitly want to use Claude Code. This caused unnecessary approval workflows for simple tasks that could be handled with shell commands.

## Solution

**New Rule:** `propose_claude_action` will **ONLY** be activated when the user explicitly mentions "claude" in their message.

## Tool Selection Logic

### Decision Flow

```
User message received
    ↓
Does message contain "claude"? (case-insensitive)
    ↓
    ├─ YES → propose_claude_action
    │          (User wants Claude Code assistance)
    │
    └─ NO → Is it a shell command?
              ↓
              ├─ YES → execute_shell
              │          (git, ls, cat, etc.)
              │
              └─ NO → Conversational response
                       (greetings, thanks, chat)
```

## Examples

### ✅ Will trigger `propose_claude_action`

- "claude, refactor the auth code"
- "ask claude to add error handling"
- "get claude to create a new component"
- "Claude, fix the bug in the API"
- "can claude update the README?"

### ✅ Will trigger `execute_shell`

- "git status"
- "list files"
- "current branch"
- "show recent commits"
- "check disk space"
- "whoami"
- "ls -la"

### ✅ Will trigger conversational response

- "hello"
- "thanks"
- "how are you?"
- "what can you do?"

## Before vs After

### Before (Incorrect Behavior)

| User Message | Tool Selected | Problem |
|-------------|--------------|---------|
| "Refactor auth" | propose_claude_action | ❌ User didn't ask for Claude |
| "Add error handling" | propose_claude_action | ❌ Unnecessary approval flow |
| "git status" | execute_shell | ✅ Correct |
| "list files" | execute_shell | ✅ Correct |

### After (Correct Behavior)

| User Message | Tool Selected | Result |
|-------------|--------------|--------|
| "Refactor auth" | Conversational | ✅ Asks for clarification |
| "claude, refactor auth" | propose_claude_action | ✅ User explicitly wants Claude |
| "git status" | execute_shell | ✅ Executes directly |
| "list files" | execute_shell | ✅ Executes directly |
| "hello" | Conversational | ✅ Friendly response |

## Benefits

1. **Clearer Intent**: Users must explicitly mention "claude" to use Claude Code
2. **Faster for Simple Tasks**: No unnecessary approval workflows
3. **Better UX**: Users know exactly what they're asking for
4. **Less Confusion**: No ambiguity about which tool will be used

## How to Use Claude Code

### Method 1: Explicit Keyword (Recommended)
```
User: "claude, refactor the authentication code"

Bot: [Proposes Claude action with confirmation buttons]
```

### Method 2: Natural Language
```
User: "ask claude to fix the bug"

Bot: [Proposes Claude action with confirmation buttons]
```

### Method 3: Terminal Session Mode
```
User: /start
Bot: [Terminal session started]
User: "refactor auth"
Bot: [Directly uses Claude without approval flow]
```

## Code Changes

### Files Modified

1. **src/agents/gemini.ts**
   - Updated `SYSTEM_INSTRUCTION` prompt
   - Updated user prompt in `analyzeUserMessage()`
   - Added critical rule: Check for "claude" keyword

2. **src/agents/groq.ts**
   - Updated `systemPrompt` in `analyzeUserMessage()`
   - Updated `userPrompt`
   - Added critical rule: Check for "claude" keyword

### Prompt Changes

**Added to system prompts:**
```text
2. **propose_claude_action**: ONLY when user explicitly mentions "claude" or asks for AI assistance with code. Examples:
   - "claude, refactor auth" → propose_claude_action
   - "ask claude to fix the bug" → propose_claude_action

**CRITICAL RULE - When to use propose_claude_action:**
- MUST check: Does the user message contain the word "claude" (case-insensitive)?
- If YES → use propose_claude_action
- If NO → use execute_shell or conversational response
```

## Testing

### Test Case 1: Without "Claude" Keyword
```
Input: "Refactor the auth module"
Expected: Conversational response or execute_shell (if applicable)
Actual: ✅ Conversational response asking for clarification
```

### Test Case 2: With "Claude" Keyword
```
Input: "claude, refactor the auth module"
Expected: propose_claude_action
Actual: ✅ propose_claude_action with confirmation buttons
```

### Test Case 3: Simple Shell Command
```
Input: "git status"
Expected: execute_shell with command "git status"
Actual: ✅ Executes git status directly
```

### Test Case 4: Mixed Case Keyword
```
Input: "CLAUDE, fix this bug"
Expected: propose_claude_action
Actual: ✅ propose_claude_action (case-insensitive)
```

### Test Case 5: Conversational
```
Input: "hello"
Expected: Conversational response
Actual: ✅ Friendly greeting response
```

## Migration Guide

### For Existing Users

**No breaking changes!** However, you'll need to adjust your workflow:

**Old way:**
```
User: "Refactor auth"
Bot: [Proposes Claude action]
```

**New way:**
```
User: "claude, refactor auth"
Bot: [Proposes Claude action]
```

### Alternative: Use Terminal Session Mode

For frequent Claude interactions, use terminal session mode:

```
User: /start
Bot: [Terminal session started]
User: "Refactor auth"  [No "claude" keyword needed!]
Bot: [Uses Claude directly]
```

In terminal session mode, ALL messages go to Claude without needing the keyword.

## FAQ

**Q: What if I forget to say "claude"?**

A: The bot will respond conversationally or ask for clarification. You can then rephrase with "claude" in your message.

**Q: Can I still use terminal session mode?**

A: Yes! In terminal session mode (`/start`), you don't need the "claude" keyword. Every message goes directly to Claude.

**Q: Is this case-sensitive?**

A: No. "claude", "Claude", "CLAUDE" all work.

**Q: What about simple commands like "git status"?**

A: These will execute directly without any approval flow. Much faster!

**Q: Can I use synonyms like "ai" or "assistant"?**

A: Currently, no. Only "claude" will trigger the action. This keeps the behavior predictable.

## Summary

This change makes tool selection more predictable and user-friendly:
- ✅ Explicit intent with "claude" keyword
- ✅ Faster execution for simple commands
- ✅ Clear separation between shell commands and Claude Code
- ✅ Better user experience overall
