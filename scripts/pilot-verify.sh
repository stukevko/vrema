#!/usr/bin/env bash
# Schneller Preflight vor Pilot — lokal oder auf der VM ausführen.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Prisma Client…"
npx prisma generate >/dev/null

echo "→ Typecheck + Build…"
npm run build

echo "→ Health (falls Server läuft auf :3000)…"
if curl -fsS "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
  echo "  OK /api/health"
else
  echo "  übersprungen (kein Server auf :3000)"
fi

echo ""
echo "✓ pilot-verify.sh fertig — siehe PILOT_CHECKLIST.md und GO_LIVE.md"
