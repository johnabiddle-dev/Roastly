#!/bin/bash
set -e

echo "=== Roastly Deploy Script ==="
echo "This will deploy the latest local changes (e.g. 5 roast options per vibe) to Vercel Production."

# Go to project root (adjust if your path is different)
PROJECT_DIR="$HOME/Developer/roastly"
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: $PROJECT_DIR not found. Please cd to the project first or edit this script."
  exit 1
fi

cd "$PROJECT_DIR"

echo "Current directory: $(pwd)"
echo ""

# Optional: show what will be deployed (uncommitted changes)
echo "Files that will be included (local filesystem):"
git status --porcelain | head -20 || echo "(no git status, deploying current files anyway)"

echo ""
read -p "Ready to deploy to PRODUCTION with 'vercel --prod'? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deploy cancelled."
  exit 0
fi

echo "Running: vercel --prod"
vercel --prod

echo ""
echo "✅ Deploy triggered! Watch the output above for the new deployment URL."
echo "After it finishes, hard refresh your browser and test generating roasts — you should now see 5 options per vibe."
