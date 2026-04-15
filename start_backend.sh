#!/bin/bash
# Start the RecruitIQ FastAPI backend

set -e

cd "$(dirname "$0")/backend"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " RecruitIQ — Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create virtualenv if needed
if [ ! -d ".venv" ]; then
  echo "→ Creating virtual environment…"
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "→ Installing dependencies…"
pip install -q -r requirements.txt

echo ""
echo "→ Starting FastAPI on http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""

# Optional: set your Anthropic key here or via env
# export ANTHROPIC_API_KEY="sk-ant-..."

uvicorn main:app --host 0.0.0.0 --port 8000 --reload