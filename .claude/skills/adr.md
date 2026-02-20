You are executing the /adr command. Record an architectural decision to Obsidian Vault as source of truth via the obsidian-vault MCP server.

## Steps

### 1. Get next ADR number

Search for existing ADRs:

```
vault_search query="tag: adr" path_filter="adr/*.md"
```

Count the results. Next ADR number = count + 1. If no results, start at ADR-001.

### 2. Fetch GitHub references (optional)

Ask the user:

> 関連する GitHub Issue/PR の URL があれば教えてください（任意、複数可。例: https://github.com/owner/repo/issues/42）:

If URLs are provided, for each one:
- Parse the URL to extract: `owner`, `repo`, `number`, and type (`issues` → issue / `pull` → PR)
- Call the appropriate tool from the `github` MCP server:
  - Issue: `issue_read` with `{ owner, repo, issueNumber: number }`
  - PR: `pull_request_read` with `{ owner, repo, pullNumber: number }`
- Extract: title, body, state, labels

Collect all fetched references. These will be used to enrich the ADR draft and populate `related:`.

If no URLs are provided, skip this step.

### 3. Draft ADR from session context

From the current conversation (and fetched GitHub context if available), identify the decision being made and auto-generate:

```markdown
---
tags: [adr, accepted]
adr: {N}
date: {YYYY-MM-DD}
status: accepted
project: {project-name}
related:
  - {GitHub URL 1}
  - {GitHub URL 2}
---

# ADR-{NNN}: {title}

## Context
{Why was this decision necessary? What problem does it solve?}
{If GitHub refs were fetched, summarize relevant background from issue/PR body and discussion.}

## Options Considered
1. **{Option A}** — {pros/cons}
2. **{Option B}** — {pros/cons}

## Decision
{What was chosen and why}

## Consequences
{Trade-offs, implications, things that follow from this decision}
```

- If no GitHub refs: `related:` is an empty list `[]`
- Show the draft to the user. Ask for confirmation or edits before saving.

### 4. Save ADR to Vault

Determine the slug from the title (lowercase, hyphen-separated):

```
note_upsert
  path="adr/ADR-{NNN}-{slug}.md"
  content="{full body without frontmatter}"
  frontmatter={ tags: ["adr", "accepted"], adr: {N}, date: "{YYYY-MM-DD}", status: "accepted", project: "{project-name}", related: ["{url1}", "{url2}"] }
```

### 5. Update _index.md

Append the new entry to the ADR index:

```
note_upsert
  path="_index.md"
  content="\n| ADR-{NNN} | {title} | {YYYY-MM-DD} | accepted | [[ADR-{NNN}-{slug}]] |"
```

Confirm to the user: "ADR-{NNN} saved at adr/ADR-{NNN}-{slug}.md"

## Notes

- project-name: infer from current working directory or CLAUDE.md
- Use zero-padded 3-digit number for NNN (e.g., 001, 012)
- If the decision is still being debated, set status: proposed instead of accepted
- `obsidian-vault` MCP server: registered in `~/.claude.json` via `claude mcp add`
- `github` MCP server: registered in `~/.claude.json` via `claude mcp add github -- sh -c '...'`
