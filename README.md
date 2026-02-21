# obsidian-vault-mcp

MCP server for AI agents to log insights and decisions during development.

Runs headless on a Mini PC (Proxmox LXC). Writes to an Obsidian Vault via rclone (Google Drive).

## Concept

**Agents write. Humans read.**

The server is a structured write endpoint. Agents append devlogs and ADRs as they work, scoped
by git repository and session. Reading, summarizing, and task management happen on
Obsidian-equipped machines.

## Prerequisites

- [Bun](https://bun.sh/) 1.0+
- Vault directory accessible at `VAULT_PATH`

## Install & Run

```sh
bun install
VAULT_PATH=/mnt/vault bun run src/index.ts
```

Copy `.env.example` to `.env` to persist environment variables.

## Dev

```sh
bun run src/index.ts   # dev (auto-loads .env, no build needed)
bun test               # run tests
bun build              # bundle to dist/ (optional, for production)
```

## MCP Registration

```sh
claude mcp add obsidian-vault --transport http http://<SERVER_IP>:1065/mcp
```

## Tools

| Tool | Description |
|------|-------------|
| `devlog_append` | Append structured log entries to a session devlog file |
| `devlog_tail` | Read the last N entries from a session devlog |
| `adr_write` | Create a new ADR (auto-numbered, content max 500 chars) |
| `adr_delete` | Delete an ADR by number |
| `adr_index` | List all ADRs for a repository |
| `adr_view` | Read a specific ADR |

See [AGENTS.md](./AGENTS.md) for full input/output specs.
