#!/bin/bash
# dod-ledger.sh — locate and summarize the Definition-of-Done ledger for the
# current ticket. Shared by the statusline segment and the dod PR-gate hook so
# the ledger location + format are parsed in exactly one place.
#
# Usage: dod-ledger.sh [dir]   (dir defaults to $PWD)
# Output (stdout, one tab-separated line):
#   TICKET <TAB> VERIFIED <TAB> TOTAL <TAB> OVERALL
#   OVERALL ∈ { green | yellow | red | none }
#     none   - no ledger found for the current branch's ticket
#     green  - every applicable (non-N/A) item is verified (🟢)
#     red    - at least one item is missing (🔴)
#     yellow - otherwise (pending/weak items remain)
# Always exits 0 and never errors; degrades to "none" on any missing dependency.

set -u
dir="${1:-$PWD}"

emit_none() { printf '%s\t%s\t%s\t%s\n' "-" "0" "0" "none"; exit 0; }

command -v git >/dev/null 2>&1 || emit_none
[ -d "$dir" ] || emit_none

branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)" || emit_none
[ -n "$branch" ] || emit_none

# Parse the JIRA ticket from the branch (e.g. feature/PROJ-1234 -> PROJ-1234).
# Segments without trailing digits never match, so only PROJECT-#### does.
ticket="$(printf '%s' "$branch" | grep -oE '[A-Z]{2,}-[0-9]+' | head -1)"
[ -n "$ticket" ] || emit_none

[ -d "$dir/docs" ] || emit_none
ledger="$(find "$dir/docs" -path "*/specs/$ticket/_local/dod-ledger.md" 2>/dev/null | head -1)"
# older ledgers are named dod-checklist.md
[ -n "$ledger" ] || ledger="$(find "$dir/docs" -path "*/specs/$ticket/_local/dod-checklist.md" 2>/dev/null | head -1)"
[ -n "$ledger" ] && [ -f "$ledger" ] || emit_none

# Count statuses over markdown list items in the checklist section only
# (skips the frontmatter, the "_Legend:_" line, and acceptance-criteria lines,
# none of which begin with "- " AND carry a status emoji).
section="$(awk '/^## Checklist/{f=1} f' "$ledger" 2>/dev/null | grep '^- ')"
# grep -Fc prints the line count (0 when none) and may exit non-zero; the
# printed number is what we want, so don't add a fallback that would double it.
count() { printf '%s' "$section" | grep -Fc "$1"; }

verified=$(count "🟢")
weak=$(count "🟡")
missing=$(count "🔴")
pending=$(count "⬜")

total=$(( verified + weak + missing + pending ))   # applicable items (excludes ⚪ N/A)
[ "$total" -gt 0 ] || emit_none

if [ "$missing" -gt 0 ]; then
  overall="red"
elif [ "$weak" -eq 0 ] && [ "$pending" -eq 0 ]; then
  overall="green"
else
  overall="yellow"
fi

printf '%s\t%s\t%s\t%s\n' "$ticket" "$verified" "$total" "$overall"
