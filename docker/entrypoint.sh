#!/bin/sh
set -eu

if [ "${WAIT_FOR_DB:-1}" = "1" ] && [ "${DJANGO_DB:-postgres}" = "postgres" ]; then
  echo "Waiting for PostgreSQL at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
  until pg_isready \
    -h "${POSTGRES_HOST:-db}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER:-admin}" \
    -d "${POSTGRES_DB:-project_distance}" >/dev/null 2>&1; do
    sleep 1
  done
  echo "PostgreSQL is ready."
fi

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  python manage.py migrate --noinput
fi

if [ "${COLLECTSTATIC:-0}" = "1" ]; then
  python manage.py collectstatic --noinput
fi

exec "$@"
