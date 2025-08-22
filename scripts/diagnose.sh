#!/bin/bash

# 快速诊断脚本 - 检查 Cosmos 区块链应用状态
# 使用方法: ./scripts/diagnose.sh

echo "🔍 Cosmos 区块链应用诊断工具"
echo "=============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_service() {
    local service_name=$1
    local url=$2
    local description=$3
    
    echo -n "检查 $description... "
    
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 运行中${NC}"
        return 0
    else
        echo -e "${RED}❌ 不可用${NC}"
        return 1
    fi
}

# 1. 检查端口占用
echo -e "${BLUE}1. 检查端口状态${NC}"
echo "应用端口 (3000):"
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 端口 3000 被占用${NC}"
    lsof -i :3000 | grep LISTEN
else
    echo -e "${RED}❌ 端口 3000 未被占用${NC}"
fi

echo ""
echo "Cosmos RPC 端口 (26657):"
if lsof -i :26657 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 端口 26657 被占用${NC}"
    lsof -i :26657 | grep LISTEN
else
    echo -e "${RED}❌ 端口 26657 未被占用${NC}"
fi

echo ""

# 2. 检查服务状态
echo -e "${BLUE}2. 检查服务连通性${NC}"
check_service "app" "http://localhost:3000/health" "应用健康检查"
check_service "cosmos-rpc" "http://localhost:26657/status" "Cosmos RPC"
check_service "blockchain-api" "http://localhost:3000/api/blockchain/status" "区块链 API"

echo ""

# 3. 检查进程
echo -e "${BLUE}3. 检查运行进程${NC}"
echo "Node.js 进程:"
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✅ Node.js 应用正在运行${NC}"
    ps aux | grep "node.*server.js" | grep -v grep
else
    echo -e "${RED}❌ Node.js 应用未运行${NC}"
fi

echo ""
echo "Ignite 进程:"
if pgrep -f "ignite.*serve" > /dev/null; then
    echo -e "${GREEN}✅ Ignite 链正在运行${NC}"
    ps aux | grep "ignite.*serve" | grep -v grep
else
    echo -e "${RED}❌ Ignite 链未运行${NC}"
fi

echo ""

# 4. 检查配置文件
echo -e "${BLUE}4. 检查配置文件${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env 文件存在${NC}"
    echo "配置内容:"
    cat .env | grep -v "^#" | grep -v "^$"
else
    echo -e "${RED}❌ .env 文件不存在${NC}"
    echo "建议运行: cp .env.example .env"
fi

echo ""

# 5. 检查数据目录
echo -e "${BLUE}5. 检查数据目录${NC}"
if [ -d "data" ]; then
    echo -e "${GREEN}✅ data 目录存在${NC}"
    echo "数据文件:"
    ls -la data/ 2>/dev/null || echo "目录为空"
else
    echo -e "${RED}❌ data 目录不存在${NC}"
    echo "建议运行: mkdir -p data"
fi

echo ""

# 6. 检查依赖
echo -e "${BLUE}6. 检查依赖安装${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules 存在${NC}"
    if [ -f "package-lock.json" ]; then
        echo -e "${GREEN}✅ package-lock.json 存在${NC}"
    else
        echo -e "${YELLOW}⚠️  package-lock.json 不存在${NC}"
    fi
else
    echo -e "${RED}❌ node_modules 不存在${NC}"
    echo "建议运行: npm install"
fi

echo ""

# 7. 测试 API 响应
echo -e "${BLUE}7. 测试 API 响应${NC}"
if curl -s --max-time 10 "http://localhost:3000/health" > /dev/null 2>&1; then
    echo "健康检查响应:"
    curl -s "http://localhost:3000/health" | jq . 2>/dev/null || curl -s "http://localhost:3000/health"
    echo ""
    
    echo "区块链状态响应:"
    curl -s "http://localhost:3000/api/blockchain/status" | head -c 200
    echo "..."
else
    echo -e "${RED}❌ 无法连接到应用${NC}"
fi

echo ""

# 8. 检查日志文件
echo -e "${BLUE}8. 检查日志文件${NC}"
if [ -f "cosmos-chain.log" ]; then
    echo -e "${GREEN}✅ 发现日志文件${NC}"
    echo "最后10行日志:"
    tail -10 cosmos-chain.log
else
    echo -e "${YELLOW}⚠️  未发现日志文件${NC}"
fi

echo ""

# 9. 诊断建议
echo -e "${BLUE}9. 诊断建议${NC}"
echo "根据检查结果，建议的修复步骤:"

# 检查是否需要启动 Cosmos 链
if ! curl -s --max-time 5 "http://localhost:26657/status" > /dev/null 2>&1; then
    echo -e "${YELLOW}• 启动 Cosmos 链: cd test-chain && ignite chain serve${NC}"
fi

# 检查是否需要启动应用
if ! curl -s --max-time 5 "http://localhost:3000/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}• 启动应用: npm start${NC}"
fi

# 检查是否需要安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}• 安装依赖: npm install${NC}"
fi

# 检查是否需要创建配置文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}• 创建配置文件: cp .env.example .env${NC}"
fi

echo ""
echo -e "${GREEN}🔧 一键修复命令:${NC}"
echo "./scripts/setup.sh install  # 完整安装"
echo "./scripts/setup.sh start    # 启动所有服务"
echo "./scripts/clean.sh          # 清理并重新开始"

echo ""
echo -e "${BLUE}📋 快速测试命令:${NC}"
echo "curl http://localhost:3000/health"
echo "curl http://localhost:3000/api/blockchain/status"
echo "curl http://localhost:26657/status"

echo ""
echo "诊断完成! 🎉"