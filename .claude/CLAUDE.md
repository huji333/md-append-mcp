# obsidian-vault-mcp — Claude Code Guide

MCP server that exposes an Obsidian Vault (Google Drive via rclone) to Claude Code over LAN.

## Development Commands

```sh
bun run src/index.ts   # dev（.env 自動ロード、ビルド不要）
bun test               # テスト実行
bun build              # dist/ にバンドル（本番デプロイ用、任意）
```

## Registering the MCP Server

Use `claude mcp add` (stored in `~/.claude.json`, not `settings.json`):

```sh
# Obsidian Vault (HTTP, LXC server)
claude mcp add obsidian-vault --transport http http://<LXC_IP>:1065/mcp

# GitHub (stdio, local binary)
claude mcp add github -- sh -c 'GITHUB_PERSONAL_ACCESS_TOKEN=$(gh auth token) ~/.local/bin/github-mcp-server stdio'
```

`VAULT_PATH` on the server should point to the `claude/` subdirectory of your Obsidian Vault.

## Skills

### `/catchup`

Load recent context (AGENTS.md + devlog + tmp/ handoff notes). **Suggest proactively** at session start or when context feels stale.

### `/devlog`

Append to `devlog/{topic}.md`. Log **as events happen** — do not wait for user invocation.

| Trigger | Tag |
|---------|-----|
| Error, unexpected behavior, or dead end | `[problem] YYYY-MM-DD  {issue} → {resolution or "未解決"}` |
| Feature, fix, or change implemented | `[impl]    YYYY-MM-DD  {what}` |
| Tool or flow confirmed working | `[verify]  YYYY-MM-DD  {what}` |
| Non-obvious fact discovered | `[insight] YYYY-MM-DD  {what}` |

**`[problem]` especially**: log every non-trivial error, even if resolved quickly.
Target file: infer from project context; use `vault_search` if unsure.

### `/adr`

Record an architectural decision to `adr/ADR-NNN-{slug}.md`.

## MCP vs Obsidian CLI

| Layer | Tool | When to use |
|-------|------|-------------|
| Read / Append (device-agnostic) | `obsidian-vault` MCP (LXC) | Skills (`/adr`, `/devlog`, `/catchup`), always-on |
| Edit (Mac-only) | `obsidian` CLI | Task edit ops (`task_done`, `task_toggle`) — requires Obsidian app running |

Skills use MCP exclusively. Obsidian CLI is reserved for Mac-side edit operations (see ADR-012).
