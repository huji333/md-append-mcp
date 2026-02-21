You are executing the /devlog command. Append a structured log entry to the session devlog in Obsidian.

## Session ID

Generate a session ID **once per conversation**: `YYYYMMDD-HHMM` (datetime at session start).
Reuse the same `session_id` for all devlog calls within this conversation.

## repository_name

Infer from the git repository name (basename of git root), or from CLAUDE.md context.

## Steps

### 1. Parse arguments

- `/devlog` — interactive: ask for type and content
- `/devlog impl "..."` / `/devlog problem "..."` / etc. — skip to step 3

### 2. Ask (interactive mode only)

- **Type**: impl / problem / insight / verify
- **Content**: one concise sentence
- For `problem`: also ask for resolution (or "未解決" if still open)

### 3. Append

Call `devlog_append`:

```
devlog_append({
  repository_name: "<git-repo-name>",
  session_id: "<YYYYMMDD-HHMM>",
  entries: [{
    type: "<type>",
    content: "<content>",
    resolution: "<resolution>",  // problem only
    branch: "<current-branch>"   // optional
  }]
})
```

Confirm: "✓ devlog/<session_id>.md に [<type>] を追記しました"

## Notes

- Keep content short — one observation per entry
- Server injects the HH:MM timestamp automatically; do not add it yourself
- Proactive logging (without explicit /devlog invocation) is encouraged during work
