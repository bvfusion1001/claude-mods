---
description: Read-only glance at a ticket's Definition-of-Done ledger — parse it and print the verdict table + percent complete. No verification, no writes, no network. Use to remember where a ticket stands when bouncing between sessions, or when the user says "dod status", "where am I on this ticket", "what's left on the dod".
---

# dod:status — read-only ledger glance

Print where a ticket stands. This verb **only reads and prints** — it never verifies, writes, deploys, or hits the network. It's the thing to run when bouncing between parallel sessions to remember what's left.

---

## Steps

1. Resolve the ticket from the branch (`feature/PROJ-####` → `PROJ-####`), or take a ticket id / path argument if the user gave one.
2. Find the ledger: `docs/**/specs/<TICKET>/_local/dod-ledger.md`, else the older `dod-checklist.md` (gitignored `_local/` folder). If none, say so and suggest `dod:init`. Stop.
   > **Locating it:** do not use `find`/`rg`/`fd` — `_local/` is gitignored, so those return nothing with exit 0 and read as "no ledger". Use literal globs:
   > ```bash
   > bash -c 'T="<TICKET>"; for n in dod-ledger.md dod-checklist.md; do for f in docs/*/specs/$T/_local/$n docs/*/*/specs/$T/_local/$n; do [ -f "$f" ] && echo "$f"; done; done; exit 0'
   > ```

3. Parse the frontmatter and the checklist items (grouped by category, each carrying an `id` + status emoji).
4. Print a compact summary:

   ```
   DoD — PROJ-1234: <title>   (area: billing/invoices, phase: implement, updated 2026-07-01)

   Implementation   🟢 2/2
   Tests            🟢 1  🟡 1  🔴 1
   Documentation    ⬜ 1
   Traceability     🟢 1
   N/A              2  (arch-delta, lwc-tests)

   12 items · 5 🟢 · 1 🟡 · 1 🔴 · 3 ⬜ · 2 ⚪   →  42% verified
   ```

5. List the open items (🟡/🔴/⬜) by id + label so the user knows exactly what's left. If anything is 🟡/🔴, note "run `dod:check` to verify and close gaps." If the user seems unsure what to *do* (not just what's left), point at `dod:next`.

## Guardrails

1. **Read-only.** No file writes, no `git` mutations, no deploys, no MCP/network calls. If the ledger looks stale, recommend `dod:check` — don't verify here.
2. **Cheap and fast.** This is the low-cost status peek; keep it to parse-and-print.
