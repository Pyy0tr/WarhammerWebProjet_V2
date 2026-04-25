#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== ProbHammer — Data refresh ==="

cd "$ROOT/pipeline"

if [ ! -d ".venv" ]; then
  echo "Python venv not found. Run scripts/setup.sh first."
  exit 1
fi

source .venv/bin/activate

echo "[1/4] Fetching BSData..."
python fetch_bsdata.py

echo "[2/4] Parsing XML..."
python parse_bsdata.py

echo "[3/4] Building frontend JSON..."
python build_frontend_data.py

echo "[4/4] Auditing data quality..."
python audit.py

deactivate
echo ""
echo "Data refresh complete. Restart npm run dev to pick up changes."
