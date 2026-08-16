# Backup & restore runbook — P0-BKP-01

Encrypted, off-server PostgreSQL backups with retention, failure visibility, a documented restore
procedure, and a repeatable isolated restore proof. This document contains no secrets.

## Architecture

```
systemd timer (02:30 UTC) ──┐
manual (root) ──────────────┼──► /opt/online-shopping/backup.sh
                            │        │  flock on backup.lock (no two dumps overlap)
                            ▼        ▼
                        pg_dump → age → online-shopping-<UTC>-<daily|weekly>.dump.age
                             │        │  mode 0600, atomic rename, .sha256 sidecar, rclone copy
                             │        │  + provider-independent SHA-256 download verification
                             ▼        ▼
                       deploy.sh pre-deploy safety: local age-encrypted predeploy-*.dump.age
                       (pg_dump → age only — no rclone/network; works even if the remote is down;
                        waits on the backup lock with a BOUNDED timeout)
```

Restore (`deploy/restore.sh`) runs `pg_restore --clean --if-exists --single-transaction
--exit-on-error` — the whole restore is **one transaction**, so a mid-restore failure rolls the
target back to its previous state. The archive restored by `scripts/restore-proof.sh` is the one
**downloaded back from the remote** (the local upload copy is deleted first), proving the stored
object is restorable, not just the local file.

The server only ever holds the **age public recipient**. The matching **private identity is held
off-server by the owner** and is used only during a restore.

## Runtime configuration

Real file: `/opt/online-shopping/backup.env` (root, mode 0600). Template in Git:
`deploy/backup.env.example`. Variables:

| Variable | Meaning |
|---|---|
| `BACKUP_AGE_RECIPIENT` | age public recipient (public material) |
| `BACKUP_RCLONE_REMOTE` | rclone remote name (credentials live in the root rclone config) |
| `BACKUP_RCLONE_PATH` | destination directory on that remote |
| `BACKUP_RCLONE_CONTIMEOUT` | connect timeout for every rclone call (default `15s`) |
| `BACKUP_RCLONE_TIMEOUT` | overall timeout for every rclone call (default `120s`) |
| `BACKUP_DB_PASSWORD` | optional; handed to the dump via `docker exec -e PGPASSWORD` (env-by-name inheritance), never argv |
| `BACKUP_LOCAL_DIR` | local encrypted archive dir (default `/opt/online-shopping/backups`) |
| `BACKUP_LOCAL_RETENTION_COUNT` | local encrypted copies to keep (default 3) |
| `BACKUP_REMOTE_DAILY_RETENTION` | remote daily tier to keep (default 14) |
| `BACKUP_REMOTE_WEEKLY_RETENTION` | remote weekly tier to keep (default 8) |
| `BACKUP_WEEKLY_DAY` | day of week for the weekly tier, 1=Mon..7=Sun (default 7) |
| `BACKUP_DB_CONTAINER` / `BACKUP_DB_USER` / `BACKUP_DB_NAME` | source database (defaults match production) |

The config file is loaded by a **strict KEY=VALUE parser** (`deploy/backup-env-parser.sh`) — never
`source`d as shell code — and must be root-owned with mode 0600 (enforced when running as root).
The backup **fails closed**: if the recipient, remote or path are missing it errors out instead of
producing an unencrypted or local-only archive.

## Dependency setup (production, once)

```bash
apt-get install -y age rclone          # plus docker (already present)
# rclone remote, root-only config (never in Git):
sudo -s
mkdir -p /root/.config/rclone && chmod 0700 /root/.config/rclone
rclone config                           # create the remote chosen by the owner
chmod 0600 /root/.config/rclone/rclone.conf
# age recipient:
age-keygen -o /root/ekoway-backup-age-identity.txt   # SECRET, then copy OFF the server
chmod 0600 /root/ekoway-backup-age-identity.txt
age-keygen -y /root/ekoway-backup-age-identity.txt   # prints the public recipient
# put the recipient into /opt/online-shopping/backup.env, then delete the local private key copy:
rm /root/ekoway-backup-age-identity.txt               # keep the off-server copy ONLY
```

## Installing and enabling (deploy integration)

