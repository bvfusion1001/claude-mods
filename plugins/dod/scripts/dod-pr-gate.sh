#!/bin/bash
# dod-pr-gate.sh — PreToolUse hook. Fires before `gh pr create` / `gh pr ready`.
# If the repo has adopted the dod: system (.claude/dod-policy.yml present) and
# the current ticket's DoD ledger is not green, surface a non-blocking "ask" so
# you can run dod:check first or proceed anyway. Never denies; always lets you
# through. Dormant in repos without a dod-policy.yml.
#
# Reads hook JSON on stdin: .cwd, .tool_input.command
# Emits (exit 0) PreToolUse JSON with permissionDecision when a reminder applies.

set -u
input="$(cat 2>/dev/null)"

allow() { exit 0; }   # silent allow: no JSON, default permission flow proceeds

ask() {
  # $1 = reason
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

command -v jq  >/dev/null 2>&1 || allow
command -v git >/dev/null 2>&1 || allow

# Only gate PR-creation commands. Any other Bash call passes straight through,
# so bypass/auto mode is never interrupted by this hook.
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
printf '%s' "$cmd" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+(create|ready)' || allow

cwd="$(printf '%s' "$input" | jq -r '.cwd // .workspace.current_dir // empty' 2>/dev/null)"
[ -n "$cwd" ] && [ -d "$cwd" ] || cwd="$PWD"

# Opt-in guard: only active in repos that adopted dod (policy present at repo root).
root="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)"
[ -n "$root" ] || allow
[ -f "$root/.claude/dod-policy.yml" ] || allow

# Summarize the ledger via the shared helper.
summary="$("$(dirname "$0")/dod-ledger.sh" "$cwd" 2>/dev/null)"
ticket="$(printf '%s' "$summary" | cut -f1)"
verified="$(printf '%s' "$summary" | cut -f2)"
total="$(printf '%s' "$summary" | cut -f3)"
overall="$(printf '%s' "$summary" | cut -f4)"

case "$overall" in
  green)
    allow ;;
  none)
    ask "No DoD ledger found for this branch's ticket. Run dod:init / dod:check before requesting review, or proceed with the PR anyway?" ;;
  *)
    ask "DoD ledger ${ticket} is ${verified}/${total} (${overall}). Run dod:check to verify and close gaps before requesting review, or proceed with the PR anyway?" ;;
esac
