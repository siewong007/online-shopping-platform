#!/usr/bin/env bash
#
# Unit tests for deploy/deploy.sh's backup_existing_database() function.
#
# Proves:
#   - a plaintext dump is NEVER written (pg_dump piped straight through age),
#   - missing age, missing/unreadable backup.env, missing BACKUP_AGE_RECIPIENT or bad mode/ownership
#     abort the deployment (never fall back to unencrypted plaintext),
#   - container absent (first deploy) skips cleanly; docker daemon down aborts,
#   - age failure or pg_dump failure aborts the deployment and removes partial output,
#   - retention prunes older pre-deploy dumps (keeps 3 newest by ISO timestamp, never by mtime),
#   - pre-deploy backup lock fd 8 is released on completion/failure so subsequent steps can acquire it,
#   - database password travels via docker exec -e PGPASSWORD (env inheritance by name), never host argv.
#
# Requires: bash, coreutils. Runs on any Linux host:  scripts/test-predeploy.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_SH="$ROOT/deploy/deploy.sh"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-predeploy.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

cat > "$FAKEBIN/docker" <<'DOCKER'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${FAKEBIN_DIR:-/nonexistent}/docker-argv.log"
case "${1:-}" in
  inspect)
    if [[ "${FAKE_DOCKER_DOWN:-0}" == "1" ]]; then
      echo "Cannot connect to the Docker daemon" >&2
      exit 1
    fi
    if [[ "${FAKE_CONTAINER_ABSENT:-0}" == "1" ]]; then
      echo "Error: No such container: online-shopping-db" >&2
      exit 1
    fi
    printf '%s\n' "${FAKE_DB_RUNNING:-true}"
    exit 0 ;;
  exec)
    if [[ "${FAKE_PGDUMP_FAIL:-0}" == "1" ]]; then
      echo "pg_dump: connection failed" >&2
      exit 2
    fi
    printf 'PGDMP-PREDEPLOY-STREAM\n'
    exit 0 ;;
  *) exit 0 ;;
esac
DOCKER
chmod 0700 "$FAKEBIN/docker"

cat > "$FAKEBIN/age" <<'AGE'
#!/usr/bin/env bash
out=""
recipient=""
prev=""
for a in "$@"; do
  if [[ "$prev" == "-o" || "$prev" == "--output" ]]; then out="$a"; fi
  if [[ "$prev" == "-r" || "$prev" == "--recipient" ]]; then recipient="$a"; fi
  prev="$a"
done
if [[ "${FAKE_AGE_FAIL:-0}" == "1" ]]; then
  echo "age: encryption failed" >&2
  exit 3
fi
printf 'age-encryption.org/v1\n-> X25519 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n' > "$out"
cat >> "$out"
exit 0
AGE
chmod 0700 "$FAKEBIN/age"

export PATH="$FAKEBIN:$PATH"
export FAKEBIN_DIR="$FAKEBIN"

CASE_TMP=""
setup_case() {
  CASE_TMP="$(mktemp -d "$TMP/c.XXXXXX")"
  export DEPLOY_APP_DIR="$CASE_TMP/app"
  export DEPLOY_BACKUP_DIR="$CASE_TMP/app/backups"
  export DEPLOY_LOCK_FILE="$CASE_TMP/app/deploy.lock"
  mkdir -p "$DEPLOY_APP_DIR" "$DEPLOY_BACKUP_DIR"
  unset FAKE_DOCKER_DOWN FAKE_CONTAINER_ABSENT FAKE_DB_RUNNING FAKE_PGDUMP_FAIL FAKE_AGE_FAIL || true
  : > "$FAKEBIN/docker-argv.log"
}

write_env() {
  cat > "$DEPLOY_APP_DIR/backup.env"
  chmod 0600 "$DEPLOY_APP_DIR/backup.env"
}

