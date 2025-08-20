# Cosmos 区块链应用

基于 CosmJS + Express 的简单区块链应用，连接到本地 Ignite 搭建的 Cosmos 网络。

## 🚀 功能特性

- ✅ **代币生产**: 支持代币的铸造功能
- ✅ **用户管理**: 创建和管理区块链用户账户
- ✅ **代币转账**: 实现用户间的代币转账
- ✅ **矿工系统**: 矿工注册和挖矿模拟
- ✅ **区块链浏览器**: 查看区块高度、区块信息和网络状态

## 📋 系统要求

- Node.js 16.x 或更高版本
- npm 或 yarn
- 本地运行的 Cosmos 节点（通过 Ignite 搭建）

## 🛠️ 安装和配置

### 1. 安装 Ignite CLI

```bash
# 安装 Ignite CLI
curl https://get.ignite.com/cli! | bash

# 验证安装
ignite version
```

### 2. 创建并启动 Cosmos 链

```bash
# 创建新的区块链项目
ignite scaffold chain test-chain

# 进入项目目录
cd test-chain

# 启动区块链
ignite chain serve
```

默认情况下，Ignite 会启动：
- RPC 服务器在 `http://localhost:26657`
- API 服务器在 `http://localhost:1317`

### 3. 安装项目依赖

```bash
# 克隆或下载项目文件
# 进入项目目录

# 安装依赖
npm install

# 或使用 yarn
yarn install
```

### 4. 配置环境变量

复制 `.env` 文件并根据需要修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器配置
PORT=3000

# Cosmos 区块链配置
RPC_ENDPOINT=http://localhost:26657
CHAIN_ID=test-chain
ADDRESS_PREFIX=cosmos

# API 配置
API_BASE_URL=http://localhost:3000/api
```

### 5. 启动应用

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

应用将在 `http://localhost:3000` 启动。

## 📖 使用指南

### 访问区块链浏览器

打开浏览器访问 `http://localhost:3000`，您将看到：

- **网络状态面板**: 显示链ID、最新区块高度、节点状态等
- **挖矿统计**: 显示矿工数量、算力、已挖区块等信息
- **代币信息**: 显示代币总供应量、持有者数量等
- **操作面板**: 提供用户管理、代币操作、矿工功能、区块浏览等功能

### API 接口使用

#### 1. 用户管理

**创建用户**
```bash
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

**获取用户列表**
```bash
curl http://localhost:3000/api/users
```

**获取用户余额**
```bash
curl http://localhost:3000/api/users/{userId}/balance
```

#### 2. 代币操作

**代币转账**
```bash
curl -X POST http://localhost:3000/api/tokens/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": "user_id",
    "toAddress": "cosmos1...",
    "amount": "100",
    "memo": "Transfer memo"
  }'
```

**铸造代币**
```bash
curl -X POST http://localhost:3000/api/tokens/mint \
  -H "Content-Type: application/json" \
  -d '{
    "minterUserId": "user_id",
    "recipientAddress": "cosmos1...",
    "amount": "1000"
  }'
```

#### 3. 矿工功能

**注册矿工**
```bash
curl -X POST http://localhost:3000/api/miner/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id",
    "minerName": "Miner-001",
    "hashRate": 5000000
  }'
```

**模拟挖矿**
```bash
curl -X POST http://localhost:3000/api/miner/{minerId}/mine \
  -H "Content-Type: application/json" \
  -d '{"reward": 10}'
```

#### 4. 区块链浏览

**获取网络状态**
```bash
curl http://localhost:3000/api/blockchain/status
```

**获取最新区块**
```bash
curl http://localhost:3000/api/blockchain/blocks/latest
```

**根据高度获取区块**
```bash
curl http://localhost:3000/api/blockchain/blocks/100
```

**搜索功能**
```bash
curl http://localhost:3000/api/blockchain/search/100
```

## 🏗️ 项目结构

```
cosmos-blockchain-app/
├── src/
│   ├── cosmos-client.js      # Cosmos 区块链客户端
│   └── routes/
│       ├── users.js          # 用户管理路由
│       ├── tokens.js         # 代币操作路由
│       ├── blockchain.js     # 区块链浏览器路由
│       └── miner.js          # 矿工管理路由
├── public/
│   └── index.html           # 前端界面
├── data/                    # 数据存储目录
│   ├── users.json          # 用户数据
│   └── miners.json         # 矿工数据
├── server.js               # Express 服务器主文件
├── package.json            # 项目依赖
├── .env                    # 环境配置
└── README.md              # 项目说明
```

## 🔧 开发说明

### 数据存储

目前项目使用 JSON 文件存储用户和矿工数据：
- `data/users.json`: 存储用户信息（包括助记词，仅用于开发测试）
- `data/miners.json`: 存储矿工注册信息和统计数据

**⚠️ 安全警告**: 在生产环境中，绝不应该以明文形式存储助记词！

### 扩展功能

可以根据需要添加以下功能：

1. **数据库集成**: 替换 JSON 文件存储
2. **用户认证**: 添加登录和权限管理
3. **实时通知**: WebSocket 支持实时更新
4. **更多代币功能**: 支持多种代币类型
5. **高级挖矿**: 真实的挖矿算法实现
6. **网络监控**: 更详细的网络状态监控

### 自定义配置

可以通过修改 `.env` 文件来适应不同的 Cosmos 网络：

```env
# 连接到不同的网络
RPC_ENDPOINT=http://your-cosmos-node:26657
CHAIN_ID=your-chain-id
ADDRESS_PREFIX=your-prefix
```

## 🐛 故障排除

### 常见问题

1. **连接失败**: 确保 Cosmos 节点正在运行并且 RPC 端点可访问
2. **交易失败**: 检查账户余额和 gas 费用设置
3. **端口冲突**: 修改 `.env` 中的 PORT 配置

### 调试模式

启用调试日志：

```bash
DEBUG=true npm run dev
```

### 日志查看

应用日志会在控制台显示，包括：
- API 请求和响应
- 区块链交互日志
- 错误信息和堆栈跟踪

## 📚 相关资源

- [CosmJS 文档](https://cosmos.github.io/cosmjs/)
- [Ignite CLI 文档](https://docs.ignite.com/)
- [Cosmos SDK 文档](https://docs.cosmos.network/)
- [Express.js 文档](https://expressjs.com/)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests 来改进这个项目！

## ⚠️ 免责声明

这个项目仅用于学习和开发测试目的。在生产环境中使用前，请确保进行充分的安全审计和测试。