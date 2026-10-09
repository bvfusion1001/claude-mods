# stash

Save a session's context and git state, then pick it up later in any tool, on any machine.

## Skills

| Skill | What it does |
|---|---|
| `/stash` | Saves context, branch, worktree, and a WIP commit to `~/.claude/stash/` |
| `/stash:resume` | Restores the git state and loads the context |
| `/stash:list` | Lists, searches, renames, or deletes stashes |
| `/stash:merge` | Pulls one or more stashes into the current session |

`/stash` is also reachable as `/stash:stash`.

## Works with

- **context-band:** its Handoff button runs `/stash`, clears, then `/stash:resume`.
- **build-plan** and **dod:** a stash records the active plan item and DoD ledger, and resume opens them.

## Install

```bash
claude plugin install stash@claude-mods
```
