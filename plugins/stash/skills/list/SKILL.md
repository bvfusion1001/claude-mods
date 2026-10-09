---
description: List, search, rename, or delete stashed sessions in ~/.claude/stash/. Use when the user asks "what sessions was I working on", "show my stashes", "which session was doing X", "rename that stash", or "delete a stash".
user_invocable: true
---

# Stash List / Search / Manage

Browse and manage the global session-stash folder.

## Listing

Read every `~/.claude/stash/*.md` frontmatter (skip `archive/`). Present newest-first:

| Stash | Updated | Repo / Branch | Changes | Summary |
|---|---|---|---|---|
| `login-timeout-fix` | Jul 23 | my-app · `feature/PROJ-123` | WIP `abc1234` | Fixing session timeout on login flow |

Keep the summary column to one line. After the table, remind: resume with `/stash:resume <name>`, merge with `/stash:merge <name>`.

If the folder is empty or missing: say no stashes exist yet and point at `/stash`. Mention `~/.claude/stash/archive/` if archived ones exist.

## Searching ("which session was I doing X in?")

The user's query is semantic, not literal — match it yourself:

1. Read all frontmatter (`summary`, `tags`, `name`, `repo`, `branch`).
2. For anything plausible, read the body too (`grep -il` across the folder helps shortlist).
3. Present matches ranked by relevance, with a one-line reason each ("mentions the Compass API retry logic in Next Steps").

Prefer showing 2–3 candidates over guessing one. If nothing matches, say so and show the full list instead.

## Renaming

On "rename X to Y" (or when the user picks a stash and asks for a better name):

1. Validate Y is concise kebab-case; propose a tightened version if not.
2. `mv ~/.claude/stash/X.md ~/.claude/stash/Y.md`, update `name:` and `updated:` in frontmatter.
3. Leave any WIP commit message as-is — the frontmatter `wip_commit` SHA is the link, not the commit message. Note the old name under a `aliases:` frontmatter list so old references still resolve.

## Deleting

Always confirm first, showing what would be lost. If the stash has `changes: wip-commit`, warn explicitly:

> This stash points at WIP commit `abc1234` on `feature/PROJ-123`. Deleting the stash file does NOT remove that commit — the branch keeps it. Want me to note it, or should the WIP commit be cleaned up too (soft-reset on that branch)?

Deleted stashes are removed outright; if the user might want history, offer moving to `~/.claude/stash/archive/` instead.
