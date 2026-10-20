# plan-pane

A side pane showing the build plan this chat is working on.

## What it does

- **Build Plan tab.** Shows the current phase open with its items and checkmarks. Other phases show one line each with a done count.
- **DoD tab.** Not implemented yet. It says so, and will show the ticket's Definition-of-Done ledger in a later version.
- **Working on.** Picks which plan this chat is tied to, from every plan in the repo.
- **Buttons.** "Start a build plan" when there is none. "Resume plan" only in a chat that hasn't started yet, such as after `/clear`. Checking items off happens in chat: say it's done, and Claude updates the plan.
- **Parking Lot box.** Type an idea and press Enter. It lands under `## Parking Lot` in the plan file. That's the only write the pane makes. Everything else changes from chat or the skills.
- **Open full view.** Writes a tall, narrow page of the whole plan (`full-view.html`, beside the plan, or in `docs/_local/` for a committed plan) and opens it in your browser. The pane rewrites it when the plan changes, and the page reloads itself every few seconds.
- **Live.** Redraws within a few seconds when either file changes.

## Which plan it shows

First match wins:

1. The plan this chat is tied to, by the picker or by editing a file in a plan's folder.
2. The branch's ticket: `docs/<area>/specs/<TICKET>/_local/build-plan.md` and `dod-checklist.md`.
3. `docs/BUILD-PLAN.md` at the repo root.

Freeform plans live at `docs/_local/plans/<name>/build-plan.md`.

## Needs

- The `build-plan` plugin, for the plan buttons. Installed with this one.

## Install

```bash
claude plugin marketplace add bvfusion1001/claude-mods
```

```bash
claude plugin install plan-pane@claude-mods
```

Start a new chat, then run `/plan-pane` to open or close it. The `context-band` Bradar button does the same.

## Options

None.
