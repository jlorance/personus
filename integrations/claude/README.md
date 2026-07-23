# Personus for Claude

Use Personus — the register of the capable — directly from Claude (Desktop or
Code). Two pieces:

1. **The MCP server** gives Claude the tools (`personus_search`, `personus_get_persona`, `personus_list_communities`).
2. **The skills** in `skills/` teach Claude *when and how* to use them well.

## 1. Add the MCP server

Claude Code:

```bash
claude mcp add --transport http personus https://your-app.vercel.app/api/mcp
```

Claude Desktop — add to `claude_desktop_config.json` (see `mcp.json` here):

```json
{
  "mcpServers": {
    "personus": { "url": "https://your-app.vercel.app/api/mcp" }
  }
}
```

Anonymous access is public-read only. (Authenticated, higher-trust access via a
bearer token is a later addition.)

## 2. Install a skill

Copy a folder from `skills/` into your Claude skills directory (e.g.
`~/.claude/skills/`), or point your project's skills config at it. Each skill is
a self-contained `SKILL.md`.

- **personus-discovery** — find people by capability and draft warm intros.
