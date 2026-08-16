#!/usr/bin/env bash
#
# systemd unit validation gate for every DELIVERED *.service / *.timer unit.
#
# P0-BKP-01 background: online-shopping-backup.service shipped with OnFailure= inside
# [Service], where systemd silently ignores it ("Unknown key 'OnFailure' in section [Service],
# ignoring.") — the notifier never fires. Crucially, that message is a WARNING: systemd-analyze
# verify can exit 0 while printing it, so this gate fails on ANY unexpected verify output, not
# just on the exit status. A synthetic fixture with OnFailure= under [Service] must be flagged
# (proving the original defect would have been caught), and the same fixture with OnFailure=
# under [Unit] must pass, proving section placement is the only difference.
#
# The delivered units reference host resources that do not exist on a build machine
# (ExecStart=/opt/online-shopping/backup.sh, Requires=docker.service, base targets like
# sysinit.target). The suite therefore verifies against a throwaway --root sandbox: real
# unit files, stub executables for every Exec* path, stub units for non-delivered targets.
# Only stubs are added — the delivered unit files themselves are byte-for-byte copies.
#
# Requires: bash, coreutils, systemd-analyze (Linux/WSL; CI and run-all-checks.sh are Linux).
# Run: bash scripts/test-systemd-units.sh
set -Eeuo pipefail
export LC_ALL=C

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT/deploy/release-components.txt"

command -v systemd-analyze >/dev/null 2>&1 \
  || { echo "FAIL: systemd-analyze not found (required to validate delivered units)" >&2; exit 1; }
