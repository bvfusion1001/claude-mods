---
name: build-plan-next
description: Check off the build plan item just verified and move to the next one. Use when the user says "build-plan next", "next plan item", "that's done, what's next", or after an item passes its Verify step.
---

# build-plan-next

Find the plan the way `build-plan-start` does.

## Step 1: Check the current item is verified

Verified means the Verify step ran and passed: tests green, the change seen working, or the user
confirmed it. Written is not verified. If it isn't verified yet, say what's missing and stop.

## Step 2: Check it off

Change `- [ ]` to `- [x]`. Add a short note of how it was verified when that isn't obvious:
`- [x] Band hides under 200k. 18 tests pass, seen in the terminal.`

## Step 3: Phase boundary

If that was the last item in the phase, check the phase's **Done when**. Met: say so. Not met:
say what's still missing, and offer to add it as an item.

## Step 4: Move on

Name the next unchecked item and start it with the loop's first step (Discover).

## Links

Write every reference you can link as a markdown link, in the file and in chat, so the reader can click through:

- **Tickets, work items, epics, specs:** `[PROJ-395](<url>)`. Get the URL from the tracker the repo uses: the Jira MCP, Notion search, or `gh issue view`. Look each one up once, then reuse it.
- **PRs, issues, commits:** `[#81](<url>)`, from `gh`.
- **Docs, pages, threads:** link the page itself, not just its title.
- **Repo files:** a relative link from the file you are writing.
- **No URL found:** leave the plain id. Never invent a URL.
- **Editing an existing file:** link any bare reference you pass that you can resolve.
