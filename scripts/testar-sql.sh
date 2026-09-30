#!/usr/bin/env bash
# Testa as migrações em um Postgres local descartável (precisa de initdb/pg_ctl/psql 15+).
# Uso: npm run test:sql
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PATH="$PG_BIN:$PATH"
DIR="$(mktemp -d)"
PORTA="${PORTA:-54329}"

# initdb não roda como root
COMO=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$DIR" 2>/dev/null || true
  COMO=(runuser -u postgres --)
fi

limpar() { "${COMO[@]}" pg_ctl -D "$DIR/dados" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap limpar EXIT

"${COMO[@]}" initdb -D "$DIR/dados" -U postgres --auth=trust >/dev/null
"${COMO[@]}" pg_ctl -D "$DIR/dados" -o "-p $PORTA -k $DIR -c listen_addresses=''" -l "$DIR/log" start -w >/dev/null

PSQL=(psql -h "$DIR" -p "$PORTA" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f "$RAIZ/supabase/tests/stub_supabase.sql"
for m in "$RAIZ"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$m"
done
"${PSQL[@]}" -o /dev/null -f "$RAIZ/supabase/tests/fase1_test.sql"
echo "OK: todos os testes SQL passaram"
