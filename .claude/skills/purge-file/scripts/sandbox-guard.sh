#!/bin/bash
# Sandbox Guard Hook - Intercepts dangerous Bash commands before execution.
# Called by Claude Code's PreToolUse hook for ALL Bash tool uses.
# The permission allowlist does NOT bypass this hook — it is the backstop.
#
# This is the HARDENED starter build:
#   - Check 1 blocks ALL `rm` (not just `rm -rf`).
#   - A dedicated check blocks home-directory (~) paths.
# See 98_DOC/04-security.md for what is blocked and the known gaps,
# and 98_DOC/05-sandbox-guard.md for how to loosen these rules deliberately.

# Read JSON input from stdin (contains the command to be executed)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Get project root directory (three levels up from Skills/purge-file/scripts/)
PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

# 1. Block dangerous commands. NOTE: \brm\b blocks ALL rm, not only `rm -rf`.
BLOCKED_COMMANDS="\brm\b|\bsudo\b|\bchmod\b|\bchown\b|\bcurl\b|\bwget\b|\bncat\b|\bssh\b|\bscp\b|\bsftp\b|\bdd\b|\bmkfs\b|\bmount\b|\bumount\b|\bkill\b|\bkillall\b|\bpkill\b|\bshutdown\b|\breboot\b|\bsystemctl\b|\beval\b|\bexec\b"
if echo "$COMMAND" | grep -qiE "$BLOCKED_COMMANDS"; then
  echo "BLOCKED: Command contains prohibited operation: $COMMAND" >&2
  exit 2
fi

# 2. Block path traversal attempts (../ trying to escape project directory)
if echo "$COMMAND" | grep -qE '\.\./|\.\.\\'; then
  echo "BLOCKED: Use of .. to escape project directory is prohibited" >&2
  exit 2
fi

# 3. Block home-directory (~) paths — ~ expands outside the project.
if echo "$COMMAND" | grep -qE '(^|[[:space:]])~'; then
  echo "BLOCKED: Home-directory (~) paths are prohibited; stay inside the project" >&2
  exit 2
fi

# 4. Block absolute paths outside project (allow /tmp, /dev, system bin dirs, /Library, and $PROJECT_ROOT)
if echo "$COMMAND" | grep -qE '(^|[[:space:]])/[a-zA-Z]'; then
  ABS_PATHS=$(echo "$COMMAND" | grep -oE '(^|[[:space:]])/[^ ]+' | sed 's/^[[:space:]]*//')
  for P in $ABS_PATHS; do
    # Skip if it's part of a relative path (./something or ../something)
    if echo "$COMMAND" | grep -qE "\\.${P}"; then
      continue
    fi
    case "$P" in
      "$PROJECT_ROOT"*|/tmp*|/dev/*|/usr/bin/*|/usr/local/bin/*|/bin/*|/Library/*) ;; # Allowed
      *) echo "BLOCKED: Access to path outside project directory prohibited: $P" >&2; exit 2 ;;
    esac
  done
fi

# 5. Block direct HTTP requests via node/python (must use MCP Server)
if echo "$COMMAND" | grep -qiE "http\.request|https\.request|fetch\(|requests\.(get|post)|urllib"; then
  echo "BLOCKED: Direct HTTP requests are prohibited; use an MCP Server instead" >&2
  exit 2
fi

# All checks passed
exit 0