`deploy/deploy.sh` **requires** the release bundle to ship `backup.sh`, `restore.sh`,
`backup.env.example`, `online-shopping-backup.service` and `online-shopping-backup.timer`
(`verify_release_payload` fails loudly if any is missing), installs them into
`/opt/online-shopping/` and `/etc/systemd/system/`, and runs `systemctl daemon-reload`. It only
enables the timer when a **root-owned, mode-0600** `backup.env` already contains the recipient,
remote and path; otherwise the units are installed **disabled**.

Backup-component **install failures never abort an otherwise good application deployment**: each
step is caught and reported prominently (`NOT AVAILABLE`, `NOT ACTIVE`), and the deploy continues.
This is deliberate and different from (a) bundle validation, which fails the deploy, and (b) the
pre-deploy safety backup, which aborts the deploy.

H5: merely enabling the timer is reported as **"timer ACTIVE; verification pending"**. After the
stack is healthy, `deploy.sh` runs the real installed pipeline once
(`verify_backup_components`). Only a fresh `status: ok` with a non-null remote destination logs
**"ACTIVE and VERIFIED"**; anything else logs a prominent **NOT VERIFIED** warning with the
verification log path. Enabling a timer is never claimed as protection proof.

The deploy-time pre-deploy safety backup is **local age-encrypted only** (`predeploy-*.dump.age`,
no rclone/network required) and **fails closed**: if `age` is missing or `BACKUP_AGE_RECIPIENT` is
absent/empty in a valid root-only `/opt/online-shopping/backup.env`, the deployment **aborts**
rather than write a plaintext dump. It waits on the backup lock with a bounded timeout
(`DEPLOY_BACKUP_LOCK_TIMEOUT`, default 300s) and fails the deploy clearly if the lock is stuck. An
absent database container (first deploy) skips the safety dump; a docker/daemon inspection failure
**aborts** the deploy (fail closed). If enabling the systemd timer fails, the deployment continues
but logs prominently that scheduled encrypted backups are NOT active.

## Preflight (host readiness, before first production deploy)

Run before the first production deployment to prove the host can actually produce and upload an
encrypted backup — without touching any production data:

```bash
sudo /opt/online-shopping/preflight-backup.sh
```

It checks (and exits nonzero unless all pass): `age`/`rclone`/`docker` installed; `backup.env`
root-owned mode 0600; strict-parse with recipient (`age1...`), remote and path set; the rclone
remote configured and the destination reachable (`rclone lsf`); ≥1 GiB free in the local backup
dir; the database container running with `pg_dump` reachable. The script performs no writes to the
database, remote or application state.

Manual activation:

```bash
sudo systemctl enable --now online-shopping-backup.timer
systemctl list-timers online-shopping-backup.timer
journalctl -u online-shopping-backup.service -n 50
```

## Timer status

```bash
systemctl is-enabled online-shopping-backup.timer
systemctl status online-shopping-backup.timer
systemctl list-timers | grep online-shopping-backup
```

## Manual encrypted backup

```bash
sudo /opt/online-shopping/backup.sh
# exit 0 + "backup complete" + status ok in /opt/online-shopping/backup-status.json
```

## Remote verification

```bash
rclone lsf --files-only <remote>:<path>/
rclone size <remote>:<path>/
# status file:
cat /opt/online-shopping/backup-status.json
```

## Status file

`/opt/online-shopping/backup-status.json` is written atomically. Fields: `status`,
`error_category`, `last_attempt`, `last_success`, `filename`, `encrypted_size`,
`remote_destination_identifier`. No passwords, tokens or private keys. Lifecycle:

- `status: "running"` is written the moment the lock is acquired — before any work — so a crashed,
  killed or interrupted job can **never leave a stale `ok`**.
- `status: "ok"` only after the archive is uploaded and verified remotely.
- `status: "error"` carries an `error_category` (`config`, `db_unavailable`, `dump_failed`,
  `encrypt_failed`, `upload_failed`, `upload_verify_failed`, `unexpected_error`,
  `interrupted`, ...).
- A caught signal (INT/TERM/HUP) records `interrupted`; an uncaught error records
  `unexpected_error`; SIGKILL leaves `running` — which is deliberately **not** `ok`.
- Lock contention (another backup running) does not rewrite the file because the in-flight run
  owns it.

The file is valid JSON by construction; monitor tools should treat anything other than
`"status": "ok"` as "not protected".

