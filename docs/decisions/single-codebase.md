---
type: decision
title: "Personus Architecture: Single Codebase with Mastra"
description: "✅ ONE repository, ONE codebase ✅ Mastra agents live INSIDE Next.js (in /src/lib/mastra) ✅ Exposed via API routes for external access ✅ Used via Server Actions for UI"
status: current
tags: [decisions]
---

# Personus Architecture: Single Codebase with Mastra

## TL;DR: One Next.js App, Not Two

✅ **ONE repository, ONE codebase**  
✅ Mastra agents live INSIDE Next.js (in `/src/lib/mastra`)  
✅ Exposed via API routes for external access  
✅ Used via Server Actions for UI

❌ **NOT two separate codebases**

---

## Architecture Overview

```
personus-ai/                      # ONE REPOSITORY
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (authenticated)/      # UI Pages
│   │   │   ├── home/
│   │   │   ├── personas/
│   │   │   ├── traits/
│   │   │   └── discover/
│   │   │
│   │   ├── (public)/             # Public Pages
│   │   │
│   │   ├── api/                  # API Routes
│   │   │   ├── mcp/              # MCP server for external AI
│   │   │   │   └── route.ts
│   │   │   ├── graphql/          # GraphQL endpoint
│   │   │   │   └── route.ts
│   │   │   └── webhooks/         # Clerk, Stripe, etc.
│   │   │       └── clerk/
│   │   │
│   │   └── actions/              # Server Actions
│   │       └── agents.ts         # Agent interactions
│   │
│   └── lib/
│       ├── mastra/               # 🤖 MASTRA LIVES HERE
│       │   ├── index.ts          # Mastra instance
│       │   ├── tools.ts          # MCP tools
│       │   └── agents/           # AI agents
│       │       ├── persona-coach.ts
│       │       ├── recommender-and-discovery.ts
│       │       └── ...
│       │
│       ├── auth/                 # Auth abstraction
│       │   ├── provider.ts       # Interface
│       │   ├── clerk.ts          # Clerk implementation
│       │   └── index.ts          # Export
│       │
│       └── db/                   # Database
│           ├── schema.ts         # Drizzle schema
│           └── index.ts          # DB connection
│
└── package.json                  # ONE package.json
```

---

## How It Works

### 1. Mastra Configuration (ONE Time)

```typescript
// src/lib/mastra/index.ts
import { Mastra } from '@mastra/core';
import { personaCoachAgent } from './agents/persona-coach';

export const mastra = new Mastra({
  agents: [personaCoachAgent, recommenderCoachAgent, discoveryAgent],
  tools: [personaSearchTool, requestIntroTool],
});
```

This creates ONE Mastra instance that's shared across your entire app.

### 2. Usage Pattern A: Server Actions (UI → Agent)

```typescript
// src/app/actions/agents.ts
'use server';
import { personaCoachAgent } from '@/lib/mastra';

export async function chatWithCoach(message: string) {
  const response = await personaCoachAgent.generate(message);
  return response.text;
}
```

```typescript
// src/components/coach/voice-coach.tsx
'use client';
import { chatWithCoach } from '@/app/actions/agents';

export function VoiceCoach() {
  const handleSend = async () => {
    const response = await chatWithCoach(input);
    setMessages([...messages, response]);
  };
}
```

**Flow:**

```
Client Component → Server Action → Mastra Agent → Database → Response
```

### 3. Usage Pattern B: API Route (External → Agent)

```typescript
// src/app/api/mcp/route.ts
import { mastra } from '@/lib/mastra';

export async function POST(req: Request) {
  const { tool, params } = await req.json();
  const result = await mastra.executeTool(tool, params);
  return Response.json(result);
}
```

**Flow:**

```
Claude Desktop → HTTP POST /api/mcp → Mastra Tool → Database → Response
```

### 4. Usage Pattern C: Direct in Route Handler

```typescript
// src/app/api/agents/coach/route.ts
import { personaCoachAgent } from '@/lib/mastra';

export async function POST(req: Request) {
  const { message } = await req.json();
  const response = await personaCoachAgent.generate(message);
  return Response.json({ text: response.text });
}
```

---

## Data Flow Examples

### Example 1: User Chats with Persona Coach

```
1. User types message in UI
   ↓
2. Client Component calls Server Action: chatWithCoach(message)
   ↓
3. Server Action runs on server:
   - Authenticates user (Clerk)
   - Calls personaCoachAgent.generate(message)
   ↓
4. Mastra Agent:
   - Processes message with GPT-4
   - Calls tools if needed (updatePersonaField, checkPII)
   - Tools interact with database (Drizzle + Neon)
   ↓
5. Response flows back:
   Agent → Server Action → Client Component → UI
```

### Example 2: Claude Desktop Searches Personus

```
1. User asks Claude Desktop: "Find me a plumber"
   ↓
2. Claude Desktop calls MCP tool:
   POST https://personus.ai/api/mcp
   { tool: "personus_search", params: { query: "plumber" } }
   ↓
3. API route executes tool:
   - mastra.executeTool("personus_search", params)
   ↓
4. Tool queries database:
   - Semantic search with pgvector
   - Gets endorsements
   - Formats results
   ↓
5. Results return to Claude Desktop:
   API → Claude Desktop → User sees results
```

### Example 3: Voice Coach Creates Persona

