#!/usr/bin/env bash
# Uso: ./deploy.sh "commit message" target_branch
# corre no diretório atual

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: $0 \"commit-message\" target_branch"
    exit 1
fi

if [ -z "${2:-}" ]; then
    echo "Usage: $0 \"commit-message\" target_branch"
    exit 1
fi

MSG="$1"
TARGET_BRANCH="$2"

# Obter branch atual
CURRENT_BRANCH=$(git branch --show-current)

# Obter nome do repo
REPO_PATH=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_PATH")

echo "Repo: $REPO_NAME"
echo "Current branch: $CURRENT_BRANCH"
echo "Target branch: $TARGET_BRANCH"

git add .
git commit -m "$MSG"
git push origin "$CURRENT_BRANCH"

if [ "${CURRENT_BRANCH,,}" = "${TARGET_BRANCH,,}" ]; then
    echo "Current branch is the same as target branch, we do not need checkout or merge"
    echo "$CURRENT_BRANCH updated"
    exit 0
fi

git checkout "$TARGET_BRANCH"
git pull origin "$TARGET_BRANCH"
git merge --no-edit "$CURRENT_BRANCH"
git push origin "$TARGET_BRANCH"
git checkout "$CURRENT_BRANCH"

echo "$TARGET_BRANCH has been updated"