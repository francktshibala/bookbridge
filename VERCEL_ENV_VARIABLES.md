# Vercel Environment Variables for BookBridge

## Required Variables (Add in Vercel Dashboard)

```bash
# Supabase (from your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI Services
ANTHROPIC_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional but Recommended
ENABLE_MULTI_AGENT=true
```

## Optional Premium Features

```bash
# Vector Search (for semantic search)
PINECONE_API_KEY=your-pinecone-key

# Premium Voice (for human-like TTS)
ELEVENLABS_API_KEY=your-elevenlabs-key
```

## How to Add in Vercel

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable with its value
4. Select "Production", "Preview", and "Development" for all
5. Click "Save"

## Getting Your Keys

### Supabase
1. Go to your Supabase project
2. Settings → API
3. Copy "URL" and "service_role" secret

### Anthropic (Claude)
1. Visit https://console.anthropic.com/
2. Create API key

### OpenAI
1. Visit https://platform.openai.com/
2. API Keys → Create new key

### Pinecone (Optional)
1. Visit https://www.pinecone.io/
2. Sign up for free tier
3. Get API key from dashboard

### ElevenLabs (Optional - Premium Voice)
1. Visit https://elevenlabs.io/
2. Sign up ($22/month for premium voices)
3. Get API key from profile