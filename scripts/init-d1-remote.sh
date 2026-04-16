#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-market-room-db}"

echo "Applying remote D1 migrations for ${DB_NAME}..."
npx wrangler d1 migrations apply "${DB_NAME}" --remote --cwd apps/api

echo "Seeding remote D1 data for ${DB_NAME}..."
npx wrangler d1 execute "${DB_NAME}" --remote --cwd apps/api --file ../../database/seeds/001_seed.sql

echo "Remote D1 setup is complete."
