# LLM Provider Configuration Guide

This bot supports multiple LLM providers for intent analysis. You can switch between providers to avoid rate limits or optimize for cost/speed.

## Supported Providers

### 1. Gemini (Google Generative AI)

**Best for:** Complex reasoning tasks

**Models:**
- `gemini-2.5-flash` - Fast, efficient (recommended)
- `gemini-1.5-pro` - More capable, slower
- `gemini-1.5-flash` - Balanced

**Setup:**
```env
PROVIDER=gemini
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

**Get API Key:** [Google AI Studio](https://makersuite.google.com/app/apikey)

**Rate Limits:**
- Free tier: 15 requests per minute
- Paid tier: Higher limits available

---

### 2. Groq

**Best for:** Fast responses, high volume requests

**Models:**
- `llama-3.3-70b-versatile` - Best balance (recommended)
- `llama-3.1-70b-versatile` - Previous version, still excellent
- `mixtral-8x7b-32768` - Good for complex reasoning
- `gemma2-9b-it` - Lightweight, very fast

**Setup:**
```env
PROVIDER=groq
GROQ_API_KEY=your_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

**Get API Key:** [Groq Console](https://console.groq.com/keys)

**Rate Limits:**
- Free tier: 30 requests per minute (varies by model)
- Much more generous than Gemini

---

## Quick Switch Guide

### Switching from Gemini to Groq

1. Get a Groq API key from [console.groq.com](https://console.groq.com/keys)
2. Update your `.env` file:
   ```env
   # Comment out or remove Gemini config
   # GEMINI_API_KEY=...
   # GEMINI_MODEL=...

   # Add Groq config
   PROVIDER=groq
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
3. Restart the bot:
   ```bash
   pm2 restart telegram-claude-bot
   ```

### Switching from Groq to Gemini

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Update your `.env` file:
   ```env
   # Comment out or remove Groq config
   # GROQ_API_KEY=...
   # GROQ_MODEL=...

   # Add Gemini config
   PROVIDER=gemini
   GEMINI_API_KEY=...
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. Restart the bot:
   ```bash
   pm2 restart telegram-claude-bot
   ```

---

## Performance Comparison

| Metric | Gemini 2.5 Flash | Groq Llama 3.3 70b |
|--------|------------------|-------------------|
| **Response Time** | ~1-2 seconds | ~0.5-1 second |
| **Free Tier Rate Limit** | 15 req/min | 30 req/min |
| **Context Window** | 1M tokens | 128K tokens |
| **JSON Mode** | Manual (parsing required) | Native (better reliability) |
| **Cost** | Free tier generous | Free tier very generous |

---

## Troubleshooting

### "Missing command parameter" error

This error occurs when the LLM doesn't properly structure the JSON response. It's more common with Gemini than Groq because Groq has native JSON mode support.

**Solution:** Switch to Groq for more reliable JSON responses.

### Rate limit errors

If you see rate limit errors:

1. **Check current provider:**
   ```bash
   pm2 logs telegram-claude-bot --lines 20
   ```

2. **Switch to the other provider** (see Quick Switch Guide above)

3. **Wait a few minutes** before retrying with the same provider

### Provider fallback

If you configure an unknown provider, the bot will automatically fall back to Gemini with a warning:

```
⚠️  Unknown provider: xxx, falling back to Gemini
✓ LLM Provider: Gemini (gemini-2.5-flash) [fallback]
```

---

## Recommendations

### For Development/Testing
Use **Groq** with `llama-3.3-70b-versatile` for fast iteration.

### For Production
- Start with **Groq** (faster, higher limits)
- Switch to **Gemini** if you need:
  - Longer context (1M tokens vs 128K)
  - More advanced reasoning capabilities
- Consider implementing automatic failover in the future

### For High-Volume Usage
- Monitor your usage logs
- Switch providers when approaching rate limits
- Consider caching common queries to reduce API calls

---

## Example Configurations

### Development (Fast, Free)
```env
PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Production (Reliable)
```env
PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Keep Gemini as backup
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
```

### Advanced Reasoning (When needed)
```env
PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-pro
```