## Isolated restore proof

Non-destructive end-to-end check on any Linux host with docker, `age` and `rclone`:

```bash
scripts/restore-proof.sh
```

It uses the local development database as the source, generates a **disposable** age keypair and a
local-type rclone remote, runs the real `backup.sh` and `restore.sh` (restore with
`--target-kind isolated`), **deletes the local upload copy and restores the archive downloaded back
from the remote**, then validates into a throwaway `postgres:19beta1` container. Validation is
**fail closed**: every psql query runs with `ON_ERROR_STOP=1` (nothing swallowed), it requires a
non-empty source result and **positive business data** (`orders`, `products`,
`customer_accounts`, `admin_users` each > 0), compares at least 6 tables by **row count AND a
deterministic content fingerprint** (md5 of the sorted `row_to_json` rows), and checks exact
schema-surface and migration-ledger parity plus the readiness query. A damaged, emptied or
wrong-sourced proof fails:

```bash
scripts/test-restore-proof-negative.sh   # empty target / damaged target / wrong source all FAIL
scripts/test-restore-atomicity.sh        # injected mid-restore failure leaves the target unchanged
```

## Disaster restore procedure

1. Obtain the off-server age private identity and the latest `online-shopping-*.dump.age` from the
   remote.
2. Provision a running postgres container (production: `online-shopping-db`; the image must match
   the archive's server version, here `postgres:19beta1`).
3. Verify the archive first (read-only; only `--container` is required — no destructive flags):
   ```bash
   PGPASSWORD=... /opt/online-shopping/restore.sh --verify online-shopping-....dump.age \
     --identity /path/to/ekoway-backup-age.txt --container online-shopping-db
   ```
4. Restore is **destructive** and therefore guarded. It requires all of `--container`,
   `--database`, `--db-user`, `--destroy-target` **and** `--target-kind production|isolated` to be
   supplied explicitly — nothing is defaulted. Targeting is **fail closed**: `--database` and
   `--db-user` must be strict, bare PostgreSQL identifiers (URIs, conninfo, `=`, whitespace and
   quoting are rejected before anything is decrypted), and a production restore additionally
   requires the canonical `online-shopping-db` / `online_shopping` names under `--target-kind
   production` plus the exact confirmation string:
   ```bash
   export PGPASSWORD=...   # from /opt/online-shopping/secrets.env when restoring production
   /opt/online-shopping/restore.sh --restore online-shopping-....dump.age \
     --container online-shopping-db --database online_shopping --db-user shop_admin \
     --identity /path/to/ekoway-backup-age.txt --destroy-target --target-kind production \
     --confirm-production "RESTORE online_shopping"
   ```
   The guardrails are validated **before** decryption and **before** `pg_restore`, so a mistyped
   command cannot damage the live database. The decrypted archive is validated with `pg_restore
   --list` before anything destructive, and the staging directory must have ≥ 2× the archive size
   free. `pg_restore` runs with `--clean --if-exists --single-transaction --exit-on-error`: the
   whole restore is **one transaction**, so a mid-restore failure rolls the target back to its
   previous state and reports `restore_failed`; simply retry after fixing the cause. On success
   `restore.sh` runs a readiness schema check (the same SQL the app's health endpoint uses) and
   requires the migration ledger; a missing ledger fails the restore rather than reporting false
   success. During a disaster restore the original database is gone, so full source↔target row
   parity cannot be asserted there — the stronger parity proof is performed by
   `scripts/restore-proof.sh` against an isolated source/target.
5. Restart backend/frontend containers so the application reconnects.

## Key custody

- Public recipient: safe on the server and in configs.
- Private identity: **off-server only** (owner's password manager / encrypted drive / second host).
  Never in Git, never on the backup VPS, never in the backup bucket.
- `deploy.sh`/`backup.sh` never touch `/opt/online-shopping/secrets.env`; the database password
  used by `pg_restore` is supplied by the operator via `PGPASSWORD` at restore time.

## Retention

- Local: keep the newest `BACKUP_LOCAL_RETENTION_COUNT` (default 3) encrypted archives.
- Remote: keep the newest `BACKUP_REMOTE_DAILY_RETENTION` daily archives (default 14) and the
  newest `BACKUP_REMOTE_WEEKLY_RETENTION` weekly archives (default 8). A run landing on
  `BACKUP_WEEKLY_DAY` is tagged `-weekly-`; all other runs are `-daily-`.
- Retention is **deterministic**: archives are ordered by the ISO timestamp embedded in the name
  (`YYYYMMDDTHHMMSSZ`), never by file mtime. The newest N by name are always kept.
- Nothing is pruned until the new backup exists **and** is verified remotely (size + MD5).
  Retention failures are logged and never delete the freshly created backup.
- Pruning deletes only exact object names returned by a listing under the configured path, so a
  malformed path cannot make rclone act outside the backup prefix.

## Failure troubleshooting

| `error_category` | Cause / fix |
|---|---|
| `config` | `backup.env` incomplete, malformed or wrong permissions (must be root-owned mode 0600); set recipient/remote/path. |
| `db_unavailable` | `online-shopping-db` not running; check `docker ps`. |
| `dump_failed` | `pg_dump` errored; inspect the run's stderr (`journalctl -u online-shopping-backup.service`). |
| `encrypt_failed` | `age` errored (e.g., bad recipient); check the age key. |
| `upload_failed` / `upload_verify_failed` | rclone copy, re-list (size) or hash (`MD5`) check failed; check the rclone remote and network. |
| `already_running` | another backup holds the lock; the other run owns the status file. |
| `interrupted` | the job caught INT/TERM/HUP; rerun the backup. |
| `unexpected_error` | an unclassified error; inspect the run output/log. |
| `running` | the job was SIGKILLed or is still in flight — **not** a success. |

Restore (`restore.sh`) exits non-zero before decryption with `missing_target` when any required
flag (`--container`, `--database`, `--db-user`, `--destroy-target`, `--target-kind`,
`--identity`) is omitted, with `invalid_target` when a database/user/container value is not a
strict bare identifier (URIs, `=`, whitespace, duplicates) or when a production-named target uses
the wrong `--target-kind`, and with `production_confirmation_required` when a production restore
lacks the exact `--confirm-production "RESTORE online_shopping"` string. `--verify` and `--restore`
together, multiple archive arguments, or duplicate value flags are rejected. After decryption:
`archive_not_restorable` (not a readable pg_restore dump — corrupt or wrong key),
`insufficient_staging_space`, `restore_failed` (pg_restore failed; the `--single-transaction`
restore rolled back, leaving the target unchanged — fix the cause and retry), and
`restore_verify_failed` (the post-restore readiness/ledger check failed).

Deploy-time pre-deploy backup (`deploy.sh`) aborts the deployment (fail closed) if `age` is not
installed, `/opt/online-shopping/backup.env` is missing/invalid/not mode 0600, the docker daemon is
unreachable, or the backup lock cannot be acquired within the bounded timeout; fix and redeploy. A
failure to `systemctl enable --now online-shopping-backup.timer` or to install the backup
components does **not** abort the deploy; it is logged prominently so activation can be finished
manually, and the post-deploy verification reports `NOT VERIFIED` until a fresh off-server backup
is proven.

## Out of scope / notes

- The deploy-time pre-deploy safety dump is now **encrypted** (`predeploy-*.dump.age`, mode 0600,
  newest 3 kept) and **local-only** — no rclone/network dependency, so an emergency deploy never
  depends on external storage being reachable. The legacy plaintext `predeploy-*.dump` files are
  removed automatically after a successful encrypted pre-deploy.
- PostgreSQL remains `postgres:19beta1`; a version migration is a separate task (P1-REL-01).
- `secrets.env` is not included in any backup; production credentials live in the owner's
  secret-management system.
- Least-privilege backup DB credentials are a later hardening item; the existing dump user is used.
- Restore atomicity is proven by `scripts/test-restore-atomicity.sh` (a dependent view forces a
  mid-restore `DROP TABLE` failure, and the whole `--single-transaction` restore rolls the target
  back to byte-for-byte parity with the pre-restore baseline), and restore-proof false-positives
  are proven impossible by `scripts/test-restore-proof-negative.sh`. These run on the operator's
  Linux host with docker; the guardrail suites (`test-backup.sh`, `test-restore.sh`,
  `test-predeploy.sh`, `test-deploy.sh`) run in CI on every push/PR.