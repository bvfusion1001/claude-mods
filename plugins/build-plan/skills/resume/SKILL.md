---
name: build-plan-resume
description: Pick up a build plan where it left off - find the plan, read it, and resume at the first unchecked item. Use after a /clear or in a new session, or when the user says "build-plan resume", "build-plan start", "where are we on the plan", "resume the plan", "pick up the plan".
---

# build-plan-resume

## Step 1: Find the plan

**The binding** ties a chat to one plan: `~/.claude/stash/.bindings/${CLAUDE_SESSION_ID}.json`,
holding `{"plan": "<absolute path to build-plan.md>", "root": "<absolute repo root>"}`. The plan
pane, the context band's draft and `/stash` all read it. Writing a file in a plan's folder ties
the chat by itself.

Look in order, and use the first that exists:
1. The binding's `plan`, if its `root` is this repo.
2. `docs/*/specs/<TICKET>/_local/build-plan.md`, with `<TICKET>` from the branch name.
3. `docs/BUILD-PLAN.md` (older repo-level plans).

None found: list every plan in the repo (`docs/*/specs/*/_local/build-plan.md`,
`docs/_local/plans/*/build-plan.md`) and ask which, or offer `build-plan-init`.

Once picked, write the binding if it doesn't already name this plan.

## Step 2: Read it

Read the whole plan, including the Parking Lot. Find the current phase: the first one with an
unchecked item. Find the first unchecked item in it. If that item names a DoD ledger, read the
ledger too and note its open items.

## Step 3: Brief

> **Plan:** `<path>`
> - Phase 3 of 5: <name>. Done when: <condition>.
> - Next item: <item>
> - Open in this phase: <count>. Parking Lot: <count> items.
> - DoD: <open items>, if the item names a ledger

Then start the item with the loop's first step (Discover), unless the user asked only for status.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
