#!/bin/bash

# 清理脚本
# 清理所有生成的数据和日志文件

set -e

echo "🧹 清理 Cosmos 区块链应用数据"
echo "=============================="

# 停止所有服务
echo "🛑 停止所有服务..."
pkill -f "node.*server.js" || true
pkill -f "ignite.*serve" || true

# 清理数据文件
echo "🗂️  清理数据文件..."
rm -f data/*.json
echo "   - 已删除 data/*.json"

# 清理日志文件
echo "📄 清理日志文件..."
rm -f *.log
rm -f *.pid
echo "   - 已删除 *.log 和 *.pid"

# 清理 Docker 容器和镜像（可选）
read -p "是否清理 Docker 容器和镜像? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🐳 清理 Docker 资源..."
    docker-compose down -v || true
    docker system prune -f || true
    echo "   - 已清理 Docker 容器和卷"
fi

# 清理 Cosmos 链数据（可选）
read -p "是否删除 Cosmos 链数据? (这将删除整个 test-chain 目录) (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⛓️  清理 Cosmos 链数据..."
    rm -rf test-chain/
    echo "   - 已删除 test-chain/ 目录"
fi

echo ""
echo "✅ 清理完成！"
echo "💡 重新开始: ./scripts/setup.sh install"