#!/bin/bash
# Start the RecruitIQ React frontend

set -e

cd "$(dirname "$0")/frontend"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " RecruitIQ — Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "node_modules" ]; then
  echo "→ Installing npm packages…"
  npm install
fi

echo "→ Starting React dev server on http://localhost:5173"
echo ""

npm run dev