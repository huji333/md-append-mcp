# obsidian-vault-mcp — AGENT.md

## プロジェクト概要

Mac上のClaude CodeからLAN越しにObsidian Vault（Google Drive）を操作するMCPサーバー。
Proxmox LXC (Debian/Ubuntu) 上でNode.js製Streamable HTTPサーバーとして動作する。

```
Mac (Claude Code)
  ↓ HTTP over LAN (or Tailscale / Cloudflare Zero Trust)
Proxmox LXC
  ├── Node.js MCP server (port 3000)
  └── rclone mount → Google Drive / Obsidian Vault /mnt/vault
```

---

## セキュリティ方針

- MCPサーバー自体は認証コードを持たない（auth-agnostic）
- ネットワーク層で Tailscale または Cloudflare Zero Trust に委譲
- 将来のチーム運用もACL追加で対応、アプリ側変更不要

---

## Vault 構造

```
vault/
├── devlog/
│   └── YYYY-MM-DD.md    # 日次ログ（append-only）
├── adr/
│   └── {repo-name}/
│       └── ADR-NNN-slug.md
└── projects/            # 任意：プロジェクトハブノート
```

- **devlog**: 日次ファイルに時系列でappend
- **ADR**: GitHubリポジトリの `docs/adr/` がmaster。Vaultはwikilink参照のみ（Phase 2）

---

## Phase 1 スコープ（最初に実装する）

### ツール一覧

| ツール | 説明 |
|--------|------|
| `note_read` | パス指定でmd全文を返却 |
| `note_upsert` | 存在すれば末尾append、なければfrontmatter付きcreate |
| `vault_search` | ripgrepで全文検索、軽量な結果を返却 |

### スキーマ

```typescript
// note_read
input:  { path: string }
output: { content: string, exists: boolean }

// note_upsert
input: {
  path: string,
  content: string,
  frontmatter?: {
    date?: string,
    tags?: string[],
    [key: string]: unknown
  }
}
output: { created: boolean }  // true=新規作成 / false=追記

// vault_search
input:  { query: string, path_filter?: string }
output: {
  results: Array<{ path: string, line: number, text: string }>
}
```

### 環境変数

```
VAULT_PATH=/mnt/vault
PORT=3000
```

### ディレクトリ構成

```
src/
├── index.ts          # MCPサーバー起動 (Streamable HTTP)
├── vault.ts          # fs + gray-matter の薄いラッパー
└── tools/
    ├── note.ts       # note_read, note_upsert
    └── search.ts     # vault_search (ripgrep)
```

### 依存パッケージ

```json
{
  "@modelcontextprotocol/sdk": "^2.0.0",
  "gray-matter": "^4.0.3",
  "zod": "^4.0.0"
}
```

---

## Phase 2 以降（実装しない）

- `link_add` / `backlinks_search` / `graph_neighbors` — wikilink操作
- `vault_sync` — rclone pull をトリガー
- ADRのGitHub書き込み（gh CLI or GitHub MCP に委譲）
- systemd service設定 / Caddy reverse proxy設定

---

## 実装ノート

- rcloneのVFS cacheモードは `writes` で十分（appendユースケース）
- ripgrepはchild_processで呼ぶ（`rg --json`形式でパース）
- frontmatterのparse/updateはgray-matterで統一
- パスはすべて `VAULT_PATH` からの相対パスで受け取る
- `..` によるパストラバーサルを必ずvalidation
