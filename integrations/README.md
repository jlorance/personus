# Personus integrations

Personus exposes its discovery capabilities to external AI assistants through two
open surfaces, so users can reach it from whichever assistant they already use:

| Surface        | Protocol            | Endpoint                         | Best for                          |
| -------------- | ------------------- | -------------------------------- | --------------------------------- |
| **MCP**        | JSON-RPC 2.0        | `POST /api/mcp`                  | Claude (Desktop/Code), MCP clients |
| **REST**       | HTTP + OpenAPI      | `GET /api/discover`, `/api/persona/{uri}` | ChatGPT GPT Actions, plain HTTP |

Both are anonymous + public-read only and gated behind the `features.mcp_enabled`
flag. Persona responses use one shared curated projection (`toPublicPersona`) — no
internal fields leak on any surface.

- `claude/` — a directory of Claude **skills** + the MCP server config users add.
- `chatgpt/` — an OpenAPI schema + guide for a ChatGPT custom GPT (GPT Actions),
  plus notes on ChatGPT's native MCP connector path.
