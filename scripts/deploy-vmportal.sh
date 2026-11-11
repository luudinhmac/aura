#!/bin/bash
set -e

DIR="/home/macld/aura-talent-management"
COMPOSE="docker compose -f $DIR/docker-compose.yml"

echo "=== 1. Đặt lại Schema chuẩn PostgreSQL (force-reset) ==="
$COMPOSE run --rm app pnpm exec prisma db push --force-reset

echo "=== 2. Nạp toàn bộ dữ liệu chuẩn từ db.json.bak sang PostgreSQL ==="
$COMPOSE run --rm app pnpm exec tsx scripts/migrate-json-to-pg-v2.ts

echo "=== 3. Khởi động lại container app ==="
$COMPOSE restart app

echo "=== 4. Kiểm tra trạng thái các container ==="
$COMPOSE ps
