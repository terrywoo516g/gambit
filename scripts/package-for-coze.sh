#!/usr/bin/env bash
# Gambit → 扣子编程 打包脚本
# 用法：从项目根目录运行 ./scripts/package-for-coze.sh
# 产物：../gambit-YYYYMMDD-HHMM.tar.gz（放在项目上一级目录，避免被 git 追踪）

set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"
TIMESTAMP="$(date +%Y%m%d-%H%M)"
OUTPUT="../${PROJECT_NAME}-${TIMESTAMP}.tar.gz"

echo "[1/3] 清理构建产物..."
rm -rf .next dist build out .turbo .coze-logs 2>/dev/null || true

echo "[2/3] 打包中..."
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='.turbo' \
    --exclude='.coze-logs' \
    --exclude='*.log' \
    --exclude='*.tar.gz' \
    --exclude='*.tgz' \
    --exclude='*.zip' \
    --exclude='.env*' \
    --exclude='coverage' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    -czf "$OUTPUT" \
    -C .. "$PROJECT_NAME"

SIZE="$(du -h "$OUTPUT" | cut -f1)"
ABS_PATH="$(cd "$(dirname "$OUTPUT")" && pwd)/$(basename "$OUTPUT")"

echo "[3/3] 打包完成"
echo ""
echo "================================"
echo " 产物：$ABS_PATH"
echo " 大小：$SIZE"
echo "================================"
echo ""
echo "下一步：把这个 gz 拖到扣子编程的资源管理器即可。"