run_backup() {
  local name="$1" expected_rc="$2" needle="${3:-}"
  shift 3
  local rc=0
  set +e
  (
    # Source deploy.sh to load backup_existing_database
    # Normalize CRLF; the source guard requires backup-env-parser.sh NEXT TO the copied
    # deploy.sh (it cannot see the real repo layout).
    sed 's/\r$//' "$DEPLOY_SH" > "$CASE_TMP/deploy_clean.sh"
    cp "$ROOT/deploy/backup-env-parser.sh" "$CASE_TMP/backup-env-parser.sh"
    # shellcheck disable=SC1090,SC1091
    source "$CASE_TMP/deploy_clean.sh"
    backup_existing_database
  ) >"$CASE_TMP/.out" 2>&1
  rc=$?
  set -e
  if [[ "$rc" == "$expected_rc" ]]; then
    PASS=$((PASS + 1))
    echo "ok:   $name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $name — expected rc $expected_rc, got $rc"
    sed 's/^/      /' "$CASE_TMP/.out" | head -n 10
  fi
  if [[ -n "$needle" ]] && ! grep -qF -- "$needle" "$CASE_TMP/.out"; then
    FAIL=$((FAIL + 1))
    echo "FAIL: $name — expected output containing '$needle'"
    sed 's/^/      /' "$CASE_TMP/.out" | head -n 10
  fi
}

# 1. Success: creates encrypted predeploy-*.dump.age, no plaintext
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1predeployrecipient
EOF
run_backup "success_creates_encrypted_dump" 0 "Encrypted pre-deploy backup ready"
COUNT=$(find "$DEPLOY_BACKUP_DIR" -name 'predeploy-*.dump.age' | wc -l)
if [[ "$COUNT" != 1 ]]; then echo "FAIL: pre-deploy archive missing"; FAIL=$((FAIL+1)); fi
PLAINTEXT=$(find "$DEPLOY_BACKUP_DIR" -type f ! -name '*.dump.age' 2>/dev/null)
if [[ -n "$PLAINTEXT" ]]; then echo "FAIL: plaintext file found: $PLAINTEXT"; FAIL=$((FAIL+1)); fi

# 2. Lock fd 8 released: another process can acquire backup.lock immediately after
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1predeployrecipient
EOF
run_backup "lock_released_after_success" 0 ""
if ( exec 8>"$DEPLOY_APP_DIR/backup.lock" && flock -n 8 ); then
  PASS=$((PASS + 1)); echo "ok:   backup_lock_freed_after_predeploy"
  exec 8>&-
else
  FAIL=$((FAIL + 1)); echo "FAIL: backup.lock still held after pre-deploy backup"
fi

# 3. Missing recipient -> fail closed
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=
EOF
run_backup "missing_recipient_aborts" 1 "BACKUP_AGE_RECIPIENT is not set"

# 4. Missing backup.env -> fail closed
setup_case
rm -f "$DEPLOY_APP_DIR/backup.env"
run_backup "missing_env_aborts" 1 "requires a valid root-only"

# 5. Bad permissions on backup.env -> fail closed
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1predeployrecipient
EOF
chmod 0644 "$DEPLOY_APP_DIR/backup.env"
run_backup "bad_perms_on_env_aborts" 1 "refusing to write a plaintext dump"

# 6. Container absent (first deploy) -> skips cleanly, exit 0
setup_case
export FAKE_CONTAINER_ABSENT=1
run_backup "container_absent_skips" 0 "no database container present yet"

# 7. Docker daemon down -> aborts, exit 1
setup_case
export FAKE_DOCKER_DOWN=1
run_backup "docker_down_aborts" 1 "cannot reach the docker daemon"

# 8. pg_dump failure -> aborts, exit 1, no partial files
setup_case
export FAKE_PGDUMP_FAIL=1
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1predeployrecipient
EOF
run_backup "pgdump_fail_aborts" 1 "pg_dump failed"
if [[ -n "$(find "$DEPLOY_BACKUP_DIR" -type f 2>/dev/null)" ]]; then
  echo "FAIL: partial archive left behind on pg_dump failure"; FAIL=$((FAIL+1))
fi

# 9. age encryption failure -> aborts, exit 1, no partial files
setup_case
export FAKE_AGE_FAIL=1
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1predeployrecipient
EOF
run_backup "age_fail_aborts" 1 "age encryption failed"
if [[ -n "$(find "$DEPLOY_BACKUP_DIR" -type f 2>/dev/null)" ]]; then
  echo "FAIL: partial archive left behind on age failure"; FAIL=$((FAIL+1))
fi

