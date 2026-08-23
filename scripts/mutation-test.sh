#!/usr/bin/env bash
# Phase 16: Mutation testing runner.
#
# Usage:
#   bash scripts/mutation-test.sh              # run the full mutation suite
#   bash scripts/mutation-test.sh loader       # run on app/leb/data/loader.py only
#   bash scripts/mutation-test.sh analytics    # run on app/leb/data/analytics.py
#
# Prerequisites (Linux/macOS):
#   pip install mutmut cosmic-ray
#
# Prerequisites (Windows):
#   - WSL (mutmut refuses to run natively on Windows — tracked upstream
#     at https://github.com/boxed/mutmut/issues/397)
#   - OR run cosmic-ray on a Linux runner (CI / Docker)
#
# What this does:
#   1. Baseline run: invokes the test suite against unmutated code.
#      If tests pass on the baseline, mutations are guaranteed a "pass"
#      baseline and only surviving mutants are real.
#   2. Mutation run: applies each mutation in turn, re-runs the test suite.
#      A mutation "survives" if all tests still pass (the test suite did
#      not catch the bug).
#   3. Report: lists surviving mutants + their location, which is the
#      list of tests to write next.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "================================================================="
echo "Phase 16: Mutation testing — leiloes-pt-v4"
echo "================================================================="

# Pick module based on arg
case "${1:-loader}" in
  loader)
    MODULE="app/leb/data/loader.py"
    TESTS="tests/test_data_loader.py"
    ;;
  analytics)
    MODULE="app/leb/data/analytics.py"
    TESTS="tests/test_analytics_geo.py"
    ;;
  geo)
    MODULE="app/leb/data/geo_portugal.py"
    TESTS="tests/test_analytics_geo.py"
    ;;
  *)
    echo "Unknown module: $1"
    echo "Choices: loader | analytics | geo"
    exit 1
    ;;
esac

# Update toml with chosen module
cat > cosmic-ray.toml <<EOF
[cosmic-ray]
module-path = "$MODULE"
python = "python"
test-command = "PYTHONPATH= python -m pytest $TESTS -x -q"
timeout = 30.0

[cosmic-ray.exclude]
glob = ["**/__pycache__/**"]

[cosmic-ray.distributor]
name = "local"
EOF

echo ""
echo "Module: $MODULE"
echo "Tests:  $TESTS"
echo ""

# Step 1: Baseline
echo "[1/3] Running baseline test execution..."
rm -f session.toml
python -m cosmic_ray.cli baseline cosmic-ray.toml --session-file session.toml

# Step 2: Mutation run
echo ""
echo "[2/3] Running mutations (this may take 5-30 minutes)..."
echo "      Mutations queue length determines runtime — abort with Ctrl-C if needed."
python -m cosmic_ray.cli exec cosmic-ray.toml session.toml

# Step 3: Report
echo ""
echo "[3/3] Mutation results:"
python -m cosmic_ray.cli dump session.toml | python -c "
import json, sys
data = json.load(sys.stdin)
survivors = []
for job in data:
    if 'mutations' in job:
        for mut in job.get('mutations', []):
            if mut.get('status') == 'survived':
                survivors.append(mut)

if not survivors:
    print('  PASS: 0 surviving mutants — test suite caught every mutation.')
    print('         Phase 16 = DONE for this module.')
    sys.exit(0)

print(f'  TOTAL surviving mutants: {len(survivors)}')
print('  These represent test gaps — write a test that would FAIL under')
print('  each mutation, then re-run mutation testing.')
print()
for m in survivors[:20]:  # show first 20
    print(f'  - {m[\"module\"]}:{m[\"line\"]}  operator={m.get(\"operator\")}')
    print(f'      → write a test that fails when this mutation is applied')
if len(survivors) > 20:
    print(f'  ... and {len(survivors)-20} more')
" 2>/dev/null || echo "(dump failed — see session.toml)"

echo ""
echo "================================================================="
echo "Done. Session saved to session.toml"
echo "Full results: python -m cosmic_ray.cli dump session.toml"
echo "================================================================="
