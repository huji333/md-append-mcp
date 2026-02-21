You are executing the /adr command. Record an architectural decision to Obsidian Vault.

## Steps

### 1. Check existing ADRs (optional)

Call `adr_index` to see what's already recorded — for context, not for numbering (server auto-assigns).

```
adr_index({ repository_name: "<git-repo-name>" })
```

### 2. Fetch GitHub references (optional)

If Issue/PR numbers are evident in conversation context, fetch details via the `github` MCP server.
Do not ask the user — infer from context only. If nothing evident, set `related: []`.

### 3. Draft ADR

Auto-generate from conversation context. Structure:

```
## Context
Why was this decision necessary?

## Decision
What was chosen and why?

## Consequences
Trade-offs and implications.
```

**Keep total content under 500 chars.** Show draft to user for confirmation or edits.

### 4. Save

```
adr_write({
  repository_name: "<git-repo-name>",
  title: "<title>",
  content: "<draft>",
  branch: "<current-branch>",
  status: "accepted",          // or "proposed" if still debated
  related: ["<github-url>"]
})
```

Confirm: "ADR-<NNN> saved at adr/ADR-<NNN>-<slug>.md"

## Notes

- project-name: infer from cwd or CLAUDE.md
- status `proposed` if decision is still being debated
- `obsidian-vault` MCP must be registered via `claude mcp add`
