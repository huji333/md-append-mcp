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
      // VAULT_PATH on the server should point to the claude/ subdirectory of your vault
    }
  }
}
```

Replace `<LXC_IP>` with your Proxmox LXC's IP (or Tailscale address).

## Available Tools

### `note_read`

Read a markdown note from the vault by its relative path.

```
input:  { path: string }              // e.g. "devlog/2024-01-01.md"
output: { content: string, exists: boolean }
```

### `note_upsert`

Create a note (with optional frontmatter) if it doesn't exist, or append to it if it does.

```
input:  { path: string, content: string, frontmatter?: Record<string, unknown> }
output: { created: boolean }          // true = new file, false = appended
```

### `vault_search`

Full-text search across the vault using ripgrep.

```
input:  { query: string, path_filter?: string }   // path_filter is a glob, e.g. "devlog/*.md"
output: { results: Array<{ path: string, line: number, text: string }> }
```

## Skill Integration

### `/devlog`

Records session friction, insights, and progress. Uses `note_upsert` to append to `devlog/{topic-slug}.md`.

### `/adr`

Records an architectural decision to `adr/ADR-NNN-slug.md`. Uses `note_upsert` to create the ADR file with frontmatter.

Both skills require this MCP server to be registered and reachable.
