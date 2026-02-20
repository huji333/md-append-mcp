# obsidian-vault-mcp — Agent Specification

MCP server that exposes an Obsidian Vault to AI agents over HTTP (LAN or Tailscale).
Runs on a Proxmox LXC that mounts Google Drive via rclone.

---

## Architecture

```
AI Agent (Claude Code, etc.)
  ↓ MCP Streamable HTTP  (port 1065)
Node.js MCP Server  (src/index.ts)
  ↓ fs + gray-matter
VAULT_PATH  (rclone mount → Google Drive / Obsidian Vault)
```

Transport: MCP Streamable HTTP with session management.
Each `initialize` request creates a new `McpServer` + `StreamableHTTPServerTransport`.
Sessions are tracked in a `Map<sessionId, transport>` keyed by the `mcp-session-id` header.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAULT_PATH` | yes | — | Absolute path to the vault root on the server |
| `PORT` | no | `1065` | HTTP port to listen on |

---

## Tools

### `note_read`

Read a markdown note by vault-relative path.

```
input:  { path: string }
output: { content: string, exists: boolean }
```

- Returns `{ exists: false, content: "" }` if the file does not exist (no error).
- Path traversal (`..`) is rejected with an error.

---

### `note_upsert`

Create a note if it does not exist, or append to it if it does.

```
input:  { path: string, content: string, frontmatter?: Record<string, unknown> }
output: { created: boolean }   // true = new file created, false = appended
```

- On **create**: writes `frontmatter` (YAML) + `content` using gray-matter. Parent directories are created automatically.
- On **append**: appends `\n` + `content` to the end of the existing file. Frontmatter is ignored.
- Path traversal is rejected.

---

### `vault_search`

Full-text search across the vault using ripgrep.

```
input:  { query: string, path_filter?: string }
output: { results: Array<{ path: string, line: number, text: string }> }
```

- `query` is a ripgrep regex pattern.
- `path_filter` is an optional glob (e.g. `devlog/*.md`) passed as `rg --glob`.
- Returns `{ results: [] }` when no matches found (ripgrep exit code 1 is not an error).
- `path` in results is relative to `VAULT_PATH`.

---

## Vault Folder Convention

`VAULT_PATH` should point to a **subdirectory** of the Obsidian Vault (e.g. `/mnt/vault/claude`),
not the vault root. This physically sandboxes the server from personal notes.

```
Obsidian Vault/          ← vault root (MCP cannot touch this)
└── claude/              ← VAULT_PATH points here
    ├── _index.md        # ADR index table (append-only)
    ├── devlog/
    │   └── {topic-slug}.md   # one file per topic, append-only entries
    └── adr/
        └── ADR-{NNN}-{slug}.md   # one file per decision
```

All tool paths are relative to `VAULT_PATH`, so skills use short paths like
`devlog/topic.md` and `adr/ADR-001-slug.md` (no `claude/` prefix needed).

**Frontmatter conventions:**

`devlog/{topic-slug}.md`:
```yaml
tags: [devlog]
topic: {topic-slug}
project: {project-name}
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

`adr/ADR-{NNN}-{slug}.md`:
```yaml
tags: [adr, accepted]
adr: {N}
date: YYYY-MM-DD
status: accepted | proposed
project: {project-name}
related: []
```

---

## Security

- No authentication in the server itself (auth-agnostic by design).
- Network-layer security delegated to Tailscale or Cloudflare Zero Trust.
- Path traversal (`..`) blocked in `resolveSafePath()`.

---

## Implementation Status

### Phase 1 — Complete (2026-02-20)

- [x] `note_read` / `note_upsert` / `vault_search` tools
- [x] Session-based Streamable HTTP transport (`randomUUID` session IDs)
- [x] Path traversal protection
- [x] `.claude/` repo structure (CLAUDE.md, skills/devlog.md, skills/adr.md)
- [x] End-to-end verified locally against real Obsidian Vault

### Phase 2 — Not implemented

- `vault_sync` — trigger rclone pull
- `link_add` / `backlinks_search` / `graph_neighbors` — wikilink operations
- ADR write-back to GitHub (`docs/adr/`) via gh CLI or GitHub MCP
- systemd service + Caddy reverse proxy setup

---

## Key Implementation Notes

**Stateless transport is not reusable.**
The SDK throws `"Stateless transport cannot be reused across requests."` if the same transport handles a second request. Use session mode: pass `sessionIdGenerator: () => randomUUID()` and create a fresh `McpServer` + transport per `initialize` request.

**`callTool` takes an object, not positional args.**
```js
// correct
client.callTool({ name: 'vault_search', arguments: { query: 'devlog' } });
```

**Responses are SSE, not plain JSON.**
MCP Streamable HTTP responses use `event: message\ndata: {...}` format. Raw `curl | jq` will fail; use the MCP SDK client or an SSE parser.
