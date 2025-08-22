#!/bin/bash

# API 测试脚本
# 运行完整的 API 功能测试

set -e

echo "🧪 运行 Cosmos 区块链应用测试"
echo "=============================="

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查应用是否运行
if ! curl -s http://localhost:3000/api/blockchain/status > /dev/null 2>&1; then
    echo "❌ 应用未运行，请先启动应用"
    echo "💡 运行: ./scripts/setup.sh start"
    exit 1
fi

echo "✅ 应用运行检查通过"
echo ""

# 运行测试
echo "🚀 开始运行 API 测试..."
node test/api-test.js

echo ""
echo "✅ 测试完成！"