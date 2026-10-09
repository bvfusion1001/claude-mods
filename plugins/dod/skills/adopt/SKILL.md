---
description: Use when bringing the DoD system to a repo that doesn't have it yet — "port dod to <repo>", "set up dod here", "adopt dod", or when dod:init/dod:next report the repo has no .claude/dod-policy.yml and the user wants it. Onboards one repo; the skills/hooks/statusline themselves are machine-global and need no per-repo install.
---

# dod:adopt — onboard a repo into the DoD system

The `dod:` family splits into a **machine-global layer** (the `dod` plugin: these skills plus the `dod-pr-gate.sh` PR hook — installed once, works everywhere) and a **per-repo layer** this verb installs. While DoD is personal, every per-repo artifact stays **local-only**: nothing is committed, nothing dirties `git status`.

Per-repo layer:

| Artifact | Purpose | Kept local via |
|---|---|---|
| `.claude/dod-policy.yml` | Item set + verifiers + paths, tuned to the repo | `.git/info/exclude` |
| `.claude/rules/dod-awareness.md` | Advisory nudge rule (paths-scoped) | `.git/info/exclude` |
| `**/_local/` ignore rule | Ledgers live under `_local/`; must never show as untracked | repo `.gitignore` if already there, else `.git/info/exclude` |
| `docs/` | Area folders the ledger path hangs off | created empty if missing |

---

## Step 1 — Preconditions

1. Resolve the repo root (`git rev-parse --show-toplevel`) and the shared exclude file (`$(git rev-parse --git-common-dir)/info/exclude` — worktree-safe).
2. If `.claude/dod-policy.yml` already exists, the repo is adopted — report and stop (offer re-tuning only if asked).

## Step 2 — Policy, tuned to the repo

1. Copy `${CLAUDE_PLUGIN_ROOT}/skills/init/dod-policy.template.yml` → `.claude/dod-policy.yml`.
2. Tune by inspecting the repo, and confirm the tuning with the user:
   - Non-Salesforce repo (no `force-app/`, no `sfdx-project.json`) → replace SF items (apex-tests, deploy, code-analyzer, permset…) with the repo's real equivalents; keep the schema.
   - SF repo → template usually fits as-is; conditional items self-gate via `when:` globs.
   - Check the branch/ticket convention: the parsers grep `[A-Z]+-[0-9]+` from the branch name, so any convention containing the ticket id works (`feature/PROJ-####` and `PROJ-####_desc` both parse).

## Step 3 — Awareness rule

Copy `${CLAUDE_PLUGIN_ROOT}/skills/adopt/dod-awareness.template.md` → `.claude/rules/dod-awareness.md`. Tune the `paths:` frontmatter to where substantive code lives in this repo (`force-app/**` for SF; `src/**`/`apps/**` otherwise).

## Step 4 — Local-only excludes

Append to the shared exclude file (idempotently — grep before append):

```
# DoD system (personal, local-only)
.claude/dod-policy.yml
.claude/rules/dod-awareness.md
```

Then check the repo's `.gitignore` for `**/_local/`. If absent, add `**/_local/` to the exclude file too (do NOT edit the committed `.gitignore`).

## Step 5 — docs/ scaffold

Ensure `docs/` exists (`dod:init` infers owning areas from its folders; an empty `docs/` is fine — areas get created per ticket).

## Step 6 — Verify and hand off

1. `${CLAUDE_PLUGIN_ROOT}/scripts/dod-ledger.sh <repo>` → expect `-  0  0  none` (parser runs, no ledger yet). Errors here mean a path problem — fix before declaring done.
2. `git status --short` → must show nothing new from this adoption.
3. Tell the user: the PR gate and statusline activate on `dod-policy.yml` presence but load at **session start** — live in new sessions only. Next step on a real ticket: `dod:init`.

## Guardrails

1. **Commit nothing.** Every artifact goes through `info/exclude`; if the user wants DoD shipped to the team, that's a deliberate separate decision, not this verb.
2. **Tune, don't dump.** A policy with items that can never trigger in this repo is noise — confirm the item set with the user.
3. **Idempotent.** Re-running must not duplicate exclude lines or overwrite a tuned policy.