```
1. User speaks to Coach (voice input)
   ↓
2. Voice → Text (browser API)
   ↓
3. Text → Server Action: chatWithCoach(text)
   ↓
4. Persona Coach Agent:
   - Detects PII (checkPIITool)
   - Extracts headline from message
   - Updates database (updatePersonaFieldTool)
   - Calculates completeness (getCompletenessTool)
   ↓
5. Response:
   - Text: "Great! I've captured that as your headline."
   - Tool results: { field: "headline", completeness: 42 }
   ↓
6. UI updates:
   - Shows message
   - Updates live preview
   - Shows completeness progress
```

---

## File Structure Mapping

### What Goes Where

| Component             | Location                  | Purpose                 |
| --------------------- | ------------------------- | ----------------------- |
| **Agent Definitions** | `src/lib/mastra/agents/`  | AI agent logic          |
| **Tool Definitions**  | `src/lib/mastra/tools.ts` | MCP tools               |
| **Mastra Instance**   | `src/lib/mastra/index.ts` | Central config          |
| **Server Actions**    | `src/app/actions/`        | UI ↔ Agent bridge       |
| **API Routes**        | `src/app/api/`            | External ↔ Agent bridge |
| **UI Components**     | `src/components/`         | React components        |
| **Database**          | `src/lib/db/`             | Drizzle + Neon          |

---

## Why Single Codebase?

### ✅ Advantages

1. **Shared Types**

   ```typescript
   // Define once, use everywhere
   import { Persona } from '@/lib/db/schema';

   // In agent:
   async function updatePersona(persona: Persona) { ... }

   // In UI:
   function PersonaCard({ persona }: { persona: Persona }) { ... }
   ```

2. **Shared Database Connection**

   ```typescript
   // One connection, used by UI, agents, and API
   import { db } from '@/lib/db';
   ```

3. **Shared Business Logic**

   ```typescript
   // Completeness calculation used everywhere
   import { computeCompleteness } from '@/lib/utils';
   ```

4. **Simpler Deployment**

   ```bash
   # ONE deployment
   vercel deploy

   # NOT two deployments:
   # vercel deploy --project=ui
   # vercel deploy --project=agents
   ```

5. **Easier Development**

   ```bash
   # ONE dev server
   bun run dev

   # NOT two terminals:
   # cd ui && bun run dev
   # cd agents && bun run dev
   ```

### ❌ No Disadvantages

"But what about separation of concerns?"

- **Agents are already separated** (in `/lib/mastra`)
- **Clear boundaries** (Server Actions vs API Routes)
- **Can still scale independently** if needed later

---

## Common Patterns

### Pattern 1: Agent → Database → UI

```typescript
// Agent updates database
const updatePersonaFieldTool = createTool({
  execute: async ({ personaUri, field, value }) => {
    await db.update(personas)
      .set({ [field]: value })
      .where(eq(personas.uri, personaUri));
    return { success: true };
  },
});

// UI reads from database (Server Component)
export default async function PersonaPage({ params }) {
  const persona = await db.query.personas.findFirst({
    where: eq(personas.uri, params.uri),
  });
  return <PersonaCard persona={persona} />;
}
```

### Pattern 2: Streaming Responses

```typescript
// Server Action with streaming
'use server';
export async function streamCoach(message: string) {
  const stream = await personaCoachAgent.stream(message);
  return stream;
}

// Client Component
('use client');
import { useChat } from 'ai/react';

export function ChatInterface() {
  const { messages, input, handleSubmit } = useChat({
    api: '/api/chat', // Or use Server Action
  });
}
```

### Pattern 3: Background Jobs

```typescript
// Queue agent task for background processing
import { mastra } from '@/lib/mastra';

export async function scheduleEndorsementProcessing(shadowId: string) {
  // Process endorsements in background
  await mastra.agents.recommenderCoach.generate(`Process endorsements for shadow ${shadowId}`, {
    mode: 'background',
  });
}
```

---

## MCP Server Setup

### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "personus-production": {
      "url": "https://personus.ai/api/mcp"
    },
    "personus-dev": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

### For ChatGPT (Future)

```json
{
  "tools": [
    {
      "type": "api",
      "name": "personus",
      "api": {
        "type": "openapi",
        "url": "https://personus.ai/api/mcp/openapi.json"
      }
    }
  ]
}
```

---

## Deployment

### Vercel (Recommended)

```bash
# Deploy everything at once
vercel

# Set environment variables in Vercel dashboard:
# - DATABASE_URL
# - CLERK_SECRET_KEY
# - OPENAI_API_KEY
```

### What Gets Deployed

```
Next.js App
├── Static pages (built at deploy time)
├── API routes (serverless functions)
│   ├── /api/mcp (Mastra tools)
│   ├── /api/graphql (GraphQL)
│   └── /api/webhooks (Clerk, etc.)
└── Server Actions (serverless functions)
    └── Agent interactions
```

All in ONE deployment!

---

## FAQ

**Q: Do I need to run Mastra separately?**  
A: No! Mastra is a library, not a server. It runs inside your Next.js app.

**Q: Can I scale agents independently?**  
A: Yes, if needed. Move agent code to separate API routes and scale those routes. But start with single codebase.

**Q: What about long-running agent tasks?**  
A: Use background jobs (Vercel Cron, Inngest, etc.) that call your agents. Agents still live in same codebase.

**Q: Can I use Mastra with other frameworks?**  
A: Yes! Mastra works with any Node.js framework. But Next.js is recommended for Personus.

---

## Summary

✅ **ONE codebase** (`personus-ai/`)  
✅ **Mastra in** `/src/lib/mastra/`  
✅ **Agents as modules**, not services  
✅ **Server Actions for UI**, API routes for external  
✅ **Shared database**, shared types, shared logic  
✅ **Deploy once** to Vercel

**This is the modern way.** 🚀