[[ -f "$MANIFEST" ]] || { echo "FAIL: missing manifest: $MANIFEST" >&2; exit 1; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-systemd-units.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

# The release manifest is the single source of truth for what is delivered: every *.service /
# *.timer row in it must exist in the repository and is validated below.
mapfile -t MANIFEST_UNIT_ROWS < <(sed 's/\r$//' "$MANIFEST" | awk -F'\t' '$2 ~ /\.(service|timer)$/ {print $1 "\t" $2}')
if ((${#MANIFEST_UNIT_ROWS[@]} == 0)); then
  echo "FAIL: release manifest declares no systemd units" >&2
  exit 1
fi

declare -A DELIVERED=()
SANDBOX="$TMP/root"
mkdir -p "$SANDBOX/etc/systemd/system" "$SANDBOX/bin" "$SANDBOX/opt/online-shopping"

for row in "${MANIFEST_UNIT_ROWS[@]}"; do
  src="${row%%$'\t'*}"
  name="${row##*$'\t'}"
  if [[ ! -f "$ROOT/$src" ]]; then
    echo "FAIL: manifest unit missing from repository: $src"
    FAIL=$((FAIL + 1))
    continue
  fi
  DELIVERED["$name"]="$src"
  # CRLF would corrupt directive values (e.g. "OnFailure=…service\r"); .gitattributes
  # normalizes to LF, this guards a regressed checkout before the copies are verified.
  if grep -q $'\r' "$ROOT/$src"; then
    echo "FAIL: $src contains CR (must be LF-only)"
    FAIL=$((FAIL + 1))
  fi
  install -m 0644 "$ROOT/$src" "$SANDBOX/etc/systemd/system/$name"
done

# Stub executables for every Exec*= path of the delivered units (systemd-analyze checks the
# referenced binary exists and is executable INSIDE the --root tree; a missing stub = failure,
# so a delivered unit pointing at an unshipped script still fails this gate).
while IFS= read -r exe; do
  [[ -n "$exe" ]] || continue
  while [[ "$exe" == [-+:!]* ]]; do exe="${exe:1}"; done   # systemd prefixes: - + : ! !!
  if [[ "$exe" != /* ]]; then
    echo "FAIL: Exec directive is not an absolute path: '$exe'"
    FAIL=$((FAIL + 1))
    continue
  fi
  mkdir -p "$SANDBOX$(dirname "$exe")"
  printf '#!/bin/sh\nexit 0\n' > "$SANDBOX$exe"
  chmod 0755 "$SANDBOX$exe"
done < <(awk -F= '$1 ~ /^Exec[A-Za-z]*$/ {print $2}' "${DELIVERED[@]/#/"$ROOT/"}" | awk '{print $1}')

# Stub units for targets the delivered units reference but the release does not ship:
# systemd default dependencies (sysinit.target), explicit Wants/After/Requires targets that
# live on the production host (docker.service, network*.target). A missing OnFailure= or
# Unit= target is NOT tolerated — those must be delivered units (asserted below), while
# these host-level stubs only exist so the sandbox loads like a real system would.
for stub in sysinit.target local-fs.target basic.target multi-user.target \
            network.target network-online.target timers.target; do
  printf '[Unit]\nDescription=verify sandbox stub for %s\n' "$stub" > "$SANDBOX/etc/systemd/system/$stub"
  chmod 0644 "$SANDBOX/etc/systemd/system/$stub"
done
printf '[Unit]\nDescription=verify sandbox stub for docker.service\n\n[Service]\nType=oneshot\nExecStart=/bin/true\n' \
  > "$SANDBOX/etc/systemd/system/docker.service"
chmod 0644 "$SANDBOX/etc/systemd/system/docker.service"
printf '#!/bin/sh\nexit 0\n' > "$SANDBOX/bin/true"
chmod 0755 "$SANDBOX/bin/true"

# gate_verify <unit-name>...: PASSes only when systemd-analyze verify exits 0 AND prints
# nothing unexpected. Unknown/wrong-section directives are warnings (possibly exit 0), so the
# output itself is the signal. Only the informational permission notices are tolerated.
gate_verify() {
  local out rc
  set +e
  out="$(systemd-analyze verify --root="$SANDBOX" "$@" 2>&1)"
  rc=$?
  set -e
  out="$(grep -vE 'is marked (executable|world-writable)|Proceeding anyway' <<<"$out" || true)"
  if ((rc != 0)); then
    echo "      systemd-analyze verify exited $rc"
  fi
  if [[ -n "${out//$'\n'/}" ]]; then
    echo "      verify output:"
    while IFS= read -r line; do printf '        %s\n' "$line"; done <<<"$out"
  fi
  ((rc == 0)) && [[ -z "${out//$'\n'/}" ]]
}

# 1. Every delivered unit individually (backup service, health service, notifier, timers).
for name in "${!DELIVERED[@]}"; do
  if gate_verify "$name"; then
    PASS=$((PASS + 1)); echo "ok:   verify: $name"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: verify: $name"
  fi
done

# 2. All delivered units together (cross-unit wiring: Requires=/Unit=/timer targets resolve).
if gate_verify "${!DELIVERED[@]}"; then
  PASS=$((PASS + 1)); echo "ok:   verify: all delivered units together"
else
  FAIL=$((FAIL + 1)); echo "FAIL: verify: all delivered units together"
fi

# 3. Regression fixture: OnFailure= under [Service] (the exact production defect) MUST be
# reported by systemd-analyze verify. Same unit with OnFailure= under [Unit] MUST pass clean.
cat > "$SANDBOX/etc/systemd/system/fixture-bad.service" <<'EOF'
[Unit]
Description=regression fixture - OnFailure wrongly placed in [Service]

[Service]
Type=oneshot
ExecStart=/bin/true
OnFailure=online-shopping-backup-notify.service

[Install]
WantedBy=multi-user.target
EOF
cat > "$SANDBOX/etc/systemd/system/fixture-good.service" <<'EOF'
[Unit]
Description=regression fixture - OnFailure correctly placed in [Unit]
OnFailure=online-shopping-backup-notify.service

[Service]
Type=oneshot
ExecStart=/bin/true

[Install]
WantedBy=multi-user.target
EOF
chmod 0644 "$SANDBOX/etc/systemd/system/fixture-bad.service" "$SANDBOX/etc/systemd/system/fixture-good.service"

set +e
FIXTURE_OUT="$(systemd-analyze verify --root="$SANDBOX" fixture-bad.service 2>&1)"
set -e
# systemd <= 252 words this "Unknown key 'OnFailure' in section [Service], ignoring." while
# >= 253 says "Unknown key name 'OnFailure' in section 'Service', ignoring." — cover both.
if grep -Eq "Unknown key( name)? 'OnFailure' in section .?Service" <<<"$FIXTURE_OUT"; then
  PASS=$((PASS + 1)); echo "ok:   fixture OnFailure-under-[Service] is flagged by verify"
else
  FAIL=$((FAIL + 1)); echo "FAIL: fixture OnFailure-under-[Service] was NOT flagged (verify output: '$FIXTURE_OUT')"
fi
if gate_verify fixture-bad.service; then
  FAIL=$((FAIL + 1)); echo "FAIL: gate passed a unit with OnFailure under [Service]"
else
  PASS=$((PASS + 1)); echo "ok:   gate rejects OnFailure-under-[Service]"
fi
if gate_verify fixture-good.service; then
  PASS=$((PASS + 1)); echo "ok:   fixture OnFailure-under-[Unit] passes clean"
else
  FAIL=$((FAIL + 1)); echo "FAIL: fixture OnFailure-under-[Unit] should pass clean"
fi

# 4. Section-aware property checks (systemd-analyze cannot check these: a missing OnFailure=
# target is not an error to it, and [Install] presence is not a defect either).
onfailure_rows() {  # prints "SECTION<TAB>OnFailure=<value>" rows for a unit file
  awk '/^\[[^]]+\][[:space:]]*$/ {sec=$1; next} /^OnFailure=/ {print sec "\t" $0}' "$1"
}

for name in "${!DELIVERED[@]}"; do
  src="${DELIVERED[$name]}"
  while IFS=$'\t' read -r section directive; do
    [[ -n "$directive" ]] || continue
    if [[ "$section" != "[Unit]" ]]; then
      FAIL=$((FAIL + 1)); echo "FAIL: $name has OnFailure outside [Unit] ($section): $directive"
    else
      PASS=$((PASS + 1)); echo "ok:   $name OnFailure in [Unit]"
    fi
    # every OnFailure target must itself be a delivered unit (a notifier that is not shipped
    # would never exist on the production host)
    for target in ${directive#OnFailure=}; do
      if [[ -z "${DELIVERED[$target]+set}" ]]; then
        FAIL=$((FAIL + 1)); echo "FAIL: $name OnFailure target is not a delivered unit: $target"
      else
        PASS=$((PASS + 1)); echo "ok:   $name OnFailure target delivered: $target"
      fi
    done
  done < <(onfailure_rows "$ROOT/$src")
done

for name in online-shopping-backup.service online-shopping-backup-health.service; do
  if [[ -z "${DELIVERED[$name]+set}" ]]; then
    FAIL=$((FAIL + 1)); echo "FAIL: expected delivered unit missing from manifest: $name"
    continue
  fi
  if grep -q '^OnFailure=online-shopping-backup-notify.service$' "$ROOT/${DELIVERED[$name]}"; then
    PASS=$((PASS + 1)); echo "ok:   $name still wires OnFailure to the backup notifier"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name no longer wires OnFailure to online-shopping-backup-notify.service"
  fi
done

# The notifier must stay non-enableable at boot: no [Install] section means `systemctl enable`
# cannot hook it into any target (D9).
NOTIFIER_SRC="${DELIVERED[online-shopping-backup-notify.service]-}"
if [[ -n "$NOTIFIER_SRC" ]] && ! grep -q '^\[Install\]' "$ROOT/$NOTIFIER_SRC"; then
  PASS=$((PASS + 1)); echo "ok:   notifier has no [Install] section (non-enableable)"
else
  FAIL=$((FAIL + 1)); echo "FAIL: notifier must not have an [Install] section: $NOTIFIER_SRC"
fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if ((FAIL > 0)); then
  echo "TEST-SYSTEMD-UNITS: FAIL"
  exit 1
fi
echo "TEST-SYSTEMD-UNITS: PASS"
exit 0
