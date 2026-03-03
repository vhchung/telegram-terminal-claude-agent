# Terminal Session Mode - Quick Start Guide

## Overview

The Terminal Session Mode allows you to have persistent, interactive conversations with Claude directly through Telegram. This is perfect for complex tasks that require back-and-forth discussion.

## Getting Started

### 1. Start a Terminal Session

Send the `/start` command to your bot:

```
/start
```

You'll see a confirmation message:
```
🖥 Terminal Session Started

You are now in interactive mode with Claude. Send any message to:
• Ask questions
• Request code changes
• Run terminal commands

Claude can ask you questions and present options.

Commands:
• /exit - Leave terminal session
• /status - Show session status
```

### 2. Interact with Claude

Now you can send messages naturally:

```
You: Help me understand the current project structure

Claude: [Analyzes and explains your codebase]
```

```
You: Refactor the auth module to use JWT tokens

Claude: [Makes the changes and explains what was done]
```

### 3. Answer Claude's Questions

When Claude needs clarification, it will present options:

```
Claude: ❓ Claude asks:

    Which authentication method would you like?

    [JWT Token] [Session Cookie] [API Key]
```

Simply tap a button to answer.

### 4. Continue the Conversation

Keep chatting naturally:

```
You: That looks good. Can you also add refresh token support?

Claude: [Adds refresh token functionality]
```

```
You: Actually, let's go with session cookies instead

Claude: [Updates the implementation]
```

### 5. Check Session Status

Use `/status` to see your current session:

```
/status
```

Response:
```
📊 Session Status

• Terminal Session: ✅ Active
• Active Process: ❌ None
• Pending Question: ❌ None
• Messages in Session: 12

Use /exit to leave the session.
```

### 6. Exit When Done

```
/exit
```

Response:
```
👋 Terminal session ended. Use /start to enter again.
```

## Key Features

### ✅ Conversation History
- Claude remembers everything discussed in the current session
- Context is maintained across multiple messages
- Makes complex discussions easier

### ✅ Interactive Questions
- Claude can ask clarifying questions
- Options presented as tappable buttons
- Natural back-and-forth flow

### ✅ No Approval Needed
- In terminal mode, you're in control
- No confirmation prompts for each action
- Faster iteration on tasks

### ✅ Real-time Feedback
- See Claude's thinking process
- Get immediate responses
- Quick question/answer cycles

## Use Cases

### 1. Pair Programming
```
You: Let's add a new feature for user notifications

Claude: What type of notifications?
[Email] [SMS] [Push] [In-app]

You: [Tap Push]

Claude: I'll implement push notifications using Firebase.
[Makes code changes]

Claude: Done! I've also added user preferences.
```

### 2. Code Exploration
```
You: Explain how the authentication flow works

Claude: [Detailed explanation]

You: Show me the token validation logic

Claude: [Shows specific code and explains]

You: Can we improve the error handling?

Claude: [Proposes and implements improvements]
```

### 3. Refactoring
```
You: This function is getting too long

Claude: Which part would you like to extract?
[Validation] [Data processing] [Error handling]

You: [Tap Validation]

Claude: [Extracts validation into separate function]

Claude: Should I add unit tests for the new function?
[Yes] [No]

You: [Tap Yes]

Claude: [Adds comprehensive tests]
```

### 4. Debugging
```
You: The API is returning 500 errors

Claude: Let me check the logs... [Examines code]

Claude: I found the issue. The database query is missing error handling.
Should I:
[Add error handling] [Refactor the query] [Both]

You: [Tap Both]

Claude: [Implements both fixes]
```

## Tips

### Start Broad, Then Specific
```
Good: "Improve the performance of the search feature"
Better: "Add caching to the search results"
```

### Reference Previous Messages
```
You: Can you apply the same validation you added earlier to this new endpoint?
Claude: [Understands context from earlier in session]
```

### Ask for Alternatives
```
You: What are different ways to implement this?
Claude: [Presents options as buttons]
```

### Provide Feedback
```
You: That approach is too complex. Can you simplify it?
Claude: [Simplifies the implementation]
```

## Differences from Normal Mode

| Normal Mode | Terminal Session Mode |
|------------|----------------------|
| Each message analyzed separately | Maintains conversation history |
| Claude actions require approval | No approval needed (you're in control) |
| Best for quick commands | Best for complex tasks |
| One-shot interactions | Ongoing collaboration |

## Troubleshooting

### Session seems stuck?
- Send `/status` to check for active processes
- Wait for current operation to complete
- Use `/exit` to leave and `/start` to re-enter

### Can't answer a question?
- Questions disappear after you tap an option
- If you missed it, just send a new message with your answer

### Claude forgot context?
- Session history is limited to last 20 messages
- Use `/exit` and `/start` to begin fresh
- Summarize important context again

## Best Practices

1. **Be Specific**: Clear requests get better results
2. **Provide Context**: Claude remembers the conversation
3. **Ask Questions**: Use Claude's questions to guide the work
4. **Iterate**: Refine and adjust as you go
5. **Review**: Check changes before finalizing

## Example Session

```
You: /start

Bot: [Session started]

You: I want to add user profile management

Claude: I can help with that. What features do you need?
- Profile editing
- Avatar upload
- Password change
- [All of the above]

You: [Tap All of the above]

Claude: [Creates user profile system with all features]

Claude: Should I also add email verification?
[Yes] [No]

You: [Tap Yes]

Claude: [Adds email verification]

You: Great! Can you also add admin approval for new users?

Claude: [Implements admin approval workflow]

Claude: Done! The user profile system is complete with:
• Profile editing and avatar upload
• Password change with email verification
• Admin approval for new accounts

You: /exit

Bot: [Session ended]
```

## Support

If you encounter issues:
1. Check `/status` for session information
2. Review logs for errors
3. Exit and re-enter session mode
4. Check the main README for general troubleshooting
