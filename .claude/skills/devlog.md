You are executing the /devlog command. Record a single atomic observation to Obsidian.

## Entry format

Each entry is one line appended to `devlog/{topic}.md`:

```
[impl]    YYYY-MM-DD  {what was done}
[problem] YYYY-MM-DD  {issue encountered} → {how it was resolved, or "未解決"}
[insight] YYYY-MM-DD  {learning or observation}
```

Today's date is provided in the system context (`currentDate`).

## Steps

### 1. Parse arguments

The user may invoke this command as:
- `/devlog` — interactive mode (ask for everything)
- `/devlog impl "..."` — type + message provided
- `/devlog problem "..."` — type + message provided
- `/devlog insight "..."` — type + message provided

If type and message are provided in the invocation args, skip directly to step 3.

### 2. Ask what to record (interactive mode only)

Ask the user:
1. **Type** — impl / problem / insight
2. **Message** — one concise sentence describing the observation

For `problem` type, also ask for the resolution (or "未解決" if still open).

### 3. Select topic

Search for existing topics:

```
vault_search query="tag: devlog" path_filter="devlog/*.md"
```

Show matching filenames. Ask:
- "どのトピックに追記しますか？（新規の場合は新しいスラッグを入力）"

Infer a sensible default from the current working directory or recent conversation context.

### 4. Append to Vault

Check if the topic file exists:

```
note_read path="devlog/{topic}.md"
```

**If `exists: false` (new file):** create with frontmatter + header:

```
note_upsert
  path="devlog/{topic}.md"
  frontmatter={ tags: ["devlog"], topic: "{topic}", project: "{project}", created: "{YYYY-MM-DD}", updated: "{YYYY-MM-DD}" }
  content="# {topic}\n\n[{type}]  {YYYY-MM-DD}  {message}\n"
```

**If `exists: true` (append):** add only the new line:

```
note_upsert
  path="devlog/{topic}.md"
  content="\n[{type}]  {YYYY-MM-DD}  {message}"
```

Confirm: "✓ `devlog/{topic}.md` に [{type}] を追記しました"

## Notes

- Keep messages short — one observation per call, no nested bullets
- `problem` format: `[problem] YYYY-MM-DD  {issue} → {resolution}`
- project-name: infer from cwd or CLAUDE.md
- topic-slug: lowercase, hyphen-separated (e.g. `mcp-session-handling`)
- MCP server must be registered as `obsidian-vault` in `~/.claude/settings.json`
