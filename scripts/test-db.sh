#!/usr/bin/env bash
# Throwaway Postgres 17 + pgvector for the service-layer integration suite.
#
#   bun run test:db                 start the cluster, print the default URL
#   bun run test:db down            stop and delete everything
#   bun run test:db create PER-30   a database for one delivery unit, print its URL
#   bun run test:db drop PER-30     delete that one
#   bun run test:db list            what exists right now
#
# Typical single-run use:
#   export TEST_DATABASE_URL="$(bun run --silent test:db)"
#   bun run test
#
# Parallel use: one database PER DELIVERY UNIT, not per Issue and not per fleet.
# A unit is whatever produces one PR — a lone Issue, a group that ships together,
# or a stack whose later members build on the earlier ones' migrations. Members
# of a unit share a database because they share a migration lineage; separate
# units must not, because two independent branches both adding migrations will
# collide, and the collision looks like a broken migration rather than a
# scheduling mistake.
#
# All units live on ONE cluster as separate databases. That is enough isolation:
# the harness resets with `DROP SCHEMA public CASCADE`, which is scoped to a
# database, so two units cannot see each other. A cluster each would also work
# and costs far more to start.
#
# Requires: brew install postgresql@17 pgvector
set -euo pipefail

PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@17/bin}"
PGDATA="${PGDATA:-${TMPDIR:-/tmp}/personus-testdb}"
PORT="${TEST_DB_PORT:-54317}"
DB=personus_test

if [ ! -x "$PGBIN/initdb" ]; then
  echo "Postgres 17 not found at $PGBIN — brew install postgresql@17 pgvector" >&2
  exit 1
fi
export PATH="$PGBIN:$PATH"

running() { pg_ctl -D "$PGDATA" status >/dev/null 2>&1; }

start_cluster() {
  running && return 0
  rm -rf "$PGDATA" && mkdir -p "$PGDATA"
  initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null 2>&1
  # TCP rather than a unix socket: socket paths are capped at ~103 bytes and
  # long TMPDIR values (CI, sandboxes) silently blow past it.
  # fsync/synchronous_commit off — this cluster is disposable by definition.
  pg_ctl -D "$PGDATA" -l "$PGDATA/pg.log" \
    -o "-p $PORT -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off" \
    -w start >/dev/null
}

# Postgres identifiers are case-folded and reject '-', so PER-30 becomes per_30.
dbname_for() {
  printf 'personus_test_%s' "$(printf '%s' "$1" | tr '[:upper:]-' '[:lower:]_' | tr -cd 'a-z0-9_')"
}

make_db() {
  local name="$1"
  if ! psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc \
      "SELECT 1 FROM pg_database WHERE datname='$name'" | grep -q 1; then
    createdb -h 127.0.0.1 -p "$PORT" -U postgres "$name"
  fi
  psql -h 127.0.0.1 -p "$PORT" -U postgres -d "$name" \
    -c 'CREATE EXTENSION IF NOT EXISTS vector;' >/dev/null
  echo "postgresql://postgres@127.0.0.1:$PORT/$name"
}

case "${1:-up}" in
  up)
    start_cluster
    make_db "$DB"
    ;;
  create)
    [ $# -ge 2 ] || { echo "usage: test-db.sh create <unit>" >&2; exit 2; }
    start_cluster
    make_db "$(dbname_for "$2")"
    ;;
  drop)
    [ $# -ge 2 ] || { echo "usage: test-db.sh drop <unit>" >&2; exit 2; }
    running || { echo "cluster not running"; exit 0; }
    dropdb -h 127.0.0.1 -p "$PORT" -U postgres --if-exists "$(dbname_for "$2")"
    echo "dropped $(dbname_for "$2")"
    ;;
  list)
    running || { echo "cluster not running"; exit 0; }
    psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc \
      "SELECT datname FROM pg_database WHERE datname LIKE 'personus_test%' ORDER BY 1"
    ;;
  down)
    pg_ctl -D "$PGDATA" -w stop >/dev/null 2>&1 || true
    rm -rf "$PGDATA"
    echo "stopped"
    ;;
  *)
    echo "usage: test-db.sh [up|down|create <unit>|drop <unit>|list]" >&2
    exit 2
    ;;
esac
