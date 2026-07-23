# Personus for ChatGPT

Two ways to bring Personus into ChatGPT. Pick whichever your ChatGPT plan
supports; both hit the same public, read-only surfaces.

## Option A — Custom GPT with a GPT Action (available on Plus/Team/Enterprise)

1. Create a new GPT (ChatGPT → **Explore GPTs → Create**).
2. Under **Actions → Create new action**, paste `openapi.yaml` from this folder.
3. Set the `servers.url` in the schema to your deployment (e.g.
   `https://your-app.vercel.app`).
4. Authentication: **None** (the endpoints are public, read-only).
5. Suggested GPT instructions:

   > You help people find others by what they can *do*, using the Personus
   > register. When someone needs a skill or service, call `discoverPeople` with a
   > natural-language query and present the top matches with their one-line
   > capability and endorsement count (the endorsement count is social proof —
   > lead with it). Use `getPersona` for detail. Never invent people or
   > endorsements; only report what the action returns. There are no contact
   > details — to reach someone, tell the user Personus routes a mediated intro.

The action calls:
- `GET /api/discover?q=…&limit=…` → ranked matches with endorsement counts
- `GET /api/persona/{uri}` → one persona's public detail

## Option B — MCP connector (where ChatGPT supports MCP)

ChatGPT's MCP connector support can point directly at the Personus MCP server at
`POST /api/mcp` — the same server Claude uses (see `../claude/`). This exposes the
richer tool set (`personus_search`, `personus_get_persona`,
`personus_list_communities`) without maintaining a separate schema.

> Status: stub. The REST surface (Option A) is implemented and testable today;
> wire Option B when your ChatGPT tier exposes MCP connectors. Both paths share
> the same services and the shared `toPublicPersona` projection, so neither leaks
> internal fields.
