# dod

A Definition-of-Done ledger per ticket, checked against real evidence instead of a feeling of being done.

## Skills

| Skill | What it does |
|---|---|
| `/dod:adopt` | Sets up a repo: policy file, awareness rule, local-only excludes |
| `/dod:init` | Writes the ticket's ledger from the repo policy |
| `/dod:check` | Verifies each item and marks it verified, weak, or missing |
| `/dod:next` | Says what to do next on the ticket |
| `/dod:status` | Shows the ledger at a glance |
| `/dod:uat` | Writes a step-by-step test plan for a person to run |

## PR gate

Before `gh pr create` or `gh pr ready`, a hook reads the ledger. If it isn't all green, Claude asks before going ahead. It never blocks, and it does nothing in repos without `.claude/dod-policy.yml`.

## Notes

- The ticket is the first `ABC-123` style id in the branch name.
- The policy template is tuned for Salesforce repos. `/dod:adopt` swaps those items for your repo's own checks.
- Ledgers live at `docs/<area>/specs/<TICKET>/_local/dod-checklist.md` and are never committed.
- Needs `git` and `jq` for the PR gate.

## Install

```bash
claude plugin install dod@claude-mods
```
