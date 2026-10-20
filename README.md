# claude-mods

Claude Code plugins for long working sessions: a context band with one-press handoff, a build plan and DoD side pane, and the skills behind them.

| Plugin | What it does |
|---|---|
| [context-band](plugins/context-band/README.md) | Token zone above the prompt, usage limits, one-press Handoff, rolling handoff draft |
| [plan-pane](plugins/plan-pane/README.md) | Side pane with the chat's build plan, a Parking Lot box, and a full-page view |
| [stash](plugins/stash/README.md) | Save a session's context and git state, then resume it exactly |
| [build-plan](plugins/build-plan/README.md) | Phased, test-first plans you work top to bottom from chat |
| [dod](plugins/dod/README.md) | Preview, not installed by default: per-ticket Definition-of-Done ledgers, plus a PR gate |

## Install

```bash
claude plugin marketplace add bvfusion1001/claude-mods
```

```bash
claude plugin install context-band@claude-mods
```

That pulls in `plan-pane` and `stash`. Add the build-plan skills too:

```bash
claude plugin install build-plan@claude-mods
```

Start a new chat to load them.

If your team's repos already ship their own build-plan and DoD skills, install only `context-band`, `plan-pane` and `stash`, and skip `build-plan` and `dod`. The pane runs the repo's build-plan skills when they're present.

## Get updates

Turn on auto-update once: in a chat, run `/plugin`, open **Marketplaces**, pick `claude-mods`, and choose **Enable auto-update**. Or update by hand:

```bash
claude plugin marketplace update claude-mods
```

New versions load in your next chat.
