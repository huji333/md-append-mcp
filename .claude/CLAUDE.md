# obsidian-vault-mcp — Claude Code Guide

MCP server that logs AI agent insights and decisions to Obsidian Vault (Google Drive via rclone).
Runs headless on a Mini PC (Proxmox LXC).

## Development Commands

```sh
bun run src/index.ts   # dev（.env 自動ロード、ビルド不要）
bun test               # テスト実行
bun build              # dist/ にバンドル（本番デプロイ用、任意）
```

## MCP Registration

```sh
claude mcp add obsidian-vault --transport http http://<LXC_IP>:1065/mcp
```

## Skills

### `/devlog`

Append structured log entries to the session devlog.

- **session_id**: Generate once at session start as `YYYYMMDD-HHMM`. Reuse for all devlog calls in this conversation.
- **repository_name**: Infer from git repo name (`basename` of git root) or CLAUDE.md context.

### `/adr`

Record an architectural decision. Draft from conversation context, then call `adr_write`.
Content must be under 500 chars — keep ADRs concise.
