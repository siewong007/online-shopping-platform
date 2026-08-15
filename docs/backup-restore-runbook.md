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
                            │        │  mode 0600, atomic rename, then rclone copy + size verify
                            ▼        ▼
                       deploy.sh pre-deploy safety: local age-encrypted predeploy-*.dump.age
                       (pg_dump → age only — no rclone/network; works even if the remote is down)
```

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
| `BACKUP_LOCAL_DIR` | local encrypted archive dir (default `/opt/online-shopping/backups`) |
| `BACKUP_LOCAL_RETENTION_COUNT` | local encrypted copies to keep (default 3) |
| `BACKUP_REMOTE_DAILY_RETENTION` | remote daily tier to keep (default 14) |
| `BACKUP_REMOTE_WEEKLY_RETENTION` | remote weekly tier to keep (default 8) |
| `BACKUP_WEEKLY_DAY` | day of week for the weekly tier, 1=Mon..7=Sun (default 7) |
| `BACKUP_DB_CONTAINER` / `BACKUP_DB_USER` / `BACKUP_DB_NAME` | source database (defaults match production) |

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

`deploy/deploy.sh` installs `backup.sh`, `restore.sh`, the systemd units and the config template.
It only enables the timer when `backup.env` already contains the recipient, remote and path;
otherwise the units are installed **disabled** and the deploy log reports that activation is
pending configuration.

The deploy-time pre-deploy safety backup is **local age-encrypted only** (`predeploy-*.dump.age`,
no rclone/network required) and **fails closed**: if `age` is missing or `BACKUP_AGE_RECIPIENT` is
absent/empty in `/opt/online-shopping/backup.env`, the deployment **aborts** rather than write a
plaintext dump. Provisioning the age recipient is therefore a prerequisite for deploying this P0.
If enabling the systemd timer fails, the deployment continues but logs prominently that scheduled
encrypted backups are NOT active.

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
`remote_destination_identifier`. No passwords, tokens or private keys. A failure records `status:
"error"` with an `error_category` (`config`, `db_unavailable`, `dump_failed`, `encrypt_failed`,
`upload_failed`, `upload_verify_failed`, ...). Lock contention (another backup running) does not
rewrite the file because the in-flight run owns it.

## Isolated restore proof

Non-destructive end-to-end check on any Linux host with docker, `age` and `rclone`:

```bash
scripts/restore-proof.sh
```

It uses the local development database as the source, generates a **disposable** age keypair and a
local-type rclone remote, runs the real `backup.sh` and `restore.sh`, restores into a throwaway
`postgres:19beta1` container, validates row/schema/readiness parity, then destroys the container
and all temporary state (including on failure).

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
   `--database`, `--db-user` **and** `--destroy-target` to be supplied explicitly — nothing is
   defaulted, and without `--destroy-target` the script refuses to run before it even decrypts.
   Because `online-shopping-db` / `online_shopping` are the production names, a restore targeting
   either additionally requires the exact confirmation string:
   ```bash
   export PGPASSWORD=...   # from /opt/online-shopping/secrets.env when restoring production
   /opt/online-shopping/restore.sh --restore online-shopping-....dump.age \
     --container online-shopping-db --database online_shopping --db-user shop_admin \
     --identity /path/to/ekoway-backup-age.txt --destroy-target \
     --confirm-production "RESTORE online_shopping"
   ```
   The guardrails are validated **before** decryption and **before** `pg_restore`, so a mistyped
   command cannot damage the live database. `pg_restore` runs with `--clean --if-exists` and
   `--exit-on-error` (a partially-applied restore fails loudly rather than report false success).
   On success `restore.sh` runs a readiness schema check (the same SQL the app's health endpoint
   uses) and reports the migration ledger count. During a disaster restore the original database is
   gone, so full source↔target row parity cannot be asserted there — the stronger parity proof is
   performed by `scripts/restore-proof.sh` against an isolated source/target.
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
- Nothing is pruned until the new backup exists **and** is verified remotely. Retention failures
  are logged and never delete the freshly created backup.
- Pruning deletes only exact object names returned by a listing under the configured path, so a
  malformed path cannot make rclone act outside the backup prefix.

## Failure troubleshooting

| `error_category` | Cause / fix |
|---|---|
| `config` | `backup.env` incomplete or invalid; set recipient/remote/path. |
| `db_unavailable` | `online-shopping-db` not running; check `docker ps`. |
| `dump_failed` | `pg_dump` errored; inspect the run's stderr (`journalctl -u online-shopping-backup.service`). |
| `encrypt_failed` | `age` errored (e.g., bad recipient); check the age key. |
| `upload_failed` / `upload_verify_failed` | rclone copy or remote re-list failed; check the rclone remote and network. |
| `already_running` | another backup holds the lock; the other run owns the status file. |

Restore (`restore.sh`) exits non-zero with `missing_target` when any required flag
(`--container`, `--database`, `--db-user`, `--destroy-target`, `--identity`) is omitted, and with
`production_confirmation_required` when a production-targeted restore lacks the exact
`--confirm-production "RESTORE online_shopping"` string — both fires before decryption.

Deploy-time pre-deploy backup (`deploy.sh`) aborts the deployment (fail closed) if `age` is not
installed or `/opt/online-shopping/backup.env` has no `BACKUP_AGE_RECIPIENT`; fix by installing
`age` and adding the recipient, then redeploy. A failure to `systemctl enable --now
online-shopping-backup.timer` does **not** abort the deploy; it is logged prominently so activation
can be finished manually.

## Out of scope / notes

- The deploy-time pre-deploy safety dump is now **encrypted** (`predeploy-*.dump.age`, mode 0600,
  newest 3 kept) and **local-only** — no rclone/network dependency, so an emergency deploy never
  depends on external storage being reachable. The legacy plaintext `predeploy-*.dump` files are
  removed automatically after a successful encrypted pre-deploy.
- PostgreSQL remains `postgres:19beta1`; a version migration is a separate task (P1-REL-01).
- `secrets.env` is not included in any backup; production credentials live in the owner's
  secret-management system.
- Least-privilege backup DB credentials are a later hardening item; the existing dump user is used.