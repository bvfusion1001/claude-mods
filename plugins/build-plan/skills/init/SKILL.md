---
name: build-plan-init
description: Start a build plan for a task - a short discovery, then a phased, top-to-bottom checklist with done conditions and a Parking Lot, where each phase opens with a design the developer agrees to before any code, saved as a gitignored local file. Use when starting multi-step work, or when the user says "build plan", "make a plan for this", "build-plan init", "plan this out".
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

**The loop for every item:** Discover, Design, Test, Build, Verify.
Each phase opens with a design the developer agrees to. Check an item off only once it is verified.

## Phase 1: <name>

**Design:** not agreed yet

- [ ] <one verifiable item>
- [ ] <item> (DoD: `<path to dod-ledger.md>`), when it maps to one

**Done when:** <one observable condition>

## Phase 2: <name>
...

## Parking Lot

New ideas land here, not in the current phase.
```

- 2 to 7 phases, each one shippable or checkable alone. Every phase has a **Design** line and a
  **Done when**.
- Items are small enough to verify in one sitting.
- **Test** means write the failing test first when there is code to test. For config, docs, or
  skill work, write down how Verify will show it working instead.
- If the repo ships a managed package or another versioned artifact, a change to shipped source gets
  an item for its upgrade impact: what an install on the previous version sees.
- A phase that ships ends with its PR item.

## Step 4: Confirm

Show the phases and their done conditions, not every item. Link the file. Ask "Start Phase 1?"

A yes starts Phase 1 at its design checkpoint, not at code.

## The design checkpoint

Every phase starts here, before any test or code. `build-plan-next` and `build-plan-resume` run it
too, from this section. The point: the developer understands the approach and agrees to it while
changing it is still cheap.

1. **Discover.** Read what the phase touches: the files, the config, the rules that apply.
2. **Propose the design** in a few bullets:
   - The approach, in one or two sentences.
   - The files to add or change.
   - The entry points: events, methods, components, endpoints, or config.
   - The main trade-off, and anything rejected and why.
3. **Write nothing yet.** No code, test, or config in that message. Ask "Build it this way?"
4. **Wait for the answer.**
   - **Yes:** replace the phase's **Design** line with the agreed approach in one or two sentences.
     Then start the phase's first item.
   - **Push-back:** change the design, and the phase's items if they change. Ask again.

Inside a phase, ask again only when an item would change the agreed design. Otherwise build straight
through. Skip the checkpoint only when the developer says so for this phase, and write
`**Design:** skipped by request` so the plan shows it.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
