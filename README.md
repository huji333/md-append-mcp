# obsidian-vault-mcp

MCP server for Obsidian Vault access over LAN. Runs as a Streamable HTTP server on a Proxmox LXC that mounts Google Drive via rclone.

## Prerequisites

- Node.js 20+
- [ripgrep](https://github.com/BurntSushi/ripgrep) (`rg` in PATH)
- Vault directory accessible at the path you'll set in `VAULT_PATH`

## Install & Build

```sh
npm install
npm run build
```

## Run

```sh
VAULT_PATH=/mnt/vault PORT=1065 node dist/index.js
```

The server listens on `http://0.0.0.0:<PORT>/mcp`.

Copy `.env.example` to `.env` to persist environment variables if needed.

## Dev Mode

```sh
VAULT_PATH=/mnt/vault npx tsx src/index.ts
```

## Testing

```sh
npm test
```

Unit tests cover `vault.ts` (path safety, read/upsert/delete) and `vault_search` (result parsing, exit-code handling, `path_filter` glob normalization). No live vault or ripgrep binary is required — filesystem operations use a temp directory and `execFile` is mocked.

## Tools

All tools are exposed at `POST /mcp` via MCP Streamable HTTP.

| Tool | Description |
|------|-------------|
| `note_read` | Read a note by vault-relative path. Returns `{ content, exists }`. |
| `note_upsert` | Create a note (with optional frontmatter) or append to an existing one. Returns `{ created }`. |
| `note_delete` | Delete a note. Returns `{ deleted }` (false if not found, no error). |
| `vault_search` | Full-text search with ripgrep. Accepts `query` (regex) and optional `path_filter` (glob). |

See [`AGENTS.md`](./AGENTS.md) for full input/output specs.
