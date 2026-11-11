#!/usr/bin/env bash
# Deploys new commits on main: pulls them and rebuilds what changed. Does nothing when
# the server is already up to date. Run every 5 minutes by the opas-auto-update timer
# (see install-auto-update.sh); logs: journalctl -u opas-auto-update
#
# Everything is inside main(), so bash has read the whole script before `git merge`
# can replace this file.
set -euo pipefail

main() {
  local repo
  repo="$(cd "$(dirname "$0")/../.." && pwd)"
  cd "$repo"

  git fetch --quiet origin main
  local current target
  current="$(git rev-parse HEAD)"
  target="$(git rev-parse origin/main)"
  if [ "$current" = "$target" ]; then
    exit 0
  fi

  echo "Deploying $(git rev-parse --short "$target") (was $(git rev-parse --short "$current"))"
  git merge --ff-only --quiet origin/main

  cd opas-infra/server
  docker compose up -d --build --remove-orphans
  docker image prune -f > /dev/null
  echo "Deployed $(git -C "$repo" log -1 --format='%h %s')"
}

main "$@"
