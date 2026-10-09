---
description: Use when unsure what to do next on a ticket, after finishing a chunk of work, when resuming mid-ticket, or when scope changes partway through ("I just realized I also need..."). Also use when deciding whether the ticket still needs an item (build plan, JS tests) that was assumed at init. Triggers: "dod next", "what's next", "where was I on this", "scope changed", "do I still need X".
---

# dod:next — navigate to the next action

Place the ticket on the delivery pipeline and recommend the single next concrete action. This is the **navigator** verb: it senses state (ledger + policy + diff + artifacts), names the phase, and offers to kick off the next step. It recommends and offers — it never silently executes.

Companion verbs: `dod:init` scaffolds, `dod:status` glances, `dod:check` verifies. `dod:next` answers "so what do I do now?" — including when the answer is "go backward."

---

## Step 0 — Load state

1. Read `.claude/dod-policy.yml`. If absent, this repo hasn't adopted DoD — say so, offer `dod:init` (which scaffolds the policy). Stop.
2. Locate the ledger: `docs/**/specs/<TICKET>/_local/dod-checklist.md` (ticket from branch, `feature/PROJ-####` → `PROJ-####`). No ledger → phase is **define**; recommend `dod:init` and stop.
   > **Locating it:** do not use `find`/`rg`/`fd` — `_local/` is gitignored, so those return nothing with exit 0 and read as "no ledger". Use literal globs:
   > ```bash
   > bash -c 'T="<TICKET>"; for f in docs/*/specs/$T/_local/dod-checklist.md docs/*/*/specs/$T/_local/dod-checklist.md; do [ -f "$f" ] && echo "$f"; done; exit 0'
   > ```

3. Gather signals: `git diff --name-only <base>...HEAD` + working tree status; ledger verdicts and `phase:` frontmatter; presence of `specs/<TICKET>/spec.md` and `specs/<TICKET>/_local/build-plan.md`; whether the diff contains test files for the changed code.

## Step 1 — Place the ticket on the pipeline

Phases in order. "You're here" is judged from evidence, not from the stored `phase:` (which may be stale — trust signals over the label, then correct the label).

| # | Phase | You're here when | Exit signal | Next action |
|---|-------|------------------|-------------|-------------|
| 1 | **define** | No ledger, or AC empty/unclear | Ledger exists with AC | `dod:init`; superpowers:brainstorming if scope is fuzzy |
| 2 | **plan** | Ledger exists; no build plan; little/no code in diff | `_local/build-plan.md` exists, or user explicitly waives it | superpowers:writing-plans → save to `specs/<TICKET>/_local/build-plan.md` |
| 3 | **test-first** | Plan exists (or waived); current slice has no failing test | Failing test written for the slice | superpowers:test-driven-development |
| 4 | **implement** | Failing tests exist for the slice | Slice tests green | Implement; then loop 3↔4 per remaining plan slice |
| 5 | **verify** | All slices done; ledger has ⬜/🟡/🔴 machine-verifiable items | `dod:check` run; machine items 🟢 | `dod:check` (deploy, tests, analyzer, manual evidence) |
| 6 | **document** | Verify done; doc items still open | Doc items 🟢/⚪ | Close doc gaps (via `dod:check` offers) |
| 7 | **ship** | Ledger green | PR open, review requested | `pr-pre-review` → `gh pr create` → `pr:request-review` |

Plan and test-first are waivable per ticket (tiny fix, config-only change) — record a waiver as a one-line note in the ledger, never skip silently.

**Understanding gate (before plan).** If the ledger includes the `explainers` item and it is still ⬜, treat it as part of **define/plan**, not documentation cleanup at the end: the point is to learn the area *before* designing the fix. Next action is the `deep-explain` skill (or `deep-explain:review` if a set already exists for the area). Its concept inventory also becomes the refactor seam map, so it feeds planning directly. Only defer it if the user explicitly says they already know the area.

## Step 2 — Scope change? Walk the ripple backward

If the user declared new/changed scope ("I realized I need X", "requirement changed"), do NOT bolt it onto the current phase. Re-enter the pipeline at the **earliest invalidated artifact** and present the ripple as a checklist for one batch OK:

1. **Spec/AC** — add the new requirement to `spec.md` (if present) and the ledger's Acceptance criteria section.
2. **Ledger items** — re-tailor (Step 3); reset any 🟢 item the change invalidates back to ⬜ with a `- reset (YYYY-MM-DD): <why>` sub-bullet. A stale 🟢 is worse than a ⬜.
3. **Build plan** — amend slices in `_local/build-plan.md`.
4. **Tests** — extend/write failing tests for the new scope.
5. **Implement → re-verify** — code to green, then re-run `dod:check` for affected items.

Get one go-ahead for the batch, then work it top-down. Steps whose artifact doesn't exist (no spec, plan waived) are skipped with a note.

## Step 3 — Re-tailor (drift check, every run)

The item set was tailored at init from a predicted diff; the real diff drifts. Compare policy to reality:

- A conditional item's `when:` globs **now match** the diff but it's not in the ledger → propose **adding** it.
- An included conditional/optional item's trigger **never materialized** (e.g. `lwc-tests` but no `lwc/` touched) → propose flipping to ⚪ **N/A with reason**.
- An `always` item can only go N/A with an explicit user reason.

Present adds/removals as one batch; apply only on OK. Never flip silently (same guardrail as `dod:check`).

## Step 4 — Report and hand off

1. Print: current phase, the one recommended next action, and any ripple/re-tailor batch awaiting OK.
2. Update the ledger frontmatter: `phase:` and `updated:`.
3. Offer to start the next action now (invoke the named skill / run `dod:check` / draft the doc). One offer, user's call.

## Guardrails

1. **Navigator only.** Recommend and offer; nothing runs without the OK.
2. **Signals over labels.** Judge phase from diff/artifacts/verdicts; correct a stale `phase:`, don't obey it.
3. **Backward is a first-class direction.** New scope re-enters at the earliest invalidated artifact — never "just code it in."
4. **Never skip verification.** Phases 5–7 are not collapsible into "looks done."
5. **One next action.** Don't dump the whole remaining pipeline as a todo list; name the single next step (the pipeline table is there if the user wants the map).

## When the next action is human UAT

`human-uat` cannot be closed by you, so "go test it" is not an actionable next step on its own.
Run **`dod:uat`** first: it writes a plan with exact records, exact fields and outcomes already
verified against the org, so the user can run it without making judgment calls. Hand that over,
then stop and wait for their report.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
