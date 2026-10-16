# claude-mods build plan

**Where am I:** work the lowest-numbered phase whose done condition is not met. Check items off
when they are *verified* in a real session, not when they are written. New ideas go in the Parking
Lot, not into the current phase.

**Goal:** mods and skills Brad uses daily, likes, then packages as installable plugins and shares
with the team.

---

## Rules of record

**Home.** This repo is a plugin marketplace: one folder per plugin under `plugins/`. Each mod is
tried first as a hot-reload dev mod in `~/.claude/dev-mods/<session>/<name>/`, then copied here
once it works.

**Client-neutral.** Every plugin here must work for anyone on the team. No client names, no client
paths, no Brad-only steps (the personal billing step inside `stash` stays in Brad's personal copy).
Mods for one personal app live in that app's repo, not here. Personal ideas go in
`docs/_local/personal-ideas.md`, which is gitignored.

**Zones are tokens, not percent.** Quality drops steadily as context grows, not only near the
limit, and multi-fact recall falls off well before 1M. Defaults, raised 2026-10-09 for a 1M window:
count only under 400k, green "hand off when ready" 400k-550k with the Handoff button, yellow
550k-700k, red over 700k. Brad's call, past the 2026-10-07 research (250k / 400k): later sessions
lose more early detail, which the rolling draft offsets. Configurable per plugin.

**Stash is the one handoff format.** `/handoff` becomes an alias for `/stash` once Phase 2 lands.
Stashes stay in `~/.claude/stash/` so every tool (terminal, desktop, VS Code, ChatGPT) reads the
same files.

**Plans and DoD stay separate.** A build plan answers "what's next" across many steps. A DoD ledger
answers "is this one thing really done". A plan item can point at a DoD ledger. Neither replaces
the other.

**Test first.** Each mod ships with a `*.test.ts` run by `claude plugin test`, written before the
hook. `claude plugin validate` passes before any phase is checked off.

---

## Phase 1: Context band with a Handoff button

The quick win, and the trigger surface every later handoff phase uses.

- [x] Built and unit-tested as a dev mod, 2026-10-07 (`context-band`, 4 tests pass).
- [x] Band above the prompt: 🟢 good zone / 🟡 plan a handoff / 🔴 hand off now, with the token
      count. Reads `$.session.usage()` after each turn.
- [x] **Handoff** button on the band in every zone, highlighted in red. Runs `/stash session=<id> auto`.
- [x] Thresholds in plugin options, with the defaults above.
- [x] Band stays hidden until `showFrom` (default 200k, 50k before yellow), 0.3.0, 10 tests pass.
      Handoff phases (stashing, Clear & resume) always show.
- [x] Usage limit line, 0.4.0, 14 tests pass: any 5-hour or weekly window at `limitsFrom` (default
      70%) shows as its own line with the reset time, yellow, red from 90%. Shows even while the
      context line is hidden. There is no daily window, the host only reports 5-hour and weekly.
- [x] Usage limit line seen live in the desktop app, 2026-10-08 (5-hour at 70%, yellow, with reset time).
- [x] Verified in the desktop Code tab and the terminal. 2026-10-07: terminal via `--plugin-dir`, button right-aligned in both.

**Done when:** Brad has used the button for a real handoff from the desktop app.

## Phase 2: Exact resume, no picking from a list

Fixes "after `/clear`, resume can't tell which stash is mine" with parallel sessions.

- [x] Built and unit-tested, 2026-10-07: `context-band` 0.2.0 (8 tests pass), `stash` takes
      `[name] [session=<id>] [auto]`, `stash:resume` auto-picks the one active stash for this repo
      and branch, `/handoff` and `/handoff:resume` are alias skills (old symlinks into
      `context-relay` removed, its files untouched). The band reads the stash's name from its
      `Stashed as` line, not from disk.

- [x] Stash frontmatter gains `session_id`, `cwd`, and `status: active | resumed`.
- [x] Handoff button flow: write the stash, remember its name in the mod, then on `/clear`
      (`session.end` with reason `clear`, same process) auto-submit `/stash:resume <name>`. The
      mod stays loaded across `/clear`, so the pairing is exact, no list.
- [x] Find out whether a mod can run `/clear` itself (`$.command.run({ command: 'clear' })` is the
      call to try; mods must use it, `$.prompt.submit` refuses slash text). If yes, one press does stash, clear, resume.
      If not, the band says "Stash saved. Run /clear." and the rest is automatic.
- [ ] Fallback for a new window or another tool: `stash:resume` with no name auto-picks when
      exactly one `open` stash matches this cwd and branch, else lists only `open` ones, newest
      first.
- [x] `stash:resume` marks the stash `resumed`, so the list shrinks as you go.
- [x] `/handoff` and `/handoff:resume` become aliases for the stash pair.

- Live test, 2026-10-07 4:09pm: one press on Clear & resume ran `/clear` itself, then submitted
      `/stash:resume context-band-handoff-mods auto`. So `$.command.run({ command: 'clear' })` works.
- [ ] Found in the live test: the resumed session opened in another repo, the original session's
      launch folder, not the stash's `cwd` (`claude-mods`). Fix written 2026-10-07: `stash:resume`
      Step 2 now switches to `cwd` first (desktop `change_directory`, else `cd`), even under
      `auto`. Check it off after the next live Clear & resume lands in the right folder.

- [x] Two-session check waived by Brad, 2026-10-07: assumed working.
- [x] One press, 2026-10-07: Handoff stashes, then clears and resumes by itself once the stash
      turn ends. No second button. If the clear fails, the band says "Run /clear" as before.
      `context-band` 0.7.0, 19 tests pass.
- [ ] One-press handoff seen live.

**Done when:** two parallel sessions in the same repo each hand off and resume into the right
stash with no prompt.

## Phase 3: Rolling handoff (draft as you go)

Makes the final handoff nearly instant.

- [x] Built and unit-tested, 2026-10-07: `context-band` 0.5.0, 18 tests pass. Haiku via
      `$.model.complete`, fire and forget from `turn.complete`. Options `draftEvery` (10) and
      `draftModel` (haiku). Mods have no file delete, so `/stash` does the cleanup.
- [x] A draft stash per session at `~/.claude/stash/.drafts/<session_id>.md`.
- [x] After every N turns, and on each zone change, the mod starts a cheap background call that
      reads only the turns since the last checkpoint and updates the draft. Never blocks the
      session.
- [x] `/stash` starts from the draft when one exists: adds git state and the last few turns, then
      finishes. Target: under 30 seconds.
- [x] Drafts of ended sessions are cleaned up after 7 days (by `/stash`, not the mod).
- [ ] A real draft seen on disk after 10 turns, and a red-zone stash timed under 30 seconds.

**Done when:** a red-zone handoff on a long session takes under 30 seconds.

## Phase 4: Handoffs know about the plan and the DoD

- [x] `stash` looks for an active build plan (Phase 5 format, or a repo's `docs/BUILD-PLAN.md`)
      and a DoD ledger for the branch's ticket.
- [x] It records them in frontmatter (`build_plan:`, `plan_item:`, `dod:`) and in the body.
- [x] `stash:resume` opens them and states the current phase, item, and open DoD items.
- [x] The rolling drafter tracks the same pointers. Plan only: mods can't read the git branch, so
      the DoD ledger is found by `/stash` at stash time. `context-band` 0.6.0, 19 tests pass.
- [ ] Live: a stash mid-plan resumes on the right plan item without being told.

**Done when:** resuming a stash mid-plan lands on the right plan item without being told.

## Phase 5: `build-plan:` skill family

A build plan is a top-to-bottom checklist you work through, edit, and reorder from chat. Each item
runs the small loop; each phase runs the large one.

**The loop (test first):** Discover, Design, Test (write the failing test), Build, Verify.

- [x] `build-plan:init` - discovery, then writes the plan: phases, done conditions, Parking Lot.
- [x] `build-plan:start` - finds the plan, reads it, resumes at the first unverified item. A handoff with
      the whole roadmap attached.
- [x] `build-plan:add` - adds an item to a phase, or to the Parking Lot by default.
- [x] `build-plan:next` - checks off the verified item and moves on.
- [x] `build-plan:reorder` - moves items or phases, says what changed.
- [x] Decide where plan files live: `_local` only, decided 2026-10-07. Ticket work:
      `docs/<area>/specs/<TICKET>/_local/build-plan.md`, beside the DoD ledger. No ticket:
      `docs/_local/build-plan.md`. `build-plan:init` makes sure the path is gitignored (adds it to
      `.git/info/exclude` if not), so nothing gets committed by accident.
- [x] Stash, resume and the drafter look in these `_local` paths too, not just `docs/BUILD-PLAN.md`.
      The drafter can't see the branch, so it finds `docs/_local/build-plan.md` but not ticket plans.
- [x] Written 2026-10-07 at `~/.claude/skills/build-plan:*`. Not yet used on a real task.
- [ ] Live: `build-plan:init` on a real task, then `build-plan:start` after a `/clear`.

**Done when:** a teammate can run `build-plan:init` on a fresh task and `build-plan:start` after a `/clear`.

## Phase 6: Plan and DoD side pane

- [x] Built 2026-10-07 as its own plugin, `plugins/plan-pane` 0.1.0, 5 tests pass, installed.
      Finds the ticket from the branch (worktrees too), then the ticket's `_local` plan and ledger,
      then `docs/_local/build-plan.md`, then `docs/BUILD-PLAN.md`. Current phase open, the rest
      one line each with a done count.
- [x] One pane, two tabs: **Plan** (current phase, items, checkmarks) and **DoD** (ledger items with
      verified / weak / missing).
- [x] Reads the files; never writes them. Chat and the skills stay the way to change them.
      Changed 2026-10-16: the Parking Lot box is the one exception.
- [x] Redraws when either file changes: mods have no file watch, so it checks mtimes every 3 seconds while open, and after each turn.
- [x] Opens by command (`/plan-pane`), and stays shut otherwise.
- [x] Seen live 2026-10-07: `/plan-pane` opens in the desktop app (caterpillar, `dev`).
- [ ] A checkbox edit shows in the pane within seconds.
- [x] `plan-pane` 0.2.0, 12 tests pass:
      - **Toggle:** a "Plan & DoD" / "Hide plan" button above the prompt, hotkey `p` after
        `ctrl+x tab`. There's no keybinding action that runs a command, so no one-chord hotkey.
      - **Plan tab:** no plan, "Start a build plan" runs `/build-plan:init`. With a plan,
        "Check off & next" and "Resume plan".
      - **DoD tab:** no ledger on a ticket branch, "Start a DoD ledger" runs `/dod:init`. No ticket,
        it says so. With a ledger, "Check DoD" and "What next".
      - `context-band` 0.7.1 now keeps rows other plugins draw above the prompt.
- [x] Seen live 2026-10-08: Bradar and Handoff right-aligned together, hotkeys B and H shown.
- [x] Decided 2026-10-08: one band, always visible. `context-band` 0.8.0 hosts a "Plan & DoD"
      toggle (runs `/plan-pane`, which now toggles) and shows Handoff only from `handoffFrom`
      (200k, was `showFrom`). `plan-pane` 0.3.0 has no band row of its own.
- [x] Empty states explain each lifecycle, with the start button under them. Tabs: active one
      primary, the other plain and dim, a divider line under them. 20 + 13 tests pass.
- [x] What mods can draw is written down in `docs/UI-TOOLKIT.md`.
- [ ] Seen live: the merged band, the toggle, the empty states, the tab look.
- [x] Renamed 2026-10-08: band toggle is **Bradar**, hotkey `b` (was "Plan & DoD", `p`). Pane
      title "Build Plan & DoD", tab "Build Plan". `context-band` 0.9.1, `plan-pane` 0.5.1.

**Done when:** Brad keeps it open during a ticket and stops asking "where are we on the plan".

## Phase 6b: One chat, one plan (next up)

A repo can hold many plans at once: one per ticket, plus freeform ones. Each chat works on one.

**Where plans live** (all gitignored under `_local`):
- Ticket work: `docs/<area>/specs/<TICKET>/_local/build-plan.md`, beside the DoD ledger.
- Freeform work, no ticket and no work item (a chat of ideas worked through as a plan):
  `docs/_local/plans/<name>/build-plan.md`, `<name>` a short kebab name like a stash name.
  No DoD tab content for these: DoD belongs to tickets.
- `docs/_local/build-plan.md` (one shared slot) is retired; `docs/BUILD-PLAN.md` stays a legacy
  fallback for repos like this one.

**Which plan a chat is on**, first match wins:
1. Picked: the pane's "Working on: <name>" opens a list of every plan in the repo, ticket and
   freeform. Picking one ties this chat to it.
2. Automatic: a chat that creates or edits a file in a plan's folder ties itself to that plan.
   `build-plan:init`, `dod:init` and `stash:resume` do this without extra steps.
3. The branch's ticket.
4. Nothing: the pane offers to pick one or start one.

**The tie** is a small file per chat, `~/.claude/stash/.bindings/<session_id>.json`, so the pane,
the band's rolling draft and `/stash` all read the same answer. The stash records it; resume
restores it.

- [x] Tests first: binding order, auto-tie on edit, picker list, freeform paths.
- [x] `plan-pane`: "Working on" header with the picker, reads and writes the binding. (0.5.0)
- [x] `context-band`: auto-tie on Write/Edit under a plan folder; drafter reads the binding. (0.9.0)
- [ ] `build-plan:init`: asks ticket or freeform; freeform names the folder. (written, not run live)
- [ ] `build-plan:start`, `stash`, `stash:resume`: use the binding first. (written, not run live;
      they rely on `${CLAUDE_SESSION_ID}` being filled in inside skills)

- [x] Fixed 2026-10-08: in a worktree the pane showed "No build plan" though the chat was tied
      to one. `$.session.repo().root` is the main checkout for a worktree, so the binding's root
      never matched and the branch was read from the wrong HEAD. Both plugins now use the
      nearest folder with a `.git` (`workRoot`). `context-band` 0.9.2, `plan-pane` 0.5.2.
- [x] No plan for this chat but the repo has some: the empty state lists them to pick, above
      "Start a build plan". 32 + 26 tests pass.
- [ ] Seen live: the worktree chat shows its plan after a new chat.
- [x] Links, 2026-10-08: plan, ledger and stash skills write tickets, work items, PRs, docs and
      files as markdown links, looked up once, never invented, and link bare ones they pass
      while editing. The pane draws a linked item as Markdown so it can be pressed. Same rule in
      Brad's personal copies. `plan-pane` 0.5.3, skill plugins 0.1.1, 33 tests pass.
- [ ] Seen live: a link in the pane opens when pressed.
- [x] Levels, 2026-10-08: done phases `✓` and dim, the current phase boxed with `▾` and its items
      indented, later phases plain. Items with a link are no longer cut at 90 characters (the cut
      broke links). `plan-pane` 0.5.4, 35 tests pass.
- [ ] Seen live: the three levels read clearly in the desktop pane.
- [x] Experiment, 2026-10-16: a Parking Lot text box (Enter appends under `## Parking Lot`) and
      "Open full view", a narrow, tall HTML page of the whole plan beside it, rewritten on each
      plan change and reloading itself every 4 seconds. `plan-pane` 0.6.0, 46 tests pass.
- [ ] Brad decides whether the full view earns its place next to the pane.
- [x] Active item, 2026-10-09: the first open item in the current phase gets a bold yellow `▶`
      (Build Plan tab only; a DoD ledger isn't worked in order). `plan-pane` 0.5.8.

**Done when:** two chats in one repo, one on a ticket and one freeform, each show their own plan,
and each survives a Handoff.

## Installed for Brad (2026-10-07)

- Source of truth: `plugins/context-band/` in this repo. The old dev mod under
  `~/.claude/dev-mods/` is stale; don't edit it.
- Installed from the local marketplace `claude-mods` (`.claude-plugin/marketplace.json`), user scope:
  `context-band` and `plan-pane`.
- Installed copies read this folder directly, but only while the folder's `version` matches the
  installed one. Bump it without `claude plugin update` and sessions silently run the old cached
  copy (bit `plan-pane` 0.1.1). `bin/update-mods` tests, then updates, so always run it after a change.
  The desktop app's `/reload-plugins` did not pick up a fix; a new chat did.
- So a broken edit breaks every new session: run `bin/update-mods` before leaving an edit in place.

## Phase 7: Package and share

- [x] Each plugin has a README: what it does, how to install, its options. 2026-10-08.
- [x] `claude plugin validate` and `claude plugin test` pass for all of them, no warnings. 2026-10-08.
- [x] Skills shipped 2026-10-08 as three plugins, 0.1.0 each, so the names stay `/stash`,
      `/stash:resume`, `/build-plan:init`, `/dod:check`: `stash`, `build-plan`, `dod`. Client
      names, the personal billing step, and `~/.claude` paths removed. `dod` also ships the PR gate hook and
      `dod-ledger.sh`, tested against a sample repo. Brad doesn't install them: his personal
      copies would load beside them.
- [x] Names checked 2026-10-08: a headless session with only the three plugins (`--setting-sources
      project`) lists `build-plan:*`, `dod:*`, `stash:list|merge|resume|stash`.
- [ ] Bare `/stash` from the plugin (docs say a `name:` override allows it). If not, the band's
      `stashCommand` must be `stash:stash` for teammates.
- [x] `/stash` prunes bindings untouched for 30 days, beside the 7-day draft cleanup.
- [ ] Brad installs from this marketplace himself and runs a week on the installed copy.
- [x] Dependencies, 2026-10-09: `context-band` needs `stash` and `plan-pane`; `plan-pane` needs
      `build-plan` and `dod`. One install pulls all five. An update doesn't install a newly added
      dependency, so Brad installed `stash` by hand.
- [ ] Pick where the team gets it (open question 2), then share.

**Done when:** one teammate has it installed and used the Handoff button.

---

## Open questions

1. ~~Where do plan files live?~~ Decided: `_local` only (see Phase 5).
2. **Where does the team install from?** Researched 2026-10-09: a private GitHub repo for this
   marketplace. Teammates run `claude plugin marketplace add <org>/<repo>` (uses their git
   credentials), then `claude plugin install context-band@claude-mods`, which pulls the other four
   as dependencies. Org-wide: claude.ai Organization settings > Plugins & skills can sync the repo,
   or managed settings `extraKnownMarketplaces` + `enabledPlugins`. Updates: bump `version`;
   third-party marketplaces need auto-update turned on (`autoUpdate: true`, or `/plugin` >
   Marketplaces). Repo created 2026-10-09: private `bvfusion1001/claude-mods`. Teammates need
   collaborator access, or move it to an org later.
3. ~~Family name.~~ Decided: `build-plan:` (Brad also floated `brad-plan`, but the team uses it).
4. ~~The loop.~~ Confirmed: Discover, Design, Test, Build, Verify.

## Parking Lot

- **Two copies of `stash`.** Decided 2026-10-08: Brad runs the `build-plan` and `dod` plugins
  (personal copies moved to `~/.claude/skills-retired/2026-10-08/`) and keeps a personal `stash`
  for its personal billing step. Edit `stash` changes in both copies.
- `/handoff` and `/handoff:resume` aliases, and the DoD statusline segment, aren't shipped yet.

- Binding helpers (`planFor`, `bindingPath`) are copied in both plugins' `hooks/binding.ts`,
  since one installed plugin can't import another. Share them if a third plugin needs them.

- Type-check, done 2026-10-08: `bin/update-mods` runs `tsc -p` on each plugin's code (not tests,
  whose stubs are loose on purpose). It caught an undeclared `found` state key, an unguarded `HOME`,
  and `Svg` used on surfaces that lack it. Engine types live in `.types/` (gitignored), copied from
  a loaded mod. Refresh them from a dev mod's `.claude-plugin/types/` when Claude Code updates the
  mod API. `context-band` 0.9.3, `plan-pane` 0.5.5.

- **Salesforce deploy guard.** Block `sf project deploy` without `--target-org`; ask before a prod
  alias. Could be team-shareable.
- **context-relay repo.** Older design for the same idea, with uncommitted specs. Fold its useful
  specs (SPEC-002, SPEC-009) into these plugins' READMEs, then archive it.
