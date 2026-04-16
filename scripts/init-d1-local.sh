#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-market-room-db}"

echo "Applying local D1 migrations for ${DB_NAME}..."
npx wrangler d1 migrations apply "${DB_NAME}" --local --cwd apps/api

echo "Seeding local D1 data for ${DB_NAME}..."
npx wrangler d1 execute "${DB_NAME}" --local --cwd apps/api --file ../../database/seeds/001_seed.sql

echo "Local D1 setup is complete."
