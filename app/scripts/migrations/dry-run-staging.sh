#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
APP_ROOT="${SCRIPT_DIR%/scripts/migrations}"

cd "$APP_ROOT"

if [[ -z "${STAGING_DATABASE_URL:-}" ]]; then
  echo "STAGING_DATABASE_URL must be provided to run a dry-run migration against staging."
  exit 1
fi

npx prisma migrate diff --from-url "$STAGING_DATABASE_URL" --to-migrations ./migrations --script
