---
description: Resume a stashed session — restore its git state (branch, WIP commit) and load its context so work continues where it left off. Use when the user says "resume <stash>", "pick up the X stash", "continue that stashed session", or starts a session referencing previously stashed work.
user_invocable: true
---

# Resume a Stash

Reconstruct a stashed session in the current session: git state first, then context.

## Step 1: Locate the Stash

- Named explicitly → read `~/.claude/stash/<name>.md` (check `aliases:` in other files if not found).
- Described vaguely → semantic-match per `/stash:list` search rules; confirm the pick before proceeding.
- Nothing specified → look only at active stashes (top level of `~/.claude/stash/`, not `archive/`).
  If exactly one has `cwd`, `repo_path` or `worktree` equal to this directory's repo root and `branch`
  equal to the current branch, use it without asking. Otherwise show the list, matches for this
  repo first, newest first, and let the user choose.

## Step 2: Verify the Environment

Compare frontmatter against this machine:

1. **Repo**: does `repo_path` exist here? If not, search for a checkout by remote URL (`git remote get-url origin` in likely project dirs). Still missing → offer to clone `repo` fresh; the branch (if pushed) brings the code.
2. **Location**: do this before any other step reads files or runs git. The target folder is
   `cwd` if set, else `worktree`, else `repo_path`. Compare it to `pwd`. If they differ, switch:
   - Desktop app: load and call `mcp__ccd_directory__change_directory` with the target folder.
     The move lands when the turn ends, so use absolute paths into the target until then.
   - Otherwise: `cd <target>` in Bash, then run `pwd` to confirm it stuck.
   - Say it in the brief: "Switched from `<old>` to `<target>`." Never skip this under `auto`.
   - If the switch fails, stop and tell the user to reopen the session in the target folder.
3. **Branch**: `git rev-parse --abbrev-ref HEAD`. If different, check the working tree is clean before `git checkout <branch>` — never checkout over dirty state without asking (offer to `/stash` the current state first; that's the tool for exactly this).

## Step 3: Restore Working Changes

If `wip_commit` is set:

```bash
git log --oneline -3
```

- **HEAD is the WIP commit** → default: `git reset --soft HEAD~1` so the changes return to staged/working state, exactly as stashed. Offer "keep the commit" as the alternative if the user prefers to build on it.
- **HEAD moved past it** (new commits on top) → do NOT reset. Warn: "the branch has advanced since the stash — WIP commit `abc1234` is already merged into history 2 commits back." Continue with context only.
- **WIP commit missing** (local-only commit, different machine) → explain it lives only on the original machine; context still loads, code changes don't.

If `changes: left-in-place`, diff the recorded `git status` snapshot against current status and flag differences.

## Step 3b: Plan and DoD

If `build_plan` is set, read it. Find the current phase and its first unchecked item. If it
differs from `plan_item`, trust the file: someone checked items off since the stash. If `dod` is
set, read it and list the items not yet verified. Both go in the brief.

Tie this chat to the plan: write `~/.claude/stash/.bindings/${CLAUDE_SESSION_ID}.json` holding
`{"plan": "<absolute build_plan path>", "root": "<absolute repo root>"}`. A relative `build_plan`
is relative to the repo root.

## Step 4: Brief and Confirm

Started by the context band (`auto` in the arguments, or the stash was named explicitly right after
a `/clear`): brief, then go straight to Step 5 and the first next step without asking.

> **Resuming `login-timeout-fix`** (stashed Jul 23, VS Code terminal on macbook)
> - Completed: [...]
> - In progress: [...]
> - Next up: [first prioritized step]
> - Plan: Phase 3, "rolling draft" (from `docs/BUILD-PLAN.md`), if `build_plan` is set
> - DoD: 2 open, `manual-test` and `docs`, if `dod` is set
> - Git: on `feature/PROJ-123`, WIP changes restored to working tree.
>
> [Note any divergence found in steps 2–3.]
>
> Continue with [first next step]?

## Step 5: Archive

On confirmation, move the file to `~/.claude/stash/archive/<name>.md` (create dir if needed) and set `status: resumed` plus `resumed: <ISO timestamp>` in its frontmatter. Don't delete — archives are cheap and searchable. Then start on the first next step.
