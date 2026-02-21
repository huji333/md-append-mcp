# obsidian-vault-mcp — Agent Specification

MCP server that exposes an Obsidian Vault to AI agents over HTTP (LAN or Tailscale).
Runs on a Proxmox LXC that mounts Google Drive via rclone.

## Architecture

```
AI Agent (Claude Code, etc.)
  ↓ MCP Streamable HTTP  (port 1065)
Bun MCP Server  (src/index.ts)              ← Mini PC / LXC (headless)
  controller/   ← MCP tool 登録・Zod スキーマ（tool 1本 = 1ファイル）
  usecase/      ← パス解決・ビジネスロジック（create/append 分岐など）
  repository/   ← 生 fs 操作（abs path）
  service/      ← ripgrep ラッパー
  ↓ fs + gray-matter / rg
VAULT_PATH  (rclone mount → Google Drive / Obsidian Vault)
```

Task operations are split by access pattern across two hosts:

| Access pattern | Host | MCP server | Tools |
|---|---|---|---|
| Read / Append | Mini PC (LXC, this repo) | `obsidian-vault-mcp` | `note_*`, `vault_search`, `task_list`, `task_add` |
| Edit | Mac (on-demand, Obsidian running) | `obsidian-cli-mcp` *(TBD)* | `task_done`, `task_toggle` |

**Rationale:** The official Obsidian CLI (`obsidian task ... done`) requires the Obsidian GUI app
to be running and cannot run headless on LXC. Read/append ops are plain filesystem operations
and belong here. Edit ops that benefit from native Obsidian semantics run on Mac on-demand.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAULT_PATH` | yes | — | Absolute path to the vault root on the server |
| `PORT` | no | `1065` | HTTP port to listen on |

## Tools

すべてのツールで `repository_name` が必須。`VAULT_PATH/{repository_name}/` 以下にスコープされる。

### `note_read`

Read a markdown note by vault-relative path.

```
input:  { repository_name: string, path: string }
output: { content: string, exists: boolean }
```

- Returns `{ exists: false, content: "" }` if the file does not exist (no error).
- Path traversal (`..`) is rejected with an error.

### `note_upsert`

Create a note if it does not exist, or append to it if it does.

```
input:  { repository_name: string, path: string, content: string, frontmatter?: Record<string, unknown> }
output: { created: boolean }   // true = new file created, false = appended
```

- On **create**: writes `frontmatter` (YAML) + `content`. Parent directories are created automatically.
- On **append**: appends `\n` + `content`. Frontmatter is ignored.
- Path traversal is rejected.

### `note_delete`

Delete a note from the vault by vault-relative path.

```
input:  { repository_name: string, path: string }
output: { deleted: boolean }   // true = file deleted, false = file did not exist
```

- Returns `{ deleted: false }` if the file does not exist (no error).
- Path traversal (`..`) is rejected with an error.

### `vault_search`

Full-text search across the vault using ripgrep.

```
input:  { repository_name: string, query: string, path_filter?: string }
output: { results: Array<{ path: string, line: number, text: string }> }
```

- `query` is a ripgrep regex pattern.
- `path_filter` is an optional glob (e.g. `devlog/*.md`) — `**/` is auto-prepended.
- `path` in results is relative to `VAULT_PATH/{repository_name}/`.

## Vault Folder Convention

`VAULT_PATH` should point to a **subdirectory** of the Obsidian Vault (e.g. `/mnt/vault/claude`),
not the vault root. This physically sandboxes the server from personal notes.

```
Obsidian Vault/          ← vault root (MCP cannot touch this)
└── claude/              ← VAULT_PATH points here
    ├── devlog/
    │   └── {topic-slug}.md   # one file per topic, append-only entries
    └── adr/
        └── ADR-{NNN}-{slug}.md
```

All tool paths are relative to `VAULT_PATH` (e.g. `devlog/topic.md`, `adr/ADR-001-slug.md`).

## Devlog Inline Recording

Append devlog lines **proactively during work**, without waiting for `/devlog` skill invocation.

Use `note_upsert` to append a single line whenever a notable event occurs:

```
[impl]    YYYY-MM-DD  {what was implemented}
[problem] YYYY-MM-DD  {what went wrong and how it was resolved}
[insight] YYYY-MM-DD  {something learned or worth remembering}
[verify]  YYYY-MM-DD  {what was confirmed to work}
```

**When to append inline:**
- A bug is found and fixed → `[problem]`
- A feature or change is implemented → `[impl]`
- A non-obvious fact is discovered → `[insight]`
- A tool or flow is confirmed working → `[verify]`

Target file: `devlog/{topic-slug}.md` matching the current task.

## Security

- No authentication in the server itself (auth-agnostic by design).
- Network-layer security delegated to Tailscale or Cloudflare Zero Trust.
- Path traversal (`..`) blocked in `resolveSafePath()`.
