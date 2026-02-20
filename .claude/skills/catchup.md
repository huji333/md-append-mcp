You are executing the /catchup command. Load current project context from AGENTS.md, the Obsidian Vault devlog, and any pending handoff notes.

## Purpose

Recover recent progress, open problems, and next actions from the Obsidian Vault — without relying on conversation history.

**This skill is intended for proactive use.** You (Claude) should suggest running `/catchup` when:
- A new session starts and the user's task seems project-related
- The conversation context feels stale or you're unsure of recent changes
- The user asks "where were we?" or refers to past work vaguely

## Steps

### 1. Read AGENTS.md

Read the project's agent specification from the filesystem:

```
Read: AGENTS.md  (project root)
```

Confirm the tool list, vault folder convention, and devlog guidelines are loaded.

### 2. Find the relevant devlog topic

Infer the project name from the current working directory or CLAUDE.md. Then search for matching devlog files:

```
vault_search query="\[impl\]|\[problem\]|\[insight\]|\[verify\]" path_filter="devlog/*.md"
```

Identify the file whose `topic` or filename best matches the current project.

### 3. Read recent devlog entries

```
note_read path="devlog/{topic}.md"
```

Extract and display the **last 10 entries** (most recent first, sorted by date in the line).

### 4. Check for open problems

Highlight any lines containing `未解決` — these are unresolved issues that may need attention.

### 5. Check for handoff notes (tmp/)

Search for pending verification or handoff notes:

```
vault_search query="." path_filter="tmp/*.md"
```

If any exist, read them:

```
note_read path="tmp/{filename}.md"
```

Surface the contents as **"持ち越しタスク"** in the report.

### 6. Read ADR index (optional)

```
note_read path="_index.md"
```

If it exists, show the table of ADRs for reference.

### 7. Report

Summarize in bullet form:
- **持ち越しタスク** — contents of any `tmp/` notes (highest priority)
- **Recent work** — last 3–5 `[impl]` / `[verify]` entries
- **Open problems** — any `未解決` items
- **Active decisions** — latest ADR(s), if any

Keep the summary concise. Do not repeat raw log lines verbatim unless asked.

## Notes

- `obsidian-vault` MCP server: registered in `~/.claude.json` via `claude mcp add`
- If no devlog file matches the current project, say so and suggest running `/devlog` to create one
- This skill is read-only — it never writes to the vault
