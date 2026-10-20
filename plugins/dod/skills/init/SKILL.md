---
description: Scaffold a tailored Definition-of-Done checklist for a ticket at the start of work. Reads the JIRA ticket + branch + diff, proposes a tailored item subset from the repo's .claude/dod-policy.yml, and writes a per-ticket ledger at docs/<area>/specs/<TICKET>/_local/dod-ledger.md (gitignored, local-only for now). Use when starting a ticket, or when the user says "dod init", "start a dod checklist", "set up the definition of done".
---

# dod:init — scaffold the Definition-of-Done ledger

Create a persistent, file-based completeness ledger for a ticket so any later session (or a parallel one) can see what's done and what's left. This verb is **pure setup** — it does not verify anything (that's `dod:check`).

The ledger is the source of truth that survives across sessions. It lives in the **owning area's** spec folder, inside a gitignored `_local/` subfolder — so while the DoD system is personal it stays **local-only** (nothing lands in the shared repo). It is plain markdown so it diffs cleanly and any session can update it.

---

## Step 0 — Load the policy

The item set, requiredness, triggers, verifiers, and canonical paths are **defined per-repo** in `.claude/dod-policy.yml`. There is no hardcoded default.

1. Read `.claude/dod-policy.yml`.
2. **If it is missing**, do not invent items. Offer to scaffold it:
   - Copy the template that ships with this skill: `${CLAUDE_PLUGIN_ROOT}/skills/init/dod-policy.template.yml` → `.claude/dod-policy.yml`.
   - Tell the user it was scaffolded from the SF-tuned template and they should tune it (item set, requiredness, canonical paths) for this repo.
   - Then continue.

---

## Step 0.5 — Guard against re-initialization (idempotency)

`dod:init` **overwrites** the ledger, which would destroy verified progress recorded by `dod:check`. Never write over an existing ledger without explicit confirmation.

1. Resolve the ticket id first (Step 1's branch parse is enough — you do not need JIRA for this check), then look for an existing ledger anywhere under the areas root, since the owning area may differ from what you would infer today:
   ```bash
   bash -c 'T="<TICKET>"; for n in dod-ledger.md dod-checklist.md; do for f in docs/*/specs/$T/_local/$n docs/*/*/specs/$T/_local/$n docs/*/*/*/specs/$T/_local/$n; do [ -f "$f" ] && echo "$f"; done; done; exit 0'
   ```
   (Substitute the policy's `{areas_root}` / `{checklist_file}` if they differ from the defaults. The three globs cover areas nested up to three deep; add another for deeper nesting.)

   > **Do NOT use `find`, `rg`, `fd`, or `grep -r` for this check.** The ledger lives under
   > `_local/`, which is gitignored (`**/_local/`). Those tools — and any shell wrapper that
   > rewrites them, such as an rtk-style proxy — skip gitignored paths and return **nothing with
   > exit code 0**. That is indistinguishable from "no ledger exists", so the guard passes and
   > `dod:init` overwrites a real ledger. Confirmed on 2026-08-13 in the `caterpillar` repo, where
   > `find docs -name "dod-checklist.md"` returned empty while the file was present.
   >
   > The form above avoids the problem entirely: it never invokes a search tool, it uses literal
   > path globs plus `[ -f ]`. It is wrapped in `bash -c` because zsh's `nomatch` aborts on an
   > unmatched glob, and it avoids `shopt -s globstar` because macOS ships bash 3.2, which does not
   > support it. Unmatched globs stay literal and fail the `[ -f ]` test, so no `nullglob` is needed.

2. **If none is found**, confirm that is real rather than a filtered search before continuing. `ls` the resolved spec folder for the ticket (`ls -a docs/<area>/specs/<TICKET>/_local/ 2>/dev/null`); a gitignored directory is invisible to search tools but always visible to `ls`. Only then continue to Step 1.

3. **If one exists**, do NOT overwrite it. Read it, report its state (path, `phase`, and the verdict tally — e.g. "9 items: 5 verified, 2 weak, 2 missing"), and **ASK** which the user wants:
   - **Resume** (recommended) — leave the ledger untouched and hand off to `dod:next` (what to do next) or `dod:status` (read-only glance). This is almost always the right answer for a ticket already in flight.
   - **Re-scope** — the ticket's scope changed and items need adding/removing. Prefer `dod:next`, which handles scope change without losing verified state. If new items are genuinely needed, merge them into the existing ledger, preserving every existing item's verdict and evidence.
   - **Re-initialize from scratch** — only on explicit confirmation, and only after warning that all recorded verdicts and evidence will be lost. Back the old file up to `<checklist_file>.bak` in the same `_local/` folder first.

Never silently re-init because the ledger "looks stale" or the area inference changed.

---

## Step 1 — Resolve the ticket (JIRA-first, ad-hoc fallback)

1. Parse the current branch for a ticket id. The ticket is the first `[A-Z]{2,}-[0-9]+` in the branch name, e.g. `feature/PROJ-1234` → `PROJ-1234`.
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
2. If a ticket id is found, fetch it from JIRA (Atlassian MCP: `getJiraIssue`) to pull the **title** and **acceptance criteria**.
3. **Ad-hoc fallback:** if no ticket id resolves (spike, quick work), proceed without JIRA — ask the user for a short slug + the acceptance criteria, and record `ticket: ad-hoc-<slug>`.

---

## Step 2 — Determine the owning area

The ledger lives in the **most-specific** doc area the work falls under (per `.claude/rules/documentation-standards.md`).

1. Run `git diff --name-only <base>...HEAD` (base = `dev` or `release` per branch prefix) to see touched paths.
2. Infer the area from the touched code + existing `docs/<feature>[/<sub-feature>]/` folders. Prefer an existing area; propose creating a new one only if nothing fits.
3. **Confirm the area with the user** before writing (e.g. "Owning area: `billing/invoices` — correct?").

The ledger path is `{areas_root}/{spec_path}/{checklist_file}` from the policy, i.e. by default `docs/<area>/specs/<TICKET>/_local/dod-ledger.md`, inside the ticket's gitignored `_local/` folder (local-only while the DoD system is personal).

---

## Step 3 — Tailor the item set

For each item in the policy:

- `requiredness: always` → **include**.
- `requiredness: conditional` → include **iff** any `when:` glob matches a touched path from Step 1.
- `requiredness: optional` → **offer** it; include only if the user opts in (use judgment from the diff to pre-select likely ones).

Present the tailored list to the user and let them **confirm or trim**. Every item the user removes (and every conditional/optional item not included) is recorded in the ledger as **N/A with a one-line reason** — never silently dropped.

---

## Step 4 — Write the ledger

Write the file in this format (group items by `category`, preserve `id`s exactly — `dod:check` keys off them):

```markdown
---
ticket: PROJ-1234
title: <ticket title>
area: billing/invoices
branch: feature/PROJ-1234
phase: plan
created: 2026-07-01
updated: 2026-07-01
---

# DoD — PROJ-1234: <title>

## Acceptance criteria
- [ ] AC1: <verbatim from ticket>
- [ ] AC2: <verbatim from ticket>

## Checklist

_Legend: ⬜ pending · 🟢 verified · 🟡 weak · 🔴 missing · ⚪ N/A_

### Implementation
- [ ] **acceptance-criteria** · Acceptance criteria met — ⬜
- [ ] **conventions** · Code follows .claude/rules conventions — ⬜

### Tests
- [ ] **apex-tests** · Apex unit tests (coverage ≥ threshold) — ⬜
- [ ] **empirical** · Manually tested in a scratch/dev org — ⬜

### Documentation
- [ ] **persistent-docs** · Docs updated under the owning area — ⬜

### Traceability
- [ ] **pr** · PR linked; branch + commit conventions satisfied — ⬜

### N/A (excluded with reason)
- ⚪ **arch-delta** — no structural change
- ⚪ **lwc-tests** — no LWC touched
```

- Checkbox stays `[ ]` until `dod:check` verifies (then `[x]` for 🟢 or ⚪).
- Do **not** write evidence sub-bullets here — `dod:check` adds those.

---

## Step 5 — (No commit — local-only)

The ledger lives under `_local/` and is **gitignored**, so there is nothing to commit while the DoD system is personal. (The policy's `commit_checklist` only applies later, if/when the DoD system is shipped and the ledger moves out of `_local/` to a committed path.)

---

## Step 6 — Hand off

Tell the user the ledger path and that they can:
- run `dod:next` anytime to be pointed at the next action (plan → test-first → implement → verify → document → ship),
- run `dod:status` anytime for a read-only glance,
- run `dod:check` when they think the work is done.

`phase: plan` is written at init (the ledger existing means "define" is done); `dod:next` and `dod:check` advance it from there.

Creating the ledger also activates the **realtime layer** for repos with `.claude/dod-policy.yml`: the statusline shows live DoD progress (`dod:V/T`) for the current ticket, and a PreToolUse hook reminds at `gh pr create` if the ledger isn't green.

## Guardrails

1. **No hardcoded items.** If `.claude/dod-policy.yml` is absent, scaffold it from the template — never invent the item set inline.
2. **Never silently drop an item.** Excluded items are recorded as N/A-with-reason.
3. **Confirm the owning area** before writing — putting the ledger in the wrong area scatters a ticket's records.
4. **Setup only.** Do not verify, run tests, or judge anything here.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
