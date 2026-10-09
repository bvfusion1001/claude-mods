# build-plan

A build plan is a top-to-bottom checklist you work through from chat. Each item runs the loop: Discover, Design, Test, Build, Verify.

## Skills

| Skill | What it does |
|---|---|
| `/build-plan:init` | Short discovery, then writes phases, done conditions, and a Parking Lot |
| `/build-plan:start` | Finds the plan and resumes at the first unverified item |
| `/build-plan:add` | Adds an item to a phase, or to the Parking Lot by default |
| `/build-plan:next` | Checks off the verified item and moves on |
| `/build-plan:reorder` | Moves items or phases |

## Where plans live

All under `_local`, so they're never committed:

- **Ticket work:** `docs/<area>/specs/<TICKET>/_local/build-plan.md`
- **Freeform work:** `docs/_local/plans/<name>/build-plan.md`

The `plan-pane` plugin shows the plan beside the chat.

## Install

```bash
claude plugin install build-plan@claude-mods
```
