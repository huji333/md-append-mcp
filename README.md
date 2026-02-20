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
