---
name: stash
description: Stash the current session — capture its context, git state (repo, branch, worktree, uncommitted changes), and a semantic summary into the global stash folder so the session can be found and resumed later from any tool or machine. Use when the user says "stash", "stash this session", "park this", or wants to close a session without losing its work.
user_invocable: true
---

# Session Stash

Save this session's full context to `~/.claude/stash/<name>.md` so it can be listed, searched, resumed, or merged from any Claude Code surface (CLI, desktop, VS Code extension) — or any other agent tool that can read markdown.

A stash is the portable, global evolution of a `handoff.md`: same strategic summary, plus enough metadata (repo, branch, worktree, WIP commit) to reconstruct the working state from a cold start on another machine.

## Arguments

`/stash [name] [session=<id>] [auto]`. The context band's Handoff button sends `session=<id> auto`.

- `name` given: use it, skip the Step 3 confirmation.
- `session=<id>`: record it as `session_id` in frontmatter, so resume pairs with this exact session.
- `auto`: ask nothing. Pick the name yourself, never push (record `local only`), and end with the
  Step 5 confirmation line exactly as written, because the band reads it.

## Step 1: Gather Context

Run in parallel:

```bash
git rev-parse --show-toplevel        # repo root
git remote get-url origin            # canonical repo identity
git rev-parse --abbrev-ref HEAD      # branch
git status -s                        # uncommitted changes
git log --oneline -10
git rev-parse --git-common-dir       # differs from .git when in a worktree
```

Salesforce repo (`sfdx-project.json` at the root): also run `sf org list` and
`sf config get target-dev-hub target-org`, and note the scratch org in play, what is deployed to it,
and any failed or rolled-back deploy.

Also review the conversation: tasks worked on, key files touched, decisions made, blockers hit, next steps.

**Build plan and DoD.** Look for the plan and ledger this work follows:
- Plan: the binding first, `~/.claude/stash/.bindings/<id>.json` (`<id>` from `session=<id>`, else
  `${CLAUDE_SESSION_ID}`), its `plan` field. Else find it the way `build-plan-start` does, or the
  plan the conversation has been working from. Note the current phase and first unchecked item.
- DoD: `dod-checklist.md` beside a ticket plan, else `docs/*/specs/<TICKET>/_local/dod-checklist.md`
  with `<TICKET>` from the branch name (e.g. `PROJ-1234`). Freeform plans have none. Note the items
  not yet verified.
Record what you find in the frontmatter (Step 4). Skip the fields when nothing is found.

**Rolling draft.** With `session=<id>`, read `~/.claude/stash/.drafts/<id>.md` if it exists. The
context band keeps it current. Start the stash body from it. Its `covers_messages` says how much
it covers, so review only the conversation after that, and fix anything the draft got wrong.
No draft: review the whole conversation as usual.

## Step 2: Snapshot Uncommitted Changes

- **Not a git repo** (the Step 1 `git` commands error) → record `changes: n/a (no repo)`, skip the git snapshot, and save the context and summary only. The stash still works.
- **Clean tree** → record `changes: clean` and skip ahead.
- **Dirty tree** → create a WIP commit on the current branch:

  ```bash
  git add -A
  git commit -m "WIP [stash:<name>]: <one-line summary>"
  ```

  Record the SHA in the frontmatter. `/stash:resume` restores it with `git reset --soft HEAD~1`.

  Prefer a WIP commit over `git stash`: git stashes live in a per-repo stack detached from any branch — easy to pop the wrong one, invisible to other machines, and impossible to tell which stash belonged to which session. A WIP commit rides the session's branch, self-labels via its message, and can be pushed.

- **Cross-machine resume** (skip under `auto`): ask the user once — "Push the branch so you can resume from another machine?" If yes, `git push -u origin <branch>`. If the repo's CI triggers on push and supports skip flags (e.g. a `skipci` commit-message prefix — check the project's git workflow conventions), prefix the WIP commit message with it before pushing.
- Never push without asking. If the user says "don't touch git", record `changes: left-in-place` with a `git status -s` snapshot in the body, and warn that resuming on another machine won't include those edits.

## Step 3: Name the Stash

Propose a concise 2–4 word kebab-case name derived from the work (e.g. `login-timeout-fix`, `search-query-perf`). Run it by the user as a single quick confirmation — they may rename. Skip the confirmation when a name was passed or under `auto`. If the name is taken by an active stash, add `-2`. Keep dates out of the name; timestamps live in frontmatter.

## Step 4: Write the Stash File

`mkdir -p ~/.claude/stash` if needed, then write `~/.claude/stash/<name>.md`:

```markdown
---
name: login-timeout-fix
created: 2026-07-23T18:05Z
updated: 2026-07-23T18:05Z
status: active
session_id: <id>                             # from session=<id>; omit if not given
cwd: /Users/me/Projects/repo                 # directory the session ran in
tool: vscode-terminal | desktop | cli | web
machine: <hostname>
repo: git@github.com:Org/repo.git
repo_path: /Users/me/Projects/repo
worktree: /Users/me/.claude/worktrees/xyz   # only if different from repo_path
branch: feature/PROJ-123
build_plan: docs/BUILD-PLAN.md               # omit if none
plan_item: "Phase 3: rolling draft at ~/.claude/stash/.drafts"  # current phase and item
dod: docs/auth/specs/PROJ-123/_local/dod-checklist.md         # omit if none
wip_commit: abc1234                          # omit if clean
changes: clean | wip-commit | left-in-place
summary: One-sentence semantic summary of what this session is doing.
tags: [auth]
---

## Completed
- [Finished work, with commit hashes / PR links]

## In Progress
- [State of unfinished work; where in the plan you are]

## Challenges / Blockers
- [Problems, failed approaches — so the next session doesn't repeat them]

## Key Decisions
- [Non-obvious choices and why]

## Next Steps (prioritized)
1. [Continue current work]
2. [Secondary]

## References
- [Specs, docs, ticket numbers, related stashes]
```

Only include sections with content. Target 30–80 lines of body. The `summary` and `tags` fields are what `/stash:list` searches — make them genuinely descriptive, not generic.

## Step 5: Confirm

> **Stashed as `login-timeout-fix`** → `~/.claude/stash/login-timeout-fix.md`
> WIP commit `abc1234` on `feature/PROJ-123` (pushed / local only).
> Safe to close this session. Resume anywhere with `/stash:resume login-timeout-fix`, or browse with `/stash:list`.

After the stash file is written, delete this session's draft and any draft not modified in 7 days:
`rm -f ~/.claude/stash/.drafts/<id>.md` and `find ~/.claude/stash/.drafts -name '*.md' -mtime +7 -delete`.
Also prune chat-to-plan bindings untouched for 30 days: `find ~/.claude/stash/.bindings -name '*.json' -mtime +30 -delete`.

If the user says "stash all my sessions": you can only stash *this* session — each session must run `/stash` itself. Say so, and suggest they invoke it in each open session.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
