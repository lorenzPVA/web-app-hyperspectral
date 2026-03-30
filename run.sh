#!/usr/bin/env bash
set -e
(cd backend && npx prisma db push && npm run dev) &
(cd frontend && npm run dev) &
wait
