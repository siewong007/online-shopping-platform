#!/usr/bin/env bash
#
# Release bundle completeness smoke test for online-shopping-platform.
#
# Uses the SAME manifest (deploy/release-components.txt) as the CI/deploy workflow to build a
# real release bundle, and proves:
#   - every declared component exists in the repository,
#   - the bundle packages all files, generates SHA256SUMS and passes sha256sum --check,
#   - deploy.sh's verify_release_payload accepts the complete bundle and rejects an incomplete one,
#   - deploy.sh loads successfully directly from the bundle directory,
#   - installed backup components in APP_DIR resolve backup-env-parser.sh without error.
#
# Requires: bash, coreutils, tar.
# Run: scripts/test-release-bundle.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT/deploy/release-components.txt"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-release-bundle.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

[[ -f "$MANIFEST" ]] || { echo "FAIL: manifest not found: $MANIFEST" >&2; exit 1; }

echo "== 1. Verifying all manifest components exist in the repository =="
while IFS=$'\t' read -r src target || [[ -n "$src" ]]; do
  [[ -n "$src" && -n "$target" ]] || continue
  if [[ -s "$ROOT/$src" ]]; then
    PASS=$((PASS + 1))
    echo "  ok: $src exists and non-empty (target: $target)"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: manifest source missing or empty: $src" >&2
  fi
done < "$MANIFEST"

echo "== 2. Building real release bundle from manifest =="
BUNDLE_DIR="$TMP/bundle"
mkdir -p "$BUNDLE_DIR/images" "$BUNDLE_DIR/initdb"

# Mock dummy release images
printf 'fake-backend-image' | gzip -1 > "$BUNDLE_DIR/images/backend.tar.gz"
printf 'fake-frontend-image' | gzip -1 > "$BUNDLE_DIR/images/frontend.tar.gz"

