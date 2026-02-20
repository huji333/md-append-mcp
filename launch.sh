#!/bin/sh
# launch.sh — localhost (Mac / Linux desktop) 向け起動スクリプト
# 使い方: ./launch.sh
# バックグラウンド起動: nohup ./launch.sh &

export VAULT_PATH="${VAULT_PATH:-$HOME/obsidian-vault/claude}"
export PORT="${PORT:-1065}"

exec node "$(dirname "$0")/dist/index.js"
