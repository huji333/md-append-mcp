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

## Tools

All tools are exposed at `POST /mcp` via MCP Streamable HTTP.

| Tool | Description |
|------|-------------|
| `note_read` | Read a note by vault-relative path. Returns `{ content, exists }`. |
| `note_upsert` | Create a note (with optional frontmatter) or append to an existing one. Returns `{ created }`. |
| `note_delete` | Delete a note. Returns `{ deleted }` (false if not found, no error). |
| `vault_search` | Full-text search with ripgrep. Accepts `query` (regex) and optional `path_filter` (glob). |

See [`AGENTS.md`](./AGENTS.md) for full input/output specs.

## Deploy

### LXC Server (systemd)

```sh
# 1. リポジトリをクローン・ビルド
git clone <repo> /opt/obsidian-vault-mcp
cd /opt/obsidian-vault-mcp
npm install && npm run build

# 2. 環境変数ファイルを作成
cp .env.example /etc/obsidian-vault-mcp.env
# VAULT_PATH と PORT を編集する
vi /etc/obsidian-vault-mcp.env

# 3. systemd ユニットをインストール
cp systemd/obsidian-vault-mcp.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now obsidian-vault-mcp

# ログ確認
journalctl -u obsidian-vault-mcp -f
```

> `rclone-vault.service` で Google Drive をマウント済みであることが前提です。
> `After=rclone-vault.service` により、マウント完了後に MCP サーバーが起動します。

### localhost (Mac / Linux desktop)

```sh
npm install && npm run build
VAULT_PATH=/path/to/vault ./launch.sh

# バックグラウンド起動
nohup ./launch.sh &
```
