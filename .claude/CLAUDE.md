# obsidian-vault-mcp — Claude Code Guide

MCP server that exposes an Obsidian Vault (Google Drive via rclone) to Claude Code over LAN.

## Development Commands

```sh
npm run build      # tsc → dist/
npm run dev        # tsx src/index.ts (no build step)
```

## Registering the MCP Server

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "obsidian-vault": {
      "type": "http",
      "url": "http://<LXC_IP>:1065/mcp"
    }
  }
}
```

`VAULT_PATH` on the server should point to the `claude/` subdirectory of your Obsidian Vault.

## Skills

### `/orient`

Load recent context (AGENTS.md + devlog). **Suggest proactively** at session start or when context feels stale.

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
