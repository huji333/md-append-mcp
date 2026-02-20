You are executing the /adr command. Record an architectural decision to Obsidian Vault as source of truth via the obsidian-vault MCP server.

## Steps

### 1. Get next ADR number

Search for existing ADRs:

```
vault_search query="tag: adr" path_filter="adr/*.md"
```

Count the results. Next ADR number = count + 1. If no results, start at ADR-001.

### 2. Draft ADR from session context

From the current conversation, identify the decision being made and auto-generate:

```markdown
---
tags: [adr, accepted]
adr: {N}
date: {YYYY-MM-DD}
status: accepted
project: {project-name}
related:
---

# ADR-{NNN}: {title}

## Context
{Why was this decision necessary? What problem does it solve?}

## Options Considered
1. **{Option A}** — {pros/cons}
2. **{Option B}** — {pros/cons}

## Decision
{What was chosen and why}

## Consequences
{Trade-offs, implications, things that follow from this decision}
```

Show the draft to the user. Ask for confirmation or edits before saving.

### 3. Save ADR to Vault

Determine the slug from the title (lowercase, hyphen-separated):

```
note_upsert
  path="adr/ADR-{NNN}-{slug}.md"
  content="{full body without frontmatter}"
  frontmatter={ tags: ["adr", "accepted"], adr: {N}, date: "{YYYY-MM-DD}", status: "accepted", project: "{project-name}", related: [] }
```

### 4. Update _index.md

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
- MCP server must be registered in `~/.claude/settings.json` as `obsidian-vault`
