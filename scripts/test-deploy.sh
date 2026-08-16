#!/usr/bin/env bash
#
# Tests for deploy/deploy.sh backup-component handling:
#   C1  verify_release_payload — the release bundle MUST ship all components from release-components.txt.
#   H3  install_backup_components — install failures are caught, reported, and never abort the
#       application deployment; the protection state is made explicit.
#   H5  verify_backup_components — "timer enabled" is not "verified": ACTIVE/VERIFIED is only
#       logged after a fresh ok status with a remote destination.
#   M4  backup.env permission enforcement before activation.
#   N-H7 backup_existing_database releases lock so verify_backup_components succeeds in the same deploy.
#
# Sources the REAL deploy.sh (entrypoint behind a source guard) with stub systemctl/install
# binaries against a temp APP_DIR/SYSTEMD_DIR/RELEASE_DIR.
#
# Requires: bash, coreutils. No age/rclone/docker needed.
# Run on any Linux host:  scripts/test-deploy.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-deploy.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

export DEPLOY_APP_DIR="$TMP/app"
export DEPLOY_SYSTEMD_DIR="$TMP/systemd"
export DEPLOY_BACKUP_DIR="$TMP/app/backups"
mkdir -p "$DEPLOY_APP_DIR" "$DEPLOY_SYSTEMD_DIR" "$DEPLOY_BACKUP_DIR"

FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

cat > "$FAKEBIN/systemctl" <<'SYS'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${FAKEBIN_DIR:-/nonexistent}/systemctl.log"
case "${1:-}" in
  daemon-reload) exit 0 ;;
  enable)
    if [[ "${FAKE_SYSTEMCTL_ENABLE_FAIL:-0}" == "1" ]]; then
      echo "systemctl enable failed" >&2
      exit 1
    fi
    exit 0 ;;
  disable|stop) exit 0 ;;
  *) exit 0 ;;
esac
SYS
chmod 0700 "$FAKEBIN/systemctl"

cat > "$FAKEBIN/install" <<'INST'
#!/usr/bin/env bash
if [[ "${FAKE_INSTALL_FAIL:-0}" == "1" ]]; then
  echo "install failed" >&2
  exit 1
fi
exec /usr/bin/install "$@"
INST
chmod 0700 "$FAKEBIN/install"

cat > "$FAKEBIN/docker" <<'DOCKER'
#!/usr/bin/env bash
case "${1:-}" in
  inspect)
    printf 'true\n'
    exit 0 ;;
  exec)
    printf 'PGDMP-MOCK\n'
    exit 0 ;;
  *) exit 0 ;;
esac
DOCKER
chmod 0700 "$FAKEBIN/docker"

cat > "$FAKEBIN/age" <<'AGE'
#!/usr/bin/env bash
out=""
prev=""
for a in "$@"; do
  if [[ "$prev" == "-o" || "$prev" == "--output" ]]; then out="$a"; fi
  prev="$a"
done
printf 'age-encryption.org/v1\n-> X25519 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n' > "$out"
cat >> "$out"
exit 0
AGE
chmod 0700 "$FAKEBIN/age"

export PATH="$FAKEBIN:$PATH"
export FAKEBIN_DIR="$FAKEBIN"
export APP_DIR="$DEPLOY_APP_DIR"
export RELEASE_DIR="$TMP/release"

# Source the real deploy.sh (LF-normalized; the parser is copied next to it like a real install).
LF_DEPLOY="$TMP/deploy.sh"
sed 's/\r$//' "$ROOT/deploy/deploy.sh" > "$LF_DEPLOY"
cp "$ROOT/deploy/backup-env-parser.sh" "$TMP/backup-env-parser.sh"
# shellcheck disable=SC1090,SC1091,SC1094
source "$LF_DEPLOY"

make_release() {
  rm -rf "$RELEASE_DIR"
  mkdir -p "$RELEASE_DIR/images" "$RELEASE_DIR/initdb"
  cp "$ROOT/deploy/release-components.txt" "$RELEASE_DIR/release-components.txt"
  while IFS=$'\t' read -r _src target || [[ -n "$target" ]]; do
    [[ -n "$target" ]] || continue
    touch "$RELEASE_DIR/$target"
  done < "$RELEASE_DIR/release-components.txt"
  touch "$RELEASE_DIR/SHA256SUMS" \
        "$RELEASE_DIR/images/backend.tar.gz" \
        "$RELEASE_DIR/images/frontend.tar.gz" \
        "$RELEASE_DIR/initdb/0001_init.sql"
}