# Mock initdb migration
cp "$ROOT"/backend/migrations/*.sql "$BUNDLE_DIR/initdb/" 2>/dev/null || touch "$BUNDLE_DIR/initdb/0001_init.sql"

# Copy manifest and all components from manifest
cp "$MANIFEST" "$BUNDLE_DIR/release-components.txt"
while IFS=$'\t' read -r src target || [[ -n "$src" ]]; do
  [[ -n "$src" && -n "$target" ]] || continue
  cp "$ROOT/$src" "$BUNDLE_DIR/$target"
done < "$MANIFEST"

# Generate SHA256SUMS inside bundle
(
  cd "$BUNDLE_DIR"
  # shellcheck disable=SC2094
  find . -type f ! -name SHA256SUMS -print0 \
    | sort -z \
    | xargs -0 sha256sum > SHA256SUMS
)

# Verify SHA256SUMS
if ( cd "$BUNDLE_DIR" && sha256sum --check SHA256SUMS >/dev/null 2>&1 ); then
  PASS=$((PASS + 1))
  echo "ok:   sha256sum check passes on generated bundle"
else
  FAIL=$((FAIL + 1))
  echo "FAIL: sha256sum check failed on bundle"
fi

echo "== 3. Testing verify_release_payload from deploy.sh =="
# Source deploy.sh from bundle to load verify_release_payload function
# Normalize LF for sourcing; the source guard requires backup-env-parser.sh AND backup-capacity.sh
# NEXT TO the copied deploy.sh (it cannot see the real repo layout).
sed 's/\r$//' "$BUNDLE_DIR/deploy.sh" > "$TMP/deploy_test.sh"
cp "$BUNDLE_DIR/backup-env-parser.sh" "$TMP/backup-env-parser.sh"
cp "$BUNDLE_DIR/backup-capacity.sh" "$TMP/backup-capacity.sh"
# shellcheck disable=SC1090,SC1091
source "$TMP/deploy_test.sh"

# Complete bundle payload verification must succeed
if verify_release_payload "$BUNDLE_DIR" >/dev/null 2>&1; then
  PASS=$((PASS + 1))
  echo "ok:   verify_release_payload accepts complete bundle"
else
  FAIL=$((FAIL + 1))
  echo "FAIL: verify_release_payload rejected complete bundle"
fi

# Negative test: missing backup-env-parser.sh fails payload verification
# (verify_release_payload aborts via die/exit on a broken bundle, so it runs in a subshell)
BAD_BUNDLE="$TMP/bad_bundle"
cp -r "$BUNDLE_DIR" "$BAD_BUNDLE"
rm -f "$BAD_BUNDLE/backup-env-parser.sh"
if ( verify_release_payload "$BAD_BUNDLE" >/dev/null 2>&1 ); then
  FAIL=$((FAIL + 1))
  echo "FAIL: verify_release_payload accepted bundle missing backup-env-parser.sh"
else
  PASS=$((PASS + 1))
  echo "ok:   verify_release_payload rejects bundle missing backup-env-parser.sh"
fi

# Negative test: missing preflight-backup.sh fails payload verification
rm -rf "$BAD_BUNDLE"
cp -r "$BUNDLE_DIR" "$BAD_BUNDLE"
rm -f "$BAD_BUNDLE/preflight-backup.sh"
if ( verify_release_payload "$BAD_BUNDLE" >/dev/null 2>&1 ); then
  FAIL=$((FAIL + 1))
  echo "FAIL: verify_release_payload accepted bundle missing preflight-backup.sh"
else
  PASS=$((PASS + 1))
  echo "ok:   verify_release_payload rejects bundle missing preflight-backup.sh"
fi

# N3 negative: an EMPTY manifest must fail the independent hard-minimum count, even though every
# bundle file (images, initdb, SHA256SUMS) is present.
rm -rf "$BAD_BUNDLE"
cp -r "$BUNDLE_DIR" "$BAD_BUNDLE"
: > "$BAD_BUNDLE/release-components.txt"
if ( verify_release_payload "$BAD_BUNDLE" >/dev/null 2>&1 ); then
  FAIL=$((FAIL + 1))
  echo "FAIL: verify_release_payload accepted bundle with an empty manifest"
else
  PASS=$((PASS + 1))
  echo "ok:   verify_release_payload rejects bundle with an empty manifest"
fi

# N3 negative: a truncated manifest (only the first entry) must fail the hard-minimum count.
rm -rf "$BAD_BUNDLE"
cp -r "$BUNDLE_DIR" "$BAD_BUNDLE"
head -n 1 "$BAD_BUNDLE/release-components.txt" > "$BAD_BUNDLE/release-components.txt.tmp"
mv "$BAD_BUNDLE/release-components.txt.tmp" "$BAD_BUNDLE/release-components.txt"
if ( verify_release_payload "$BAD_BUNDLE" >/dev/null 2>&1 ); then
  FAIL=$((FAIL + 1))
  echo "FAIL: verify_release_payload accepted bundle with a truncated manifest"
else
  PASS=$((PASS + 1))
  echo "ok:   verify_release_payload rejects bundle with a truncated manifest"
fi

echo "== 4. Testing runtime parser resolution in bundle deploy.sh =="
# Running bash deploy.sh in the bundle directory must load backup-env-parser.sh and show usage / check EUID
OUT=$(bash "$BUNDLE_DIR/deploy.sh" 2>&1 || true)
if grep -q "run this script as root" <<<"$OUT" || grep -q "image tag must be" <<<"$OUT"; then
  PASS=$((PASS + 1))
  echo "ok:   bundle deploy.sh loads backup-env-parser.sh and reaches validation"
else
  FAIL=$((FAIL + 1))
  echo "FAIL: bundle deploy.sh failed to load parser: $OUT"
fi

echo "== 5. Testing installed layout in mock APP_DIR =="
MOCK_APP="$TMP/opt_app"
mkdir -p "$MOCK_APP"
# Simulate install_backup_components
install -m 0750 "$BUNDLE_DIR/backup.sh" "$MOCK_APP/backup.sh"
install -m 0750 "$BUNDLE_DIR/restore.sh" "$MOCK_APP/restore.sh"
install -m 0644 "$BUNDLE_DIR/backup-capacity.sh" "$MOCK_APP/backup-capacity.sh"
install -m 0644 "$BUNDLE_DIR/backup-env-parser.sh" "$MOCK_APP/backup-env-parser.sh"
install -m 0750 "$BUNDLE_DIR/preflight-backup.sh" "$MOCK_APP/preflight-backup.sh"
install -m 0750 "$BUNDLE_DIR/check-backup-health.sh" "$MOCK_APP/check-backup-health.sh"
install -m 0750 "$BUNDLE_DIR/notify-backup-failure.sh" "$MOCK_APP/notify-backup-failure.sh"
install -m 0644 "$BUNDLE_DIR/backup.env.example" "$MOCK_APP/backup.env.example"

# Mock config
cat > "$MOCK_APP/backup.env" <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=remote
BACKUP_RCLONE_PATH=path
EOF
chmod 0600 "$MOCK_APP/backup.env"

# Prove installed preflight-backup.sh can parse config via installed backup-env-parser.sh
OUT_PREFLIGHT=$(PREFLIGHT_APP_DIR="$MOCK_APP" PREFLIGHT_CONFIG_FILE="$MOCK_APP/backup.env" bash "$MOCK_APP/preflight-backup.sh" 2>&1 || true)
if grep -q "config parses strictly" <<<"$OUT_PREFLIGHT"; then
  PASS=$((PASS + 1))
  echo "ok:   installed preflight-backup.sh loads installed backup-env-parser.sh"
else
  FAIL=$((FAIL + 1))
  echo "FAIL: installed preflight-backup.sh failed to load parser: $OUT_PREFLIGHT"
fi

# Prove installed notify-backup-failure.sh runs from the installed layout and writes the marker
# with no configured hook (N4: marker + hook=<none> is the actionable no-hook state).
OUT_NOTIFY=$(NOTIFY_APP_DIR="$MOCK_APP" NOTIFY_STATUS_FILE="$MOCK_APP/backup-status.json" bash "$MOCK_APP/notify-backup-failure.sh" 2>&1 || true)
if [[ -f "$MOCK_APP/backup-failure.marker" ]] && grep -q "hook=<none>" "$MOCK_APP/backup-failure.marker"; then
  PASS=$((PASS + 1))
  echo "ok:   installed notify-backup-failure.sh writes marker without hook"
else
  FAIL=$((FAIL + 1))
  echo "FAIL: installed notify-backup-failure.sh marker missing: $OUT_NOTIFY"
fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-RELEASE-BUNDLE: FAIL"
  exit 1
fi
echo "TEST-RELEASE-BUNDLE: PASS"
exit 0
