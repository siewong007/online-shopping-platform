#!/usr/bin/env bash
set -Eeuo pipefail

# Single source of truth for every shell script on the backup/restore safety surface: each
# must pass bash -n and ShellCheck both here and in .github/workflows/ci.yml. Keep the two
# lists identical (CI cannot source this file: repository scripts are mode 100644 and CI must
# not depend on executable bits).
SCRIPTS=(
  deploy/deploy.sh
  deploy/backup.sh
  deploy/restore.sh
  deploy/backup-capacity.sh
  deploy/backup-env-parser.sh
  deploy/notify-backup-failure.sh
  scripts/preflight-backup.sh
  scripts/check-backup-health.sh
  scripts/restore-proof.sh
  scripts/run-all-checks.sh
  scripts/test-backup-env-parser.sh
  scripts/test-backup.sh
  scripts/test-restore.sh
  scripts/test-predeploy.sh
  scripts/test-deploy.sh
  scripts/test-backup-health.sh
  scripts/test-preflight-capacity.sh
  scripts/test-release-bundle.sh
  scripts/test-restore-atomicity.sh
  scripts/test-restore-proof-negative.sh
  scripts/test-age-header-helper.sh
  scripts/test-restore-proof-cleanup.sh
  scripts/test-snapshot-publish.sh
  scripts/test-systemd-units.sh
)

# Functional suites that need no postgres container. The three disaster-recovery suites
# (scripts/test-restore-atomicity.sh, scripts/restore-proof.sh,
# scripts/test-restore-proof-negative.sh) run in CI, which seeds an isolated database for
# them. Every suite is invoked as `bash <script>`: repository scripts are mode 100644 and
# must never be executed via a bare path.
SUITES=(
  scripts/test-backup-env-parser.sh
  scripts/test-backup.sh
  scripts/test-restore.sh
  scripts/test-predeploy.sh
  scripts/test-deploy.sh
  scripts/test-backup-health.sh
  scripts/test-preflight-capacity.sh
  scripts/test-release-bundle.sh
  scripts/test-age-header-helper.sh
  scripts/test-restore-proof-cleanup.sh
  scripts/test-snapshot-publish.sh
)

echo "=== 1. Checking script syntax with bash -n ==="
for f in "${SCRIPTS[@]}"; do
  [[ -f "$f" ]] || { echo "missing script: $f" >&2; exit 1; }
  sed 's/\r$//' "$f" | bash -n
  echo "  syntax OK: $f"
done

echo "=== 2. Running ShellCheck ==="
for f in "${SCRIPTS[@]}"; do
  sed 's/\r$//' "$f" > "/tmp/lf-$(basename "$f")"
  shellcheck -x "/tmp/lf-$(basename "$f")"
  echo "  shellcheck OK: $f"
done

echo "=== 3. Validating delivered systemd units (systemd-analyze verify) ==="
# P0-BKP-01: static gate, deliberately NOT part of SUITES (the functional-suite count stays at
# the 14 CI suites). Requires systemd-analyze, i.e. a Linux host; on other dev boxes run the
# functional suites below directly.
bash scripts/test-systemd-units.sh

echo "=== 4. Running Unit and Guardrail Test Suites ==="
for s in "${SUITES[@]}"; do
  echo "--- $s ---"
  bash "$s"
done

echo "=== ALL VERIFICATION CHECKS PASSED ==="
