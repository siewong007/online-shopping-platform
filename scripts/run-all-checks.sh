#!/usr/bin/env bash
set -Eeuo pipefail

echo "=== 1. Checking script syntax with bash -n ==="
SCRIPTS=(
  deploy/deploy.sh
  deploy/backup.sh
  deploy/restore.sh
  deploy/backup-env-parser.sh
  scripts/preflight-backup.sh
  scripts/check-backup-health.sh
  scripts/restore-proof.sh
  scripts/test-backup.sh
  scripts/test-restore.sh
  scripts/test-predeploy.sh
  scripts/test-deploy.sh
  scripts/test-backup-env-parser.sh
  scripts/test-backup-health.sh
  scripts/test-release-bundle.sh
  scripts/test-restore-atomicity.sh
  scripts/test-restore-proof-negative.sh
)

for f in "${SCRIPTS[@]}"; do
  sed 's/\r$//' "$f" | bash -n
  echo "  syntax OK: $f"
done

echo "=== 2. Running ShellCheck ==="
for f in "${SCRIPTS[@]}"; do
  sed 's/\r$//' "$f" > "/tmp/lf-$(basename "$f")"
  shellcheck -x "/tmp/lf-$(basename "$f")"
  echo "  shellcheck OK: $f"
done

echo "=== 3. Running Unit and Guardrail Test Suites ==="

echo "--- test-backup-env-parser.sh ---"
sed 's/\r$//' scripts/test-backup-env-parser.sh | bash

echo "--- test-backup.sh ---"
sed 's/\r$//' scripts/test-backup.sh | bash

echo "--- test-restore.sh ---"
sed 's/\r$//' scripts/test-restore.sh | bash

echo "--- test-predeploy.sh ---"
sed 's/\r$//' scripts/test-predeploy.sh | bash

echo "--- test-deploy.sh ---"
sed 's/\r$//' scripts/test-deploy.sh | bash

echo "--- test-backup-health.sh ---"
sed 's/\r$//' scripts/test-backup-health.sh | bash

echo "--- test-release-bundle.sh ---"
sed 's/\r$//' scripts/test-release-bundle.sh | bash

echo "=== ALL VERIFICATION CHECKS PASSED ==="