reset_install_state() {
  rm -rf "${DEPLOY_APP_DIR:?}"/* "${DEPLOY_SYSTEMD_DIR:?}"/*
  mkdir -p "$DEPLOY_APP_DIR" "$DEPLOY_SYSTEMD_DIR"
  : > "$FAKEBIN/systemctl.log"
  unset FAKE_INSTALL_FAIL FAKE_SYSTEMCTL_ENABLE_FAIL || true
}

expect_rc() {
  local name="$1" expected="$2"
  shift 2
  local rc=0
  set +e
  ( "$@" ) >"$TMP/.out" 2>&1
  rc=$?
  set -e
  if [[ "$rc" == "$expected" ]]; then
    PASS=$((PASS + 1)); echo "ok:   $name"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name — expected rc $expected, got $rc"
    sed 's/^/      /' "$TMP/.out" | head -n 10
  fi
}

assert_output() {
  local name="$1" needle="$2"
  if grep -qF -- "$needle" "$TMP/.out"; then
    PASS=$((PASS + 1)); echo "ok:   $name"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name — output missing '$needle'"
    sed 's/^/      /' "$TMP/.out" | head -n 10
  fi
}

# ------------------------------------------------------------------------------------------
# C1: complete release bundle -> payload accepted
# ------------------------------------------------------------------------------------------
make_release
expect_rc "release_bundle_complete_ok" 0 verify_release_payload "$RELEASE_DIR"

# ------------------------------------------------------------------------------------------
# C1: missing backup components -> FAILS LOUDLY
# ------------------------------------------------------------------------------------------
make_release
rm -f "$RELEASE_DIR/backup.sh"
expect_rc "missing_backup_sh_fails_payload" 1 verify_release_payload "$RELEASE_DIR"
assert_output "missing_backup_sh_message" "missing backup.sh"

make_release
rm -f "$RELEASE_DIR/backup-env-parser.sh"
expect_rc "missing_parser_fails_payload" 1 verify_release_payload "$RELEASE_DIR"

make_release
rm -f "$RELEASE_DIR/preflight-backup.sh"
expect_rc "missing_preflight_fails_payload" 1 verify_release_payload "$RELEASE_DIR"

make_release
rm -f "$RELEASE_DIR/online-shopping-backup-health.service"
expect_rc "missing_health_service_fails_payload" 1 verify_release_payload "$RELEASE_DIR"

# ------------------------------------------------------------------------------------------
# H3: happy path — installs, daemon-reload, timer ACTIVE (verification pending), rc 0
# ------------------------------------------------------------------------------------------
reset_install_state
make_release
cat > "$DEPLOY_APP_DIR/backup.env" <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=/backups
EOF
chmod 0600 "$DEPLOY_APP_DIR/backup.env"
expect_rc "install_backup_components_ok" 0 install_backup_components
assert_output "install_reports_timer_active" "timer ACTIVE"
grep -q 'daemon-reload' "$FAKEBIN/systemctl.log" || { echo "FAIL: daemon-reload not called"; FAIL=$((FAIL+1)); }

# ------------------------------------------------------------------------------------------
# H3: systemctl enable failure -> NOT ACTIVE warning, deployment continues (rc 0)
# ------------------------------------------------------------------------------------------
reset_install_state
make_release
cat > "$DEPLOY_APP_DIR/backup.env" <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=/backups
EOF
chmod 0600 "$DEPLOY_APP_DIR/backup.env"
FAKE_SYSTEMCTL_ENABLE_FAIL=1 expect_rc "systemctl_enable_failure_nonfatal" 0 install_backup_components
assert_output "systemctl_failure_reports_not_active" "NOT ACTIVE"

# ------------------------------------------------------------------------------------------
# H3: unit install failure (SYSTEMD_DIR is a file, so install fails) -> NOT ACTIVE warning, rc 0
# ------------------------------------------------------------------------------------------
reset_install_state
make_release
rm -rf "$DEPLOY_SYSTEMD_DIR"
touch "$DEPLOY_SYSTEMD_DIR"   # a file, so install into it fails
expect_rc "unit_install_failure_nonfatal" 0 install_backup_components
assert_output "unit_install_failure_reports_not_active" "NOT ACTIVE"
assert_output "unit_install_failure_continues_deploy" "application deployment continues"
rm -f "$DEPLOY_SYSTEMD_DIR"
mkdir -p "$DEPLOY_SYSTEMD_DIR"

# ------------------------------------------------------------------------------------------
# H3: script install failure -> NOT AVAILABLE warning, rc 0
# ------------------------------------------------------------------------------------------
reset_install_state
make_release
export FAKE_INSTALL_FAIL=1
if install_backup_components >"$TMP/.out" 2>&1; then
  PASS=$((PASS + 1)); echo "ok:   script_install_failure_nonfatal"
else
  FAIL=$((FAIL + 1)); echo "FAIL: script_install_failure_nonfatal"
fi
unset FAKE_INSTALL_FAIL
assert_output "script_install_failure_reports" "NOT AVAILABLE"

# ------------------------------------------------------------------------------------------
# M4: backup.env with group/other-readable mode -> activation refused (DISABLED)
# ------------------------------------------------------------------------------------------
reset_install_state
make_release
cat > "$DEPLOY_APP_DIR/backup.env" <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=/backups
EOF
chmod 0644 "$DEPLOY_APP_DIR/backup.env"
expect_rc "world_readable_env_refuses_activation" 0 install_backup_components
assert_output "world_readable_env_reports_disabled" "DISABLED"

# ------------------------------------------------------------------------------------------
# M4: malformed backup.env (not KEY=VALUE) -> activation refused (strict parser)
# ------------------------------------------------------------------------------------------
reset_install_state
make_release
cat > "$DEPLOY_APP_DIR/backup.env" <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
this line is not KEY=VALUE
BACKUP_RCLONE_PATH=/backups
EOF
chmod 0600 "$DEPLOY_APP_DIR/backup.env"
expect_rc "malformed_env_refuses_activation" 0 install_backup_components
assert_output "malformed_env_reports_disabled" "DISABLED"

# ------------------------------------------------------------------------------------------
# M12: a $(...) value is treated as LITERAL TEXT, never evaluated as shell
# ------------------------------------------------------------------------------------------
reset_install_state
make_release
rm -f "$TMP/pwned"
cat > "$DEPLOY_APP_DIR/backup.env" <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=\$(touch $TMP/pwned)
BACKUP_RCLONE_PATH=/backups
EOF
chmod 0600 "$DEPLOY_APP_DIR/backup.env"
expect_rc "shell_value_not_evaluated_ok" 0 install_backup_components
if [[ -e "$TMP/pwned" ]]; then
  echo "FAIL: backup.env value was evaluated as shell code"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   backup_env_never_evaluated_as_shell"
fi

# ------------------------------------------------------------------------------------------
# H5: verification run proves a real ok + remote destination -> ACTIVE and VERIFIED
# ------------------------------------------------------------------------------------------
reset_install_state
cat > "$DEPLOY_APP_DIR/backup.sh" <<STUB
#!/usr/bin/env bash
cat > "$DEPLOY_APP_DIR/backup-status.json" <<'EOF'
{"status": "ok", "error_category": null, "last_attempt": "x", "last_success": "x", "filename": "a.dump.age", "encrypted_size": 1, "remote_destination_identifier": "proof-remote:/backups/a.dump.age"}
EOF
exit 0
STUB
chmod 0750 "$DEPLOY_APP_DIR/backup.sh"
expect_rc "verify_backup_ok" 0 verify_backup_components
assert_output "verify_reports_verified" "ACTIVE and VERIFIED"

# ------------------------------------------------------------------------------------------
# H5: verification run fails -> NOT VERIFIED warning (rc 0, deploy outcome unaffected)
# ------------------------------------------------------------------------------------------
reset_install_state
cat > "$DEPLOY_APP_DIR/backup.sh" <<STUB
#!/usr/bin/env bash
cat > "$DEPLOY_APP_DIR/backup-status.json" <<'EOF'
{"status": "error", "error_category": "upload_failed", "last_attempt": "x", "last_success": "x", "filename": "", "encrypted_size": null, "remote_destination_identifier": null}
EOF
exit 1
STUB
chmod 0750 "$DEPLOY_APP_DIR/backup.sh"
expect_rc "verify_backup_failure_nonfatal" 0 verify_backup_components
assert_output "verify_reports_not_verified" "NOT VERIFIED"

# ------------------------------------------------------------------------------------------
# N-H7: sequential pre-deploy backup -> verify_backup_components in the SAME process
# ------------------------------------------------------------------------------------------
reset_install_state
cat > "$DEPLOY_APP_DIR/backup.env" <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=/backups
EOF
chmod 0600 "$DEPLOY_APP_DIR/backup.env"
cat > "$DEPLOY_APP_DIR/backup.sh" <<'STUB'
#!/usr/bin/env bash
exec 9>"$DEPLOY_APP_DIR/backup.lock"
flock -n 9 || { echo "lock contended in verify step" >&2; exit 1; }
cat > "$DEPLOY_APP_DIR/backup-status.json" <<'EOF'
{"status": "ok", "error_category": null, "last_attempt": "x", "last_success": "x", "filename": "a.dump.age", "encrypted_size": 1, "remote_destination_identifier": "proof-remote:/backups/a.dump.age"}
EOF
exit 0
STUB
chmod 0750 "$DEPLOY_APP_DIR/backup.sh"
# shellcheck disable=SC2016
expect_rc "predeploy_then_verify_lock_unlocked" 0 bash -c '
  export DEPLOY_APP_DIR="'"$DEPLOY_APP_DIR"'"
  export DEPLOY_BACKUP_DIR="'"$DEPLOY_BACKUP_DIR"'"
  export PATH="'"$FAKEBIN"':$PATH"
  source "'"$LF_DEPLOY"'"
  backup_existing_database
  verify_backup_components
'
assert_output "sequential_run_verifies" "ACTIVE and VERIFIED"

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-DEPLOY: FAIL"
  exit 1
fi
echo "TEST-DEPLOY: PASS"
exit 0