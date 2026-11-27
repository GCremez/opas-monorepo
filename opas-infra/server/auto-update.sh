#!/usr/bin/env bash
# Deploys new commits on main: pulls them and rebuilds what changed. Does nothing when
# the server is already up to date. Run every 5 minutes by the opas-auto-update timer
# (see install-auto-update.sh); logs: journalctl -u opas-auto-update
#
# A commit is deployed only when:
#   1. its GitHub checks have all finished and none failed (a commit that touches nothing
#      CI covers has no checks; it is deployed once it has been on main for 10 minutes), and
#   2. its images build, and
#   3. the new containers come up healthy.
# If 2 or 3 fails, the server goes back to the commit and backend image it was running,
# and that commit is not tried again; the next commit on main is.
#
# What going back can't undo: a database migration the new backend already ran.
#
# Deploy without waiting for checks (e.g. GitHub is down):  OPAS_DEPLOY_SKIP_CI=1 ./auto-update.sh
#
# Everything is inside main(), so bash has read the whole script before git can replace
# this file.
set -euo pipefail

BACKEND_IMAGE=opas-backend
ROLLBACK_TAG=opas-backend:rollback
# How long the new containers get to become healthy (the backend alone needs ~90 s).
UP_TIMEOUT_SECONDS=420
# How long a commit with no checks at all waits before it is deployed.
NO_CHECKS_GRACE_SECONDS=600
CADDYFILE=opas-infra/server/Caddyfile

# Prints "passed", "pending", "failed: <names>", "none" or "unknown: <why>" for a commit.
ci_status() {
  local slug="$1" sha="$2" body
  if ! body="$(curl -sf --max-time 20 -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/$slug/commits/$sha/check-runs?per_page=100")"; then
    echo "unknown: could not reach the GitHub API"
    return
  fi
  python3 -c '
import json, sys
try:
    runs = json.load(sys.stdin)["check_runs"]
except Exception as e:
    print("unknown: unexpected answer from the GitHub API")
    sys.exit()
bad = {"failure", "cancelled", "timed_out", "action_required", "startup_failure", "stale"}
failed = sorted({r["name"] for r in runs if r.get("conclusion") in bad})
if failed:
    print("failed: " + ", ".join(failed))
elif not runs:
    print("none")
elif any(r.get("status") != "completed" for r in runs):
    print("pending")
else:
    print("passed")
' <<<"$body"
}

main() {
  local repo state current target
  repo="$(cd "$(dirname "$0")/../.." && pwd)"
  cd "$repo"
  # What is running, and which commit failed, are kept here rather than read from HEAD:
  # after a failed deploy HEAD alone can't tell "deployed" from "tried".
  state="$(git rev-parse --absolute-git-dir)/opas-deploy"
  mkdir -p "$state"

  git fetch --quiet origin main
  target="$(git rev-parse origin/main)"
  current="$(cat "$state/deployed" 2>/dev/null || git rev-parse HEAD)"
  if [ "$current" = "$target" ]; then
    exit 0
  fi
  if [ "$(cat "$state/failed" 2>/dev/null || true)" = "$target" ]; then
    exit 0 # Already tried and rolled back; wait for a newer commit.
  fi

  if [ "${OPAS_DEPLOY_SKIP_CI:-}" != "1" ]; then
    local slug status seen now
    slug="$(git remote get-url origin | sed -E 's#^(https://github\.com/|git@github\.com:)##; s#\.git$##')"
    status="$(ci_status "$slug" "$target")"
    now="$(date +%s)"
    if [ "$(cut -d' ' -f1 "$state/seen" 2>/dev/null || true)" != "$target" ]; then
      echo "$target $now" > "$state/seen"
    fi
    seen="$(cut -d' ' -f2 "$state/seen")"
    case "$status" in
      passed) ;;
      none)
        if [ $((now - seen)) -lt "$NO_CHECKS_GRACE_SECONDS" ]; then
          exit 0 # Checks may not have been created yet.
        fi
        ;;
      pending) exit 0 ;;
      failed*)
        echo "Not deploying $(git rev-parse --short "$target"): checks $status"
        exit 0
        ;;
      *)
        echo "Not deploying $(git rev-parse --short "$target") yet: $status"
        exit 0
        ;;
    esac
  fi

  echo "Deploying $(git rev-parse --short "$target") (was $(git rev-parse --short "$current"))"
  local caddy_changed=0
  git diff --quiet "$current" "$target" -- "$CADDYFILE" || caddy_changed=1

  # Keep the running backend image so there is something to go back to.
  if docker image inspect "$BACKEND_IMAGE" > /dev/null 2>&1; then
    docker tag "$BACKEND_IMAGE" "$ROLLBACK_TAG"
  fi

  git merge --ff-only --quiet "$target"
  cd opas-infra/server

  if ! docker compose build; then
    echo "Build failed for $(git rev-parse --short "$target"); still running $(git rev-parse --short "$current")"
    give_up "$repo" "$state" "$current" "$target"
    exit 1
  fi

  if ! docker compose up -d --remove-orphans --wait --wait-timeout "$UP_TIMEOUT_SECONDS"; then
    echo "$(git rev-parse --short "$target") did not come up healthy; going back to $(git rev-parse --short "$current")"
    give_up "$repo" "$state" "$current" "$target"
    cd "$repo/opas-infra/server"
    if docker image inspect "$ROLLBACK_TAG" > /dev/null 2>&1; then
      docker tag "$ROLLBACK_TAG" "$BACKEND_IMAGE"
    fi
    docker compose up -d --no-build --remove-orphans --wait --wait-timeout "$UP_TIMEOUT_SECONDS" \
      || echo "The previous version did not come up either: the API is down and needs a person"
    exit 1
  fi

  # The Caddyfile is a single mounted file. Git replaces it with a new file, which the
  # running container doesn't see, and compose doesn't recreate Caddy for it: restart.
  if [ "$caddy_changed" = 1 ]; then
    docker compose restart caddy
  fi

  echo "$target" > "$state/deployed"
  rm -f "$state/failed" "$state/seen"
  docker image prune -f > /dev/null
  echo "Deployed $(git -C "$repo" log -1 --format='%h %s')"
}

# Marks the commit as failed and puts the checkout back on what is running.
give_up() {
  local repo="$1" state="$2" current="$3" target="$4"
  echo "$target" > "$state/failed"
  echo "$current" > "$state/deployed"
  git -C "$repo" reset --hard --quiet "$current"
}

main "$@"
