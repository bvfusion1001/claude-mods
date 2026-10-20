---
description: Reconcile a ticket's Definition-of-Done ledger — verify every item with real evidence (read tests, check docs for staleness, check deploy/CI/PR state), emit a verified/weak/missing verdict per item, update the ledger in place, then offer to close each gap. When all green, suggests pr-pre-review. Use when work feels done, or when the user says "dod check", "verify the definition of done", "am I done with this ticket".
---

# dod:check — verify the ledger and close gaps

Go through the Definition-of-Done ledger item by item, **verify each with evidence** (not just presence), record the verdict, and then offer to close every gap. This is the workhorse verb.

**Operating principle (shared with `pr-pre-review`):** judge honestly from evidence; never mark something verified you can't substantiate. Close gaps you're confident about *with the user's go-ahead per item*; collect genuine judgment calls for the human. Nothing auto-runs without an OK.

This is the verb the realtime layer points at: the statusline renders the ledger's verified/total counts, and the `gh pr create` PreToolUse hook reminds you to run this when the ledger isn't green. Keeping the ledger accurate here is what makes those signals trustworthy.

---

## Step 0 — Locate the ledger

1. Resolve the ticket from the branch (`feature/PROJ-####` → `PROJ-####`), then find `docs/**/specs/<TICKET>/_local/dod-ledger.md`, else the older `dod-checklist.md` (the ledger lives in the ticket's gitignored `_local/` folder while the DoD system is local-only).
   > **Locating it:** do not use `find`/`rg`/`fd` — `_local/` is gitignored, so those return nothing with exit 0 and read as "no ledger". Use literal globs:
   > ```bash
   > bash -c 'T="<TICKET>"; for n in dod-ledger.md dod-checklist.md; do for f in docs/*/specs/$T/_local/$n docs/*/*/specs/$T/_local/$n; do [ -f "$f" ] && echo "$f"; done; done; exit 0'
   > ```

2. If none exists, tell the user and offer to run `dod:init` first. Stop.
3. Read `.claude/dod-policy.yml` to get each item's `verifier`, `path`, `evidence_doc`, and `human_asserted` flag.
4. Compute the diff once: `git diff --name-only <base>...HEAD` and keep the changed-file list for the verifiers.

---

## Step 0.5 — Re-tailor against the real diff

The ledger was tailored at init from a *predicted* diff; check for drift before verifying:

- Conditional policy item whose `when:` globs now match the diff but is **absent** from the ledger → propose adding it.
- Included conditional/optional item whose trigger **never materialized** (e.g. `lwc-tests`, no `lwc/` touched) → propose flipping to ⚪ N/A with reason.

Present as one batch, apply on the user's OK, then verify the resulting item set. (Same logic as `dod:next` Step 3 — whichever verb runs first catches it.)

---

## Step 1 — Verify each applicable item

For every non-N/A item, run its **verifier** and assign a verdict:

- 🟢 **verified** — evidence is present and adequate → set checkbox `[x]`.
- 🟡 **present-but-weak** — exists but inadequate (stub test, stale doc, partial coverage) → `[ ]`.
- 🔴 **missing** — not done → `[ ]`.
- ⚪ **N/A** — leave as recorded.

Write a short **evidence** sub-bullet (and a `gap:` sub-bullet for 🟡/🔴) under each item. Keep ids stable so re-runs update in place.

### Verifier registry

| verifier | how to judge |
|---|---|
| `apex-tests` | Find `*Test.cls` exercising the changed `classes/`/`triggers/`. Read them: count real test methods, check for meaningful `Assert`/`System.assert*` and `Test.startTest/stopTest`, negative paths, and `runAs`. Pull coverage from the last run if available. 🟢 only if tests exist **and** assert behavior; 🟡 if happy-path-only / no asserts / thin; 🔴 if none. |
| `lwc-tests` | Find `__tests__/*.test.js` for changed `lwc/`. Read for real assertions (not just `createElement`). Run `npm run test:unit -- <file>` only if cheap and the user is OK with it. 🟢 with real assertions; 🟡 shallow; 🔴 none. |
| `code-analyzer` | Check for a recent `sf code-analyzer run` result; if absent, offer to run it (needs Java). 🟢 clean; 🟡 warnings; 🔴 violations or never run. |
| `deploy` | Check the last deploy of the changed metadata to the active scratch/dev org (`sf org list`, recent deploy status). 🟢 if green deploy of current changes; 🟡 stale; 🔴 never/failed. |
| `ci` | Inspect CI for the branch (`gh run list`/`ci:build-status` if present). 🟢 affected tests green; 🟡 pending; 🔴 failing. |
| `doc-fresh` | Resolve `path` (e.g. `{area}` or `{area}/architecture.md`). Check it exists and read it against the diff for staleness (renamed classes, changed behavior). 🟢 exists + consistent; 🟡 exists but stale/thin; 🔴 missing where the change clearly warrants it. |
| `conventions` | Spot-check the diff against `.claude/rules/`. Defer to the project `pr:review` family for depth if present. 🟢/🟡/🔴 by clear violations. |
| `traceability` | `gh pr view` (PR exists + linked), branch matches `[dr]/XX-PROJ-####`, commits start with `<PROJ>-<ticket>:`. 🟢 all; 🟡 partial; 🔴 no PR. |
| `harness` | Agent-runnable org verification. Find the harness/anon-apex script for this area (e.g. `{area}/test-harness/`), confirm it was actually run against the current code, and read the captured log evidence. Re-run it if cheap and the user is OK with it. 🟢 ran green against the current build with concrete output; 🟡 stale run (code changed since) or weak assertions; 🔴 never run. **Never** let this stand in for `manual-test` — passing here says nothing about the UI. |
| `manual-test` | Human-asserted (AI cannot click a scratch org). Read the `evidence_doc` (`manual-test-scenarios.md`) if present and summarize it, then **ask the user** what they tested and what they observed; record their answer verbatim as evidence. 🟢 only with a concrete assertion; 🟡 vague; 🔴 untested. **A harness/anon-apex/unit-test run by you is NOT evidence for this item, however thorough** — if this is the last item open, stop and ask the user to test. If no runnable plan exists yet, **offer `dod:uat`** rather than asking them to invent their own test steps. |
| `human-asserted` | No machine check. Surface any signal you can find, then ask the user to confirm + give evidence; record it. Verdict follows their answer. |

For **`human_asserted: true`** items, always ask the user — but do your homework first (search for the artifact, read the relevant doc) and present what you found so their assertion is informed, not blind.

---

## Step 2 — Update the ledger

Rewrite each item line with its verdict emoji and checkbox, add evidence/gap sub-bullets, and bump `updated:` in the frontmatter. Set `phase:` from the outcome — `verify` while machine items are open, `document` when only doc items remain, `ship` when everything applicable is 🟢. Commit per the policy's `commit_checklist` (project commit-message convention).

---

## Step 3 — Offer to close each gap (per item)

For every 🟡/🔴, **offer** to close it now — one at a time, with the user's go-ahead. Examples:

- Missing/weak doc → draft `architecture.md` / `decisions.md` / `manual-test-scenarios.md` content from the diff + session history.
- Uncaptured decision → write the `decisions.md` entry (date-stamped) from what was decided this session.
- Missing memory → propose the `MEMORY.md` / claude-mem entry.
- `human-uat` open with nothing for the user to follow → run `dod:uat` to write the plan. That closes the *blocker to testing*, not the item; only the user's own report closes the item.
- Weak test → scaffold the missing cases (but test *design* is a judgment call — propose, don't silently assert done).
- In a Salesforce repo, after a fix: deploy the changed metadata, run affected tests, confirm green, then commit (project convention) before re-marking the item 🟢.

**Never auto-run** a close without the OK. Reconcile contradictions explicitly. Genuine judgment calls / large blast radius → leave 🟡/🔴 and add to "Decisions for the human."

After closing items, re-verify those items so the ledger reflects reality.

---

## Step 4 — Summary

Report:
- Per-category verdict counts (🟢/🟡/🔴/⚪) and overall % complete.
- What was closed this run (with commit SHAs).
- What remains + recommendations (the human judgment calls).

**If everything applicable is 🟢:** tell the user the ledger is green and suggest the next step — *"Ledger green. Run `/pr-pre-review` to get it human-ready."* Do **not** auto-invoke it.

## Guardrails

1. **Evidence over presence.** A file existing is not 🟢 — read it and judge.
2. **Never assert what you can't verify.** Human-asserted items require the user's word + evidence; record it.
3. **No silent auto-fixes.** Offer per item; act on the OK.
4. **Stable ids, update in place.** Re-running `dod:check` must converge, not duplicate.
5. **Don't flip an N/A** without flagging it to the user.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
