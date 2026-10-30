#!/bin/bash
set -e

# The New Me - Automated Netlify & GitHub Deploy Script
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🚀 [The New Me] Preparing deployment from tnm-deploy..."

# Check git status
CHANGES=$(git status --porcelain)
if [ -z "$CHANGES" ]; then
  echo "✅ No changes to commit in tnm-deploy. Working tree clean."
else
  echo "📦 Staging changed files..."
  git add .

  COMMIT_MSG="${1:-chore: update site content and assets $(date '+%Y-%m-%d %H:%M:%S')}"
  git commit -m "$COMMIT_MSG"
  echo "✅ Changes committed: $COMMIT_MSG"
fi

echo "🌐 Pushing to GitHub (https://github.com/webmaskadevelopement-ship-it/imaginative-starship-122d83)..."
git push -u origin main

echo "🎉 Push successful! Netlify will automatically build and deploy within seconds."
