# PostgreSQL cluster upgrade runbook (catalog-version moves, e.g. 19beta1 → 19beta3)

How to move production to a new `postgres` image tag when PostgreSQL refuses the
existing data directory. This is NOT a normal version bump: same-major beta
releases can and do change `CATALOG_VERSION_NO`, and a cluster initialized by an
older catalog version cannot start under a newer one:

```
FATAL:  database files are incompatible with server
DETAIL: The database cluster was initialized with CATALOG_VERSION_NO 202605131,
        but the server was compiled with CATALOG_VERSION_NO 202607272.
HINT:   It looks like you need to initdb.
```

This exact failure shipped once (deploy of `ea9acf8`, 2026-08-25): the db
container crash-looped, the deploy health gate failed, and deploy.sh rolled back
cleanly. Production stayed on the old tag; the tag flip was reverted in
`f0016c6`. The only way across a catalog-version boundary is
**dump → fresh cluster → restore**, which is what
`scripts/upgrade-postgres-cluster.sh` automates.

## What the script does

1. Preflight (read-only with `DRY_RUN=1`): root check, layout, all containers
   healthy, tags actually differ, ≥512 MB free disk.
2. Consistent `pg_dump -Fc` of `online_shopping`, verified via `pg_restore -l`
   (must contain TABLE DATA), kept at `/opt/online-shopping/pg-upgrade-<ts>/db.dump`.
3. Stops frontend/backend/postgres, tar-snapshots the whole data volume
   (`/opt/online-shopping/pgdata-<oldtag>-<ts>.tar.gz`) — the rollback artifact.
4. Flips the image tag in the live `docker-compose.prod.yml` (`.bak-<ts>` kept).
5. Drops the data volume, starts the new engine (fresh initdb — roles/passwords
   come from unchanged compose env, so no role migration is needed).
6. `pg_restore --exit-on-error` back into the fresh database + `ANALYZE`.
7. Starts the full stack and gates on every container healthcheck plus the
   loopback `/api/health` endpoints, like `deploy.sh`.

Any failure after step 4 auto-rollbacks (compose `.bak` restored, volume
recreated from the snapshot, old engine restarted, health-gated). Failures
before the flip just restart the untouched stack. The dump always survives.

## Window procedure (production VPS)

Expected downtime: a few minutes (dump + restore dominate; DB here is small).
Pick a quiet window; the shop checkout writes during it are lost after step 2.

```bash
# 0. Ship the script first if not yet deployed: it rides in every release
#    bundle under /opt/online-shopping/releases/<tag>/.

# 1. Read-only preflight on the box:
sudo DRY_RUN=1 bash /opt/online-shopping/releases/"$(cat /opt/online-shopping/current-tag)"/upgrade-postgres-cluster.sh 19beta3

# 2. Run it for real:
sudo bash /opt/online-shopping/releases/"$(cat /opt/online-shopping/current-tag)"/upgrade-postgres-cluster.sh 19beta3

# 3. Smoke-test https://ekowayhardware.com (browse, add to cart, admin login).

# 4. Soak for at least a day before deleting artifacts (paths printed on success):
#      rm -rf /opt/online-shopping/pg-upgrade-<ts> \
#             /opt/online-shopping/pgdata-<oldtag>-<ts>.tar.gz \
#             /opt/online-shopping/docker-compose.prod.yml.bak-<ts>
```

### Step 5 — ship the matching Git flip (same session, before any other push)

The live compose now says the new tag but Git still pins the old one; the next
automated deploy from `main` would recreate the OLD engine against the NEW
cluster and crash-loop it. Flip the pin immediately after a successful run:

```bash
grep -rl 'postgres:19beta1' deploy .github scripts docker-compose.yml README.md CLAUDE.md | \
  xargs sed -i '' 's/postgres:19beta1/postgres:19beta3/g'   # BSD sed (macOS); GNU: sed -i
git commit -am "chore(deploy): complete the Postgres 19beta3 move" && git push
```

(Exact file set may differ — `grep -rn '19beta1' --exclude-dir=node_modules --exclude-dir=.git .`
is the source of truth. Skip historical prose that describes the past.)

Until that commit lands, do NOT push anything else to `main`: deploys are
live-pinned to the box's edited compose file and will converge on the next
release anyway — but an intermediate release carrying the old tag would undo
the flip on disk while the volume is already new-format, forcing another
manual cycle.

## Manual rollback (only if automatic rollback failed)

Printed by the script on failure (`AUTOMATIC ROLLBACK FAILED` block): restore
the compose `.bak`, remove the new volume, untar the snapshot back into it,
`docker compose up -d`. The verified dump remains available for retry.

## Local development variant

Local dev uses a bind mount (`./postgres-data`, service `db`, user
`project_depot`) rather than a named volume, so the script does not apply.
Manual equivalent:

```bash
cd <repo>
docker compose exec db pg_dump -Fc -U project_depot project_depot > /tmp/local-pre-upgrade.dump
docker compose down
mv postgres-data postgres-data-beta1-backup-$(date +%Y%m%d)
# flip the tag in docker-compose.yml, then:
docker compose up -d db && sleep 5
docker compose exec -T db psql -U project_depot -d project_depot < /tmp/local-pre-upgrade.dump
docker compose up -d
```

Keep the old directory until confident, then delete it (precedent:
`postgres-data-pg18-backup-*` in `.gitignore` history).

## Related

- Backup/restore pipeline: [backup-restore-runbook.md](backup-restore-runbook.md)
  (encrypted pre-deploy dumps are taken automatically before every deploy).
- Incident reference: deploy run of `ea9acf8` (2026-08-25) and revert `f0016c6`.