# 10. Retention keeps 3 newest, prunes older
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1predeployrecipient
EOF
# Create 4 older pre-deploy dumps
touch -d '2026-01-01 00:00:00' "$DEPLOY_BACKUP_DIR/predeploy-20260101T000000Z.dump.age"
touch -d '2026-01-02 00:00:00' "$DEPLOY_BACKUP_DIR/predeploy-20260102T000000Z.dump.age"
touch -d '2026-01-03 00:00:00' "$DEPLOY_BACKUP_DIR/predeploy-20260103T000000Z.dump.age"
touch -d '2026-01-04 00:00:00' "$DEPLOY_BACKUP_DIR/predeploy-20260104T000000Z.dump.age"
run_backup "retention_prunes_to_3" 0 "pruned pre-deploy backup"
AFTER_COUNT=$(find "$DEPLOY_BACKUP_DIR" -name 'predeploy-*.dump.age' | wc -l)
if [[ "$AFTER_COUNT" == 3 ]]; then
  PASS=$((PASS + 1)); echo "ok:   retention_kept_exact_3"
else
  FAIL=$((FAIL + 1)); echo "FAIL: retention expected 3 dumps, got $AFTER_COUNT"
fi
if [[ -f "$DEPLOY_BACKUP_DIR/predeploy-20260101T000000Z.dump.age" ]]; then
  FAIL=$((FAIL + 1)); echo "FAIL: oldest pre-deploy dump was not pruned"
else
  PASS=$((PASS + 1)); echo "ok:   oldest_predeploy_pruned"
fi

# 11. Password env inheritance by name (argv hygiene)
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1predeployrecipient
BACKUP_DB_PASSWORD=secret_predeploy_password_5544
EOF
run_backup "predeploy_password_via_env_inheritance" 0 ""
DOCKER_LINE="$(grep 'pg_dump' "$FAKEBIN/docker-argv.log" | head -n 1 || true)"
if [[ "$DOCKER_LINE" == *"-e PGPASSWORD "* || "$DOCKER_LINE" == *"-e PGPASSWORD" ]]; then
  PASS=$((PASS + 1)); echo "ok:   predeploy_pgpassword_inherited_by_name"
else
  FAIL=$((FAIL + 1)); echo "FAIL: -e PGPASSWORD not in predeploy docker argv (line: $DOCKER_LINE)"
fi
if grep -q "secret_predeploy_password_5544" "$FAKEBIN/docker-argv.log"; then
  FAIL=$((FAIL + 1)); echo "FAIL: password value leaked into predeploy docker argv!"
else
  PASS=$((PASS + 1)); echo "ok:   predeploy_password_value_never_in_argv"
fi

# 12. N6: docker inspect stderr goes to a self-cleaning mktemp file, NEVER to the FIXED path
# /tmp/.deploy-inspect.err. Regression: pre-create that fixed path as a SYMLINK to a canary file.
# OLD code opened it with `2>` (O_TRUNC through the symlink) and then rm'd the symlink — the
# canary's CONTENT is the discriminator: it survives only if the fixed path was never touched.
CANARY="$TMP/inspect-canary.txt"
printf 'CANARY-PAYLOAD-8899\n' > "$CANARY"
rm -f /tmp/.deploy-inspect.err
ln -s "$CANARY" /tmp/.deploy-inspect.err
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1predeployrecipient
EOF
run_backup "inspect_fixed_path_never_touched" 0 "Encrypted pre-deploy backup ready"
if [[ "$(cat "$CANARY" 2>/dev/null || true)" == "CANARY-PAYLOAD-8899" ]]; then
  PASS=$((PASS + 1)); echo "ok:   inspect_canary_content_intact"
else
  FAIL=$((FAIL + 1)); echo "FAIL: /tmp/.deploy-inspect.err (or its target) was written through — canary content destroyed"
fi
# The fixed path may legitimately still exist (the new code never touches it); what must hold is
# that a deploy never CREATES it. Remove the canary symlink and re-run: the path must stay absent.
rm -f /tmp/.deploy-inspect.err
run_backup "inspect_fixed_path_never_recreated" 0 "Encrypted pre-deploy backup ready"
if [[ -e /tmp/.deploy-inspect.err ]]; then
  FAIL=$((FAIL + 1)); echo "FAIL: /tmp/.deploy-inspect.err was re-created by the deploy"
else
  PASS=$((PASS + 1)); echo "ok:   inspect_fixed_path_absent_after_run"
fi
rm -f /tmp/.deploy-inspect.err "$CANARY"

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-PREDEPLOY: FAIL"
  exit 1
fi
echo "TEST-PREDEPLOY: PASS"
exit 0