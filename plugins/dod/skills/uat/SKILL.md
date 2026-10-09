---
description: Write a runnable human-UAT plan for a ticket, so the person testing can follow it without thinking. Produces exact records, exact fields, exact values, each expected outcome verified against a real org first, plus a spreadsheet export. Use when the DoD ledger's human-uat item is open, when the user says "give me tests to run", "what should I test", "make me a UAT plan", "I want to test this myself", or when dod:check reaches manual-test with no plan in existence.
---

# dod:uat — a UAT plan someone can actually follow

`human-uat` is the one DoD item an agent can never close. This skill produces the artifact that lets
a human close it, and its whole purpose is to remove judgment calls from the tester.

**The bar:** the tester should never have to decide anything. If a step makes them choose a field,
pick a record, or work out what counts as success, the step is not finished.

---

## The rule that matters most

**Never write a step that offloads a choice.**

| Bad | Why it fails |
| --- | --- |
| "Edit any field and save" | They will pick one that behaves differently and report a false result. |
| "Edit any field except X, Y, Z" | Still a rule to apply. They have to reason about your exclusion list. |
| "Change a harmless field" | "Harmless" is your judgment, not theirs. |
| "Verify it behaves correctly" | Correct according to what? |

Every step names **one record, one field, one value, one expected outcome**, and the outcome is
quoted verbatim where it is an error message.

---

## Step 1 — Establish what the tester is looking for

Say the change class in the first paragraph, because it defines success:

- **Behavior-preserving refactor** → "everything should behave exactly as before; you are hunting for
  anything that does not." Boring is success.
- **New behavior** → "here is what should now be different."
- **Bug fix** → "here is what used to happen and what should happen now."

Without this a tester cannot tell a pass from a fail.

## Step 2 — Seed deterministic data, then read the real ids back

Use the area's seed harness if one exists; build one if not (see the repo's `test-harness/`).

Then **query the org for the ids and paste the real ones into the plan.** Never write
`<your record id>`. Include the org URL so ids are clickable, and say how to regenerate if reseeded
(and warn that reseeding changes the ids).

## Step 3 — Verify every expected outcome against the org BEFORE writing the step

This is the step that gets skipped and it is the one that matters.

Do not write "expect the save to be rejected" because you read a validation rule. **Try it** in a
rolled-back transaction and confirm the actual result and the actual message text. Source reading is
how plans end up asserting outcomes the system does not produce.

```apex
Savepoint sp = Database.setSavepoint();
Database.SaveResult sr = Database.update(record, false);
System.debug(sr.isSuccess() ? 'SAVED' : sr.getErrors()[0].getMessage());
Database.rollback(sp);
```

## Step 4 — Hunt the near-miss substitutes and list them

For each step, find the fields or records a reasonable tester might reach for **that would produce a
false result**, and list them explicitly as "do not substitute, and here is why".

This is not padding. A field that is on the layout, editable, and looks harmless, but which the
guard you are testing happens to **permit**, will show a clean save and the tester will report a
regression that does not exist. That is worse than skipping the test.

## Step 5 — Confirm the tester can actually reach the field

For UI steps, check the field is on the relevant page layout and editable, for the **record type the
seeded record actually uses** (not the one you assumed).

**If a field is not on the layout, do not tell the user to add it.** A field absent from the layout
cannot be edited in the UI by a real user either, so "does the UI reject this edit" is not a genuine
scenario for it. Adding it manufactures a scenario that does not exist in production, and the tester
ends up testing the layout change. Use an API tool for that step instead, and say so.

Also check whether layouts are even source-tracked in the repo. If they are not, a layout change is
org-only, shared with every other user of that org, and invisible to the promotion path.

## Step 6 — Name the tool per step, inside the step

Different steps want different tools, and the tester should not have to work it out:

- **Real UI** for anything about what a user experiences: error banners, whether a field is editable,
  whether an action is visible. This is the whole reason the item cannot be automated.
- **An API tool** (Salesforce Inspector, Workbench, anon apex) for reading exact values, for fields
  absent from the layout, and for setup. API saves still fire triggers, flows and validation rules,
  so the logic is genuinely exercised; what is lost is only how the result is presented.

**Put the tool in the step's own cell, not only in a routing table.** A summary table mapping tests to
tools is fine as orientation, but it is not where the tester is looking. They are looking at one row,
mid-task, and that row must be executable on its own: **the tool, the exact record id, and the exact
field API name, all in the cell.** A row that says "change the PKG QTY" while a table sixty lines
above says "use Inspector for this one" will be run in the UI, because the row read like a UI
instruction. If a summary table exists, say in it that the rows are authoritative.

**Verify the edit path, not just the field.** Confirming a field is on the layout and editable is not
enough. The record's **Edit** button may launch a screen flow or custom component with its **own**
required fields, and seeded data often fails those, blocking the save before the tested edit is
submitted. Open the edit path once as the tester will, or read the flow's required screen fields, and
if the seed cannot satisfy them either fix the seed or route the step to an API tool and **say why in
the plan** so the tester does not read the block as a regression.

## Step 7 — Never target the test tooling's own fields

If the seed uses a field as its tag or key, **no step may edit that field.** Editing it breaks
cleanup and verification. Check the factory and cleanup queries before choosing targets.

## Step 8 — Prioritize, and flag the human-only checks

Say which handful matter most and why. Call out explicitly any step that is **the only possible check
of something** (for example, behavior in third-party or managed code that cannot be observed in this
org's logs and has no automated coverage). The tester should know where their attention is
irreplaceable.

## Step 9 — Pre-empt false alarms

List the environment's known quirks (flaky flows, package-version differences, documented failing
tests) so a tester does not report a pre-existing issue as a regression.

## Step 10 — Write the artifact, and export it

Location: the ticket's spec folder, `{areas_root}/{spec_path}/uat-plan.md`, so it sits with the
ticket rather than in the area's living docs.

Table columns: **# | Record | What you do | What must happen | Why it matters | Result**

The `Why it matters` column is what makes a tester careful rather than mechanical, and the empty
`Result` column is what makes it fillable.

**Also export a CSV** next to it (in `_local/` if the ledger is local) so it pastes into a
spreadsheet. Offer both; do not wait to be asked.

Close with: how to report results, and the cleanup command.

## Step 11 — Hand it over, then stop

Send the file. Say which steps matter most. **Do not mark `human-uat` verified.** Only the user's
own report closes it, and it is recorded verbatim as their evidence.

---

## Checklist before handing it over

- [ ] Change class stated, so pass/fail is unambiguous
- [ ] Every step: one record, one field, one value, one outcome. Zero choices left to the tester
- [ ] **Every expected outcome tried against a real org**, not inferred from source
- [ ] Error messages quoted verbatim
- [ ] Near-miss substitutes hunted and listed as "do not substitute"
- [ ] Every UI step's field confirmed on the layout for the seeded record's record type
- [ ] No step edits a field the seed or cleanup depends on
- [ ] Tool named per step, with a reason
- [ ] Live record ids, plus how to regenerate and the warning that ids change
- [ ] Human-only checks flagged
- [ ] Known environment quirks listed
- [ ] CSV exported alongside
- [ ] `human-uat` left open

Cannot tick "every expected outcome tried against a real org"? The plan is guesswork. Verify first.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
