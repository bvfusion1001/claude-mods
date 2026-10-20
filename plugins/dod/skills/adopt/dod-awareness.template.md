---
paths:
  - "force-app/**"
---

# Definition-of-Done Awareness

When doing substantive ticket work in `force-app/`, keep the ticket's Definition-of-Done ledger in mind. The ledger is maintained by the `dod:` skill family and lives at `docs/<area>/specs/<TICKET>/_local/dod-ledger.md` (gitignored, local-only; older ledgers are `dod-checklist.md`). This rule is advisory, it does not execute or persist anything; the skills do that.

## What to do

- **Ledger exists for this ticket** → keep it current as artifacts land. After you write a test, update a doc, or capture a decision, update the matching ledger item (or note that it needs `dod:check`). Don't let the ledger drift behind the work.
- **No ledger yet, and this is real ticket work** → suggest running `dod:init` to scaffold one.
- **Unsure what to do next, resuming mid-ticket, or the scope just changed** → run `dod:next`; it places the ticket on the pipeline (plan → test-first → implement → verify → document → ship) and handles walking backward when new scope invalidates earlier artifacts.
- **About to open a PR or request review** → run `dod:check` first so the ledger reflects verified reality. The statusline shows live DoD status, and a hook will remind you at `gh pr create` if it isn't green.

## What not to do

- Don't hand-verify items yourself ad hoc — `dod:check` does evidence-based verification (reads tests, checks docs/CI/deploy). Use it rather than eyeballing.
- Don't treat this rule as a substitute for the skills. It is a nudge to engage them at the right moments, nothing more.
