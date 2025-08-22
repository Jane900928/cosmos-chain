#!/bin/bash

# 初始化脚本 - 为测试用户添加初始代币
# 使用方法: ./scripts/init-testnet.sh

echo "🪙 初始化测试网络代币"
echo "===================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://localhost:3000/api"

echo -e "${BLUE}1. 检查应用状态...${NC}"
if ! curl -s "$API_BASE/blockchain/status" > /dev/null 2>&1; then
    echo "❌ 应用未运行，请先启动应用"
    echo "运行: npm start"
    exit 1
fi

echo -e "${GREEN}✅ 应用运行正常${NC}"

echo -e "${BLUE}2. 创建测试用户...${NC}"

# 创建第一个用户（铸造者）
echo "创建铸造者用户..."
MINTER_RESPONSE=$(curl -s -X POST "$API_BASE/users/create" \
  -H "Content-Type: application/json" \
  -d '{"name": "Minter"}')

MINTER_ID=$(echo $MINTER_RESPONSE | jq -r '.user.id // empty' 2>/dev/null)
MINTER_ADDRESS=$(echo $MINTER_RESPONSE | jq -r '.user.address // empty' 2>/dev/null)

if [ -z "$MINTER_ID" ]; then
    echo "❌ 创建铸造者失败"
    echo "响应: $MINTER_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ 铸造者创建成功${NC}"
echo "ID: $MINTER_ID"
echo "地址: $MINTER_ADDRESS"

# 创建第二个用户（接收者）
echo ""
echo "创建接收者用户..."
RECEIVER_RESPONSE=$(curl -s -X POST "$API_BASE/users/create" \
  -H "Content-Type: application/json" \
  -d '{"name": "Receiver"}')

RECEIVER_ID=$(echo $RECEIVER_RESPONSE | jq -r '.user.id // empty' 2>/dev/null)
RECEIVER_ADDRESS=$(echo $RECEIVER_RESPONSE | jq -r '.user.address // empty' 2>/dev/null)

if [ -z "$RECEIVER_ID" ]; then
    echo "❌ 创建接收者失败"
    echo "响应: $RECEIVER_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ 接收者创建成功${NC}"
echo "ID: $RECEIVER_ID"
echo "地址: $RECEIVER_ADDRESS"

echo -e "${BLUE}3. 铸造初始代币...${NC}"

# 给铸造者铸造大量代币
echo "给铸造者铸造 1,000,000 代币..."
MINT_RESPONSE=$(curl -s -X POST "$API_BASE/tokens/mint" \
  -H "Content-Type: application/json" \
  -d "{
    \"minterUserId\": \"$MINTER_ID\",
    \"recipientAddress\": \"$MINTER_ADDRESS\",
    \"amount\": 1000000
  }")

if echo $MINT_RESPONSE | grep -q "success.*true"; then
    echo -e "${GREEN}✅ 代币铸造成功${NC}"
    TX_HASH=$(echo $MINT_RESPONSE | jq -r '.transaction.hash // empty' 2>/dev/null)
    echo "交易哈希: $TX_HASH"
else
    echo -e "${YELLOW}⚠️ 代币铸造失败，可能是模拟模式${NC}"
    echo "响应: $MINT_RESPONSE"
fi

# 给接收者也铸造一些代币
echo ""
echo "给接收者铸造 100,000 代币..."
MINT_RESPONSE2=$(curl -s -X POST "$API_BASE/tokens/mint" \
  -H "Content-Type: application/json" \
  -d "{
    \"minterUserId\": \"$MINTER_ID\",
    \"recipientAddress\": \"$RECEIVER_ADDRESS\",
    \"amount\": 100000
  }")

if echo $MINT_RESPONSE2 | grep -q "success.*true"; then
    echo -e "${GREEN}✅ 代币铸造成功${NC}"
else
    echo -e "${YELLOW}⚠️ 代币铸造失败${NC}"
fi

echo -e "${BLUE}4. 检查余额...${NC}"

# 检查铸造者余额
echo "检查铸造者余额..."
BALANCE1=$(curl -s "$API_BASE/users/$MINTER_ID/balance")
echo "铸造者余额: $BALANCE1"

echo ""
echo "检查接收者余额..."
BALANCE2=$(curl -s "$API_BASE/users/$RECEIVER_ID/balance")
echo "接收者余额: $BALANCE2"

echo -e "${BLUE}5. 测试转账...${NC}"

# 测试转账
echo "测试转账 1000 代币..."
TRANSFER_RESPONSE=$(curl -s -X POST "$API_BASE/tokens/transfer" \
  -H "Content-Type: application/json" \
  -d "{
    \"fromUserId\": \"$MINTER_ID\",
    \"toAddress\": \"$RECEIVER_ADDRESS\",
    \"amount\": 1000,
    \"memo\": \"测试转账\"
  }")

if echo $TRANSFER_RESPONSE | grep -q "success.*true"; then
    echo -e "${GREEN}✅ 转账测试成功${NC}"
    TX_HASH=$(echo $TRANSFER_RESPONSE | jq -r '.transaction.hash // empty' 2>/dev/null)
    echo "交易哈希: $TX_HASH"
else
    echo -e "${YELLOW}⚠️ 转账测试失败${NC}"
    echo "响应: $TRANSFER_RESPONSE"
fi

echo -e "${BLUE}6. 创建测试矿工...${NC}"

# 注册矿工
echo "注册测试矿工..."
MINER_RESPONSE=$(curl -s -X POST "$API_BASE/miner/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$MINER_ID\",
    \"minerName\": \"TestMiner-001\",
    \"hashRate\": 5000000
  }")

if echo $MINER_RESPONSE | grep -q "success.*true"; then
    echo -e "${GREEN}✅ 矿工注册成功${NC}"
    MINER_ID_RESULT=$(echo $MINER_RESPONSE | jq -r '.miner.id // empty' 2>/dev/null)
    echo "矿工ID: $MINER_ID_RESULT"
else
    echo -e "${YELLOW}⚠️ 矿工注册失败${NC}"
    echo "响应: $MINER_RESPONSE"
fi

echo ""
echo -e "${GREEN}🎉 测试网络初始化完成！${NC}"
echo ""
echo "📋 测试账户信息:"
echo "铸造者ID: $MINTER_ID"
echo "铸造者地址: $MINTER_ADDRESS"
echo "接收者ID: $RECEIVER_ID" 
echo "接收者地址: $RECEIVER_ADDRESS"
echo ""
echo "🌐 访问区块链浏览器: http://localhost:3000"
echo ""
echo "💡 使用提示:"
echo "1. 在前端界面选择用户时，使用上面显示的用户ID"
echo "2. 铸造者账户有足够余额进行转账测试"
echo "3. 如果仍然余额不足，可以使用铸造功能添加更多代币"