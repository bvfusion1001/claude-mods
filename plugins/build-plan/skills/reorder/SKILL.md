---
description: Move items or phases in the build plan, or promote a Parking Lot item into a phase. Use when the user says "reorder the plan", "move X before Y", "do that phase first", "pull that out of the parking lot", "build-plan reorder".
---

# build-plan:reorder

Find the plan the way `build-plan:start` does.

1. Make the move the user asked for. Keep each item's checkbox state and notes.
2. Never delete an item. Something no longer wanted goes to the Parking Lot with a short reason.
3. If a move puts a checked item after an unchecked one in the same phase, that's fine. Order is
   the order of work, not of completion.
4. Reply with only what changed:

> Moved: "<item>" from Phase 4 to Phase 2.
> Next item is now: <item>.

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
