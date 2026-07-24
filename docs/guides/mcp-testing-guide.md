---
type: guide
title: "Testing Personus MCP & AI Actions"
description: "This guide walks through testing the Personus MCP server from Claude Desktop and ChatGPT, plus direct curl verification. The goal is to experience the real consumer flow: an AI assistant discovers…"
status: current
tags: [guides]
---

# Testing Personus MCP & AI Actions

This guide walks through testing the Personus MCP server from **Claude Desktop** and **ChatGPT**, plus direct `curl` verification. The goal is to experience the real consumer flow: an AI assistant discovers people, shows their skills, and mediates introductions — all privacy-preserving.

---

## Prerequisites

### 1. Start the dev server

```bash
bun run dev
```

Confirm it's running at `http://localhost:3000`.

### 2. Enable MCP on at least one persona

1. Sign in at `http://localhost:3000`
2. Create a persona (or use an existing one) with some traits filled in — skills, experience, headline, etc. The richer the trait data, the more interesting the search results.
3. Go to **Settings → MCP Exposure**
4. Toggle **MCP Enabled** ON for the persona(s) you want discoverable
5. (Optional) Fine-tune which traits are visible in the per-persona trait visibility controls
6. (Optional) Toggle the AI Interaction Preferences (search matching, introductions, direct messages)

### 3. Generate embeddings

The search tool uses pgvector semantic search. If your persona doesn't have an embedding yet, the Persona Coach or the create/edit persona flow will generate one. You can verify a persona has an embedding by checking the persona detail page — the completeness score should be populated.

---

## Option A: Claude Desktop (MCP Protocol — Native)

Claude Desktop has native MCP support. It connects directly to your MCP server and exposes the 4 Personus tools as capabilities Claude can use during conversations.

### Setup

1. Open your Claude Desktop config file:

   ```bash
   # macOS
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json

   # Or create it if it doesn't exist
   mkdir -p ~/Library/Application\ Support/Claude
   cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
   {
     "mcpServers": {}
   }
   EOF
   ```

2. Add the Personus MCP server:

   ```json
   {
     "mcpServers": {
       "personus-dev": {
         "url": "http://localhost:3000/api/mcp"
       }
     }
   }
   ```

   For a deployed version (e.g., Vercel):

   ```json
   {
     "mcpServers": {
       "personus": {
         "url": "https://your-app.vercel.app/api/mcp"
       }
     }
   }
   ```

3. **Restart Claude Desktop** (Cmd+Q, then reopen). MCP servers are loaded at startup.

4. Verify: Click the **MCP tools icon** (hammer icon, bottom-left of the input area). You should see 4 Personus tools:
   - `personus_search`
   - `personus_get_persona`
   - `personus_request_introduction`
   - `personus_list_groups`

### Test Prompts

Start a new conversation in Claude Desktop and try these prompts. Claude will automatically invoke the Personus tools when relevant.

**Discovery prompts (triggers `personus_search`):**

> I'm looking for someone who knows React and has experience with accessibility.

> Can you find a UX designer who's open to freelance work?

> Who in Personus has machine learning expertise?

> I need someone who can help with fundraising strategy for a startup.

**Deep dive (triggers `personus_get_persona`):**

> Tell me more about [name from search results].

> What skills and experience does [persona name] have?

**Introduction flow (triggers `personus_request_introduction`):**

> I'd like to connect with [name]. Can you introduce me? I'm interested in collaborating on an open-source project.

> Please send an introduction request to [name] — I'm looking for a mentor in product design.

**Group exploration (triggers `personus_list_groups`):**

> What communities are available on Personus?

> Show me the groups I can search within.

**Multi-step conversation (the real consumer experience):**

> I'm building a health tech startup and need a technical co-founder. Can you search for someone with full-stack experience who's interested in health/biotech? If you find someone good, help me draft an introduction.

This should trigger search → get persona details → draft intro → send introduction request, all in a natural conversation flow.

---

## Option B: ChatGPT (Custom GPT with Actions)

ChatGPT doesn't support MCP directly, but you can create a **Custom GPT** that uses Personus via REST API "Actions."

### Expose localhost to the internet

ChatGPT needs a publicly accessible URL. Use a tunnel:

```bash
# Option 1: ngrok (recommended)
ngrok http 3000

# Option 2: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```

Note the public URL (e.g., `https://abc123.ngrok-free.app`). You'll need this below.

### Create the Custom GPT

