#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== ProbHammer — Setup ==="

# Frontend
echo "[1/2] Installing frontend dependencies..."
cd "$ROOT/frontend"
npm ci
echo "      Done."

# Pipeline Python
echo "[2/2] Setting up Python pipeline..."
cd "$ROOT/pipeline"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --quiet
deactivate
echo "      Done."

echo ""
echo "Setup complete."
echo "  Start dev server : cd frontend && npm run dev"
echo "  Refresh data     : bash scripts/data-refresh.sh"
