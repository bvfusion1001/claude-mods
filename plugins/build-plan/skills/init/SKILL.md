---
name: build-plan-init
description: Start a build plan for a task - a short discovery, then a phased, top-to-bottom checklist with done conditions and a Parking Lot, saved as a gitignored local file. Use when starting multi-step work, or when the user says "build plan", "make a plan for this", "build-plan init", "plan this out".
---

# build-plan-init

A build plan answers "what's next" across many steps. It is not a DoD ledger, which answers "is
this one thing really done". A plan item may point at a DoD ledger.

## Step 1: Find the path

Ask one question first, unless the answer is plain: is this ticket work or freeform?

- **Ticket** (the branch or the user names one, like `PROJ-1234` or `ABC-42`):
  `docs/<area>/specs/<TICKET>/_local/build-plan.md`, beside the DoD ledger if one exists. Pick
  `<area>` from where the ticket's code lives, or ask.
- **Freeform** (no ticket, ideas worked through as a plan): `docs/_local/plans/<name>/build-plan.md`.
  `<name>` is a short kebab name, like a stash name. Propose one and let the user change it.
  Freeform plans get no DoD ledger: DoD belongs to tickets.
- A plan already exists there: stop and offer `build-plan-resume` instead.
- Never write `docs/_local/build-plan.md`. That shared slot is retired.

Writing the plan file ties this chat to it (see the binding in `build-plan-resume`).

Make sure the file is ignored: `git check-ignore -q <path>`. If not, add `**/_local/` to
`.git/info/exclude` (local only, never commit a `.gitignore` change for this).

## Step 2: Discover

Read the ticket, the branch diff and the code the task touches. Ask at most 3 questions, one at a
time, only for what the code can't answer: scope edges, what "done" means, hard constraints.

## Step 3: Write the plan

```markdown
# <Task> build plan

<One paragraph: the goal and why.>

**The loop for every item:** Discover, Design, Test (write the failing test), Build, Verify.
Check an item off only once it is verified.

## Phase 1: <name>

- [ ] <one verifiable item>
- [ ] <item> (DoD: `<path to dod-checklist.md>`), when it maps to one

**Done when:** <one observable condition>

## Phase 2: <name>
...

## Parking Lot

New ideas land here, not in the current phase.
```

Rules: 2 to 7 phases, each one shippable or checkable alone. Items are small enough to verify in
one sitting. Every phase has a **Done when**.

## Step 4: Confirm

Show the phases and their done conditions, not every item. Link the file. Ask "Start Phase 1?"

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