1. Go to [ChatGPT → Explore GPTs → Create](https://chatgpt.com/gpts/editor)

2. **Configure tab:**
   - **Name:** `Personus - Trust Network Discovery`
   - **Description:** `Search professional trust networks, discover people by skills and expertise, and request privacy-preserving introductions.`
   - **Instructions** (paste this into the system instructions):

     ```
     You are a professional networking assistant powered by Personus, a trust-based
     professional discovery network. You help users find people, explore their
     skills and expertise, and facilitate privacy-preserving introductions.

     IMPORTANT BEHAVIORS:
     - When a user describes who they're looking for, ALWAYS use the searchPersonas
       action with a natural language query.
     - Present search results in a friendly, readable format — highlight the person's
       name, headline, key skills, and endorsement count.
     - When a user wants to learn more about someone, use getPersona to fetch their
       full profile.
     - ALWAYS ask for user confirmation before sending an introduction request.
       Draft the message first and let the user review/edit it.
     - Respect that all contact is mediated — you cannot provide direct contact info.
       Explain this naturally: "I can send a privacy-preserving introduction request
       and they'll decide whether to connect."
     - If search returns no results, suggest broadening the query or trying different
       terms.
     - Use listGroups to discover available communities when the user wants to narrow
       their search.

     TONE: Professional but warm. Think of yourself as a thoughtful colleague who
     knows a lot of people and loves making great introductions.
     ```

3. **Actions tab → Create new action:**
   - Click **"Import from URL"**
   - Enter: `https://YOUR-TUNNEL-URL/api/ai-actions/openapi.json`
   - (Replace `YOUR-TUNNEL-URL` with your ngrok/cloudflare URL)
   - The schema should auto-populate with 4 actions: searchPersonas, getPersona, requestIntroduction, listGroups
   - **Authentication:** None (for local testing)
   - **Privacy policy:** Leave blank for testing

4. Click **Save** (choose "Only me" for testing)

### Test Prompts

Same prompts as Claude Desktop above — the experience should be very similar. ChatGPT will call the Personus REST endpoints behind the scenes.

### After testing: clean up

When you're done, stop the ngrok tunnel. The GPT will stop working until you reconnect (which is expected for local dev).

---

## Option C: Verify with curl

Before using Claude Desktop or ChatGPT, you can verify the endpoints directly.

### MCP Protocol (JSON-RPC)

```bash
# List available tools
curl -s http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .

# Search for someone
curl -s http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "personus_search",
      "arguments": { "query": "React developer" }
    }
  }' | jq .

# Get a specific persona
curl -s http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "personus_get_persona",
      "arguments": { "personaUri": "YOUR-PERSONA-URI" }
    }
  }' | jq .
```

### REST API (ChatGPT Actions)

```bash
# Get the OpenAPI spec
curl -s http://localhost:3000/api/ai-actions/openapi.json | jq .info

# Search
curl -s http://localhost:3000/api/ai-actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "React developer"}' | jq .

# Get persona
curl -s http://localhost:3000/api/ai-actions/personas/YOUR-PERSONA-URI | jq .

# List groups
curl -s http://localhost:3000/api/ai-actions/groups | jq .

# Request introduction
curl -s http://localhost:3000/api/ai-actions/introductions \
  -H 'Content-Type: application/json' \
  -d '{
    "targetPersonaUri": "YOUR-PERSONA-URI",
    "reason": "collaboration",
    "message": "Hi! I would love to connect about a potential project."
  }' | jq .
```

---

## What to look for

When testing, verify these behaviors:

| Behavior                             | How to verify                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Only MCP-enabled personas appear** | Disable MCP on a persona in Settings, search again — it should disappear from results            |
| **Trait visibility is respected**    | Hide "skills" in the MCP trait visibility controls, search — skills should not appear in results |
| **AI preferences are respected**     | Disable "Search matching" in Settings — that persona should stop appearing in search             |
| **Introductions can be blocked**     | Disable "Introductions" in Settings — requesting an intro should return a polite refusal         |
| **Privacy is preserved**             | No email addresses, phone numbers, or direct contact info should ever appear                     |
| **Mediated contact works**           | After sending an intro request, check the Personus Inbox page — the request should appear        |

---

## Sample consumer scenario

Here's a full end-to-end test script that simulates a real user experience:

1. **User opens Claude/ChatGPT:** "I'm organizing a hackathon focused on AI for healthcare. I need to find judges — people with both AI/ML expertise and healthcare industry experience."

2. **AI searches Personus**, returns 2-3 matches with summaries.

3. **User asks:** "Tell me more about the first person."

4. **AI fetches full profile**, shows skills, experience, endorsements, offerings.

5. **User says:** "They look great. Can you introduce me? I'd like to invite them to judge our hackathon on March 15th."

6. **AI drafts an introduction message**, asks user to review.

7. **User confirms**, AI sends the mediated introduction request.

8. **User checks Personus inbox** — the request appears with the message, ready for the recipient to approve/decline.

---

## Troubleshooting

**Claude Desktop doesn't show Personus tools:**

- Make sure the dev server is running (`bun run dev`)
- Check the config file path is correct (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`)
- Restart Claude Desktop completely (Cmd+Q)
- Check Claude Desktop logs: `~/Library/Logs/Claude/` for connection errors

**Search returns no results:**

- Verify at least one persona has MCP enabled (Settings → MCP Exposure)
- Verify the persona has an embedding (check `bun run db:studio` → personas table → embedding column is not null)
- Verify the persona has traits populated (skills, experience, etc.)
- Check the persona owner's `searchMatching` preference is enabled

**ChatGPT can't reach the server:**

- Ensure your tunnel (ngrok/cloudflare) is running and the URL is correct
- ChatGPT may block some tunnel domains — try a different provider if one doesn't work
- Check the OpenAPI spec loads: visit `https://YOUR-TUNNEL-URL/api/ai-actions/openapi.json` in your browser

**Introduction request fails:**

- Check the persona has MCP enabled
- Check the persona owner has "Introductions" enabled in AI preferences
- Check the `contact_requests` table for error details

**"Persona not found" when it exists:**

- The persona likely has `mcpEnabled = false`. Go to Settings → MCP Exposure and enable it.
