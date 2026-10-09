# context-band

A band above the prompt that shows how full the context is, with a one-press Handoff.

## What it does

- **Context zone.** Shows the token count with a dot: 🟢 hand off when ready, 🟡 plan a handoff, 🔴 hand off now.
- **Usage limits.** Shows a 5-hour or weekly limit as its own line once it passes `limitsFrom`, with the reset time.
- **Bradar button** (hotkey `b`). Opens or closes the `plan-pane` side pane.
- **Handoff button.** Shows from `handoffFrom` tokens. One press stashes the session, runs `/clear`, then resumes from that stash. If the clear fails, the band says "Run /clear" and resumes after you do.
- **Rolling draft.** Every `draftEvery` turns, and on each zone change, a cheap model updates a draft stash at `~/.claude/stash/.drafts/<session_id>.md`. This makes the final handoff fast. It never blocks the session.
- **Plan tie.** Editing a file inside a build plan's folder ties this chat to that plan, so the draft and `/stash` know which plan you're on.

## Needs

- The `stash` plugin. The Handoff button runs `/stash` and `/stash:resume`.
- The `plan-pane` plugin, for the Bradar button.

## Install

```bash
claude plugin marketplace add bvfusion1001/claude-mods
```

```bash
claude plugin install context-band@claude-mods
```

Start a new chat to load it.

## Options

| Option | Default | What it sets |
|---|---|---|
| `yellowAt` | 550000 | Tokens where the zone turns yellow |
| `redAt` | 700000 | Tokens where the zone turns red |
| `handoffFrom` | 400000 | Tokens where the Handoff button appears |
| `limitsFrom` | 70 | Percent where a usage limit line appears |
| `draftEvery` | 10 | Turns between rolling draft updates |
| `draftModel` | haiku | Model that writes the draft |
| `stashCommand` | stash | Skill the Handoff button runs |
| `resumeCommand` | stash:resume | Skill that resumes after `/clear` |
| `paneCommand` | plan-pane | Command the Bradar button runs |
