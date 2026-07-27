#!/usr/bin/env bash
# Throwaway Postgres 17 + pgvector for the service-layer integration suite.
#
#   bun run test:db          start, print the URL
#   bun run test:db down     stop and delete
#
# Typical use:
#   export TEST_DATABASE_URL="$(bun run --silent test:db)"
#   bun run test
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

case "${1:-up}" in
  up)
    if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
      echo "postgresql://postgres@127.0.0.1:$PORT/$DB"
      exit 0
    fi
    rm -rf "$PGDATA" && mkdir -p "$PGDATA"
    initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null 2>&1
    # TCP rather than a unix socket: socket paths are capped at ~103 bytes and
    # long TMPDIR values (CI, sandboxes) silently blow past it.
    # fsync/synchronous_commit off — this cluster is disposable by definition.
    pg_ctl -D "$PGDATA" -l "$PGDATA/pg.log" \
      -o "-p $PORT -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off" \
      -w start >/dev/null
    createdb -h 127.0.0.1 -p "$PORT" -U postgres "$DB"
    psql -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" \
      -c 'CREATE EXTENSION IF NOT EXISTS vector;' >/dev/null
    echo "postgresql://postgres@127.0.0.1:$PORT/$DB"
    ;;
  down)
    pg_ctl -D "$PGDATA" -w stop >/dev/null 2>&1 || true
    rm -rf "$PGDATA"
    echo "stopped"
    ;;
  *)
    echo "usage: test-db.sh [up|down]" >&2
    exit 2
    ;;
esac
