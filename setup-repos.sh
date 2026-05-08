#!/usr/bin/env bash
# setup-repos.sh
# Run this once to initialise all three Opas repos and push to GitHub.
# Prerequisites: git, gh (GitHub CLI) installed and authenticated.

set -euo pipefail

GITHUB_ORG="GCremez"

repos=(opas-backend opas-mobile opas-infra)

for repo in "${repos[@]}"; do
  echo "==> Setting up $repo"

  cd "$repo"

  # Init git
  git init
  git checkout -b main

  # Initial commit
  git add -A
  git commit -m "chore: initial scaffold"

  # Create private GitHub repo and push
  gh repo create "$GITHUB_ORG/$repo" \
    --private \
    --description "Opas — $repo" \
    --push \
    --source .

  # Create develop branch
  git checkout -b develop
  git push -u origin develop

  # Switch back to main
  git checkout main

  cd ..
  echo "  Done: https://github.com/$GITHUB_ORG/$repo"
done

echo ""
echo "All repos created. Next steps:"
echo "  1. Set branch protection on 'main' for each repo (require PR + 1 review)"
echo "  2. Add GitHub secrets (ANTHROPIC_API_KEY, JWT keys, STRIPE keys, EXPO_TOKEN)"
echo "  3. Set 'production' environment with required reviewer in each repo"
echo "  4. Update app.json EAS project ID after running: eas init"
