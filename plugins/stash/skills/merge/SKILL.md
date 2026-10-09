---
description: Merge one or more stashed sessions into the current session, consolidating context (and optionally code) in one place so the old sessions can be closed. Use when the user says "merge that stash into this", "pull in those other sessions", or discovers existing stashes overlapping their current work.
user_invocable: true
---

# Merge Stashes into the Current Session

Fold other stashed sessions' context into this one, then archive them. Context always merges; code merges only with explicit consent.

## Step 1: Identify Targets

Resolve the stash name(s) via `/stash:list` rules (explicit names, semantic match, or picker). Read each file fully — frontmatter and body.

## Step 2: Relatedness Safeguard (always runs)

Before merging anything, compare each target against the current session:

- Same repo? Same or related branch? Do the summaries/next-steps actually concern the same work?

For each target that looks **unrelated** — different repo, or a summary with no meaningful overlap with what this session is doing — stop and say so:

> `compass-retry-logic` looks like separate work (different branch, summary is about the Compass API integration, nothing here touches that). Merging would bury it in this session's context and you'd likely lose track of it. Keep it as its own stash?

Require explicit confirmation to merge an unrelated stash. Related stashes proceed without friction — the safeguard is a mismatch check, not a toll booth.

## Step 3: Merge Context

For each confirmed target, integrate into the current session's working context:

- **Next Steps**: merge into one prioritized list, dedupe, flag conflicts ("stash A says migrate first, stash B says the migration is blocked").
- **Key Decisions / Blockers**: carry over anything still relevant; drop what's been overtaken.
- **References**: union.

Present the consolidated picture briefly so the user sees what the combined session now covers.

## Step 4: Code Changes (opt-in)

If a target has a `wip_commit`:

- **Same repo, same branch** → nothing to do; it's already in history here (or restorable per `/stash:resume` step 3).
- **Same repo, different branch** → offer `git cherry-pick <sha>` (or `git merge <branch>`) into the current branch. Warn about conflicts before starting; never cherry-pick without asking.
- **Different repo** → code can't merge; say the changes stay on that repo's branch and record the pointer in the merged context.

## Step 5: Archive the Merged Stashes

Move each merged file to `~/.claude/stash/archive/`, setting:

```yaml
status: merged
merged_into: <current stash name if this session has one, else repo+branch+date>
merged: <ISO timestamp>
```

Suggest `/stash` afterward if the user wants the newly combined session captured as a single fresh stash — that becomes the one file that supersedes all of them.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
