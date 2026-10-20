---
name: build-plan-add
description: Add an item to the current build plan - into the Parking Lot by default, or into a named phase. Use when the user says "add to the plan", "put that in the parking lot", "build-plan add", or when a new idea comes up mid-phase.
---

# build-plan-add

Find the plan the way `build-plan-resume` does.

- **Default: the Parking Lot.** A new idea mid-phase goes there, so the current phase doesn't creep.
- **Into a phase** only when the user names it, or says it blocks the current phase.

Write the item as one verifiable line: `- [ ] <what>`. Add a short why when it isn't obvious.
Never check it off here, and never start working on it.

Reply in one line: "Added to <Parking Lot | Phase N>: <item>."

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
