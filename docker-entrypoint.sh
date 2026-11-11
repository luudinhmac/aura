#!/bin/sh
set -eu

echo "Applying database migrations..."
pnpm exec prisma migrate deploy

echo "Synchronizing RBAC role catalog..."
pnpm exec tsx scripts/migrate-rbac-roles.ts

if [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ] && [ "${BOOTSTRAP_ADMIN_IF_EMPTY:-false}" = "true" ]; then
  echo "Bootstrapping production admin when the database is empty..."
  pnpm run seed:production-admin -- --only-if-empty
fi

exec pnpm start
