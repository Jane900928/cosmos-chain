#!/bin/bash

# Docker 启动脚本
# 使用 Docker Compose 启动完整的区块链应用

set -e

echo "🐳 启动 Cosmos 区块链应用 (Docker)"
echo "===================================="

# 检查 Docker 和 Docker Compose 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker 环境检查通过"

# 构建并启动服务
echo "🔨 构建 Docker 镜像..."
docker-compose build

echo "🚀 启动服务..."
docker-compose up -d

echo "📊 检查服务状态..."
docker-compose ps

echo ""
echo "✅ 服务启动完成！"
echo "📱 区块链浏览器: http://localhost:3000"
echo "📊 Prometheus 监控: http://localhost:9090"
echo "📈 Grafana 仪表板: http://localhost:3001 (admin:admin123)"
echo ""
echo "🔍 查看日志: docker-compose logs -f"
echo "🛑 停止服务: docker-compose down"
echo ""