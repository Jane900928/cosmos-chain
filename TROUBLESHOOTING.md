# 故障排除指南

本文档包含了 Cosmos 区块链应用的常见问题和解决方案。

## 🔧 常见错误及解决方案

### 1. "Cosmos client not initialized" 错误

**问题描述**:
```json
{
  "error": "Cosmos client not initialized"
}
```

**可能原因**:
- Cosmos 节点未运行
- RPC 端点配置错误
- 网络连接问题

**解决方案**:
```bash
# 1. 检查 Cosmos 节点是否运行
curl http://localhost:26657/status

# 2. 如果未运行，启动 Cosmos 链
cd test-chain
ignite chain serve

# 3. 检查 .env 配置
cat .env
# 确保 RPC_ENDPOINT=http://localhost:26657

# 4. 重启应用
npm start
```

### 2. "Cannot read properties of undefined (reading 'txs')" 错误

**问题描述**:
```json
{
  "error": "Failed to get blockchain status",
  "details": "Cannot read properties of undefined (reading 'txs')"
}
```

**解决方案**:
已修复！更新的代码包含了完整的空值检查。如果仍然遇到此错误：

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重启应用
npm start

# 3. 如果问题持续，清理并重新启动
./scripts/clean.sh
./scripts/setup.sh start
```

### 3. "Failed to connect to blockchain" 错误

**问题描述**:
应用启动时连接失败

**解决方案**:
```bash
# 1. 确保 Ignite CLI 已安装
ignite version

# 2. 如果未安装，安装 Ignite
curl https://get.ignite.com/cli! | bash

# 3. 创建或重启 Cosmos 链
./scripts/setup.sh install
./scripts/setup.sh start-chain

# 4. 等待链完全启动（通常需要30-60秒）
# 然后启动应用
./scripts/setup.sh start-app
```

### 4. 端口冲突错误

**问题描述**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案**:
```bash
# 1. 查找占用端口的进程
lsof -i :3000

# 2. 杀死进程
kill -9 <PID>

# 或者修改 .env 文件使用不同端口
echo "PORT=3001" >> .env

# 3. 重启应用
npm start
```

### 5. "User not found" 或数据丢失

**问题描述**:
之前创建的用户或矿工数据丢失

**原因**:
数据存储在 `data/` 目录的 JSON 文件中，可能被意外删除

**解决方案**:
```bash
# 1. 检查数据文件是否存在
ls -la data/

# 2. 如果文件丢失，重新创建用户
# 通过前端界面或 API 创建新用户

# 3. 备份重要数据（建议定期执行）
cp data/*.json backup/
```

### 6. Gas 费用不足错误

**问题描述**:
```json
{
  "error": "insufficient fees"
}
```

**解决方案**:
```bash
# 1. 确保测试账户有足够的代币
# 在 Ignite 启动的测试链中，通常会自动创建带有代币的测试账户

# 2. 检查账户余额
curl -X GET http://localhost:3000/api/users/{userId}/balance

# 3. 如果余额不足，使用铸造功能添加代币
curl -X POST http://localhost:3000/api/tokens/mint \
  -H "Content-Type: application/json" \
  -d '{
    "minterUserId": "user_id",
    "recipientAddress": "cosmos1...",
    "amount": "10000"
  }'
```

### 7. Docker 相关问题

**问题描述**:
Docker 容器启动失败或连接问题

**解决方案**:
```bash
# 1. 检查 Docker 服务状态
docker --version
docker-compose --version

# 2. 停止并清理所有容器
docker-compose down -v

# 3. 重新构建并启动
docker-compose build --no-cache
docker-compose up -d

# 4. 查看日志
docker-compose logs -f blockchain-app
```

## 🔍 调试技巧

### 1. 启用详细日志

在 `.env` 文件中添加：
```env
DEBUG=true
NODE_ENV=development
```

### 2. 检查服务状态

```bash
# 检查应用状态
./scripts/setup.sh status

# 检查 API 健康状态
curl http://localhost:3000/api/blockchain/status
```

### 3. 查看实时日志

```bash
# 应用日志
tail -f cosmos-chain.log

# Docker 日志
docker-compose logs -f
```

### 4. 测试 API 连通性

```bash
# 运行完整测试套件
./scripts/test.sh

# 或手动测试单个端点
curl http://localhost:3000/api/blockchain/status
curl http://localhost:3000/api/users
curl http://localhost:3000/api/miner/stats/overview
```

## 🚀 性能优化建议

### 1. 数据库替换

当前使用 JSON 文件存储数据，在生产环境建议使用数据库：

```javascript
// 示例：使用 PostgreSQL 替换 JSON 存储
const { Pool } = require('pg');
const pool = new Pool({
  user: 'blockchain',
  host: 'localhost',
  database: 'blockchain_app',
  password: 'password',
  port: 5432,
});
```

### 2. 缓存实现

添加 Redis 缓存来提高性能：

```javascript
// 示例：添加 Redis 缓存
const redis = require('redis');
const client = redis.createClient();

// 缓存区块数据
async function getCachedBlock(height) {
  const cached = await client.get(`block:${height}`);
  if (cached) return JSON.parse(cached);
  
  const block = await cosmosClient.getBlock(height);
  await client.setex(`block:${height}`, 300, JSON.stringify(block));
  return block;
}
```

### 3. API 限流

保护 API 免受滥用：

```javascript
// 示例：添加速率限制
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100 // 最多 100 个请求
});

app.use('/api/', limiter);
```

## 📚 开发指南

### 1. 添加新的 API 端点

1. 在相应的路由文件中添加新端点
2. 更新 cosmos-client.js（如需要）
3. 添加相应的测试用例
4. 更新前端界面

```javascript
// 示例：添加新的代币功能
router.post('/tokens/burn', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    // 实现代币销毁逻辑
    res.json({ success: true, message: 'Tokens burned' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to burn tokens' });
  }
});
```

### 2. 前端功能扩展

添加新的前端功能：

```javascript
// 示例：添加新的模态框
function showBurnModal() {
  document.getElementById('burnModal').style.display = 'block';
}

async function burnTokens() {
  const userId = document.getElementById('burnUserId').value;
  const amount = document.getElementById('burnAmount').value;
  
  try {
    const result = await apiCall('/tokens/burn', {
      method: 'POST',
      body: JSON.stringify({ userId, amount })
    });
    
    if (result.success) {
      showSuccess('代币销毁成功！');
    }
  } catch (error) {
    showError('代币销毁失败: ' + error.message);
  }
}
```

### 3. 测试新功能

```javascript
// 在 test/api-test.js 中添加测试
async function testBurnTokens() {
  const burnData = {
    userId: testData.users[0].id,
    amount: 100
  };
  
  const result = await apiCall('/tokens/burn', 'POST', burnData);
  if (!result.success) {
    throw new Error('Token burning failed');
  }
  
  log.info(`Burned 100 tokens successfully`);
}
```

## 🛠️ 生产部署建议

### 1. 安全性配置

```bash
# 1. 使用环境变量管理敏感信息
export DATABASE_URL="postgresql://user:pass@localhost/db"
export JWT_SECRET="your-secret-key"

# 2. 启用 HTTPS
# 使用 Let's Encrypt 或其他 SSL 证书

# 3. 配置防火墙
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. 监控和日志

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    environment:
      - NODE_ENV=production
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"
```

### 3. 备份策略

```bash
#!/bin/bash
# backup.sh - 定期备份脚本

# 备份数据库
pg_dump blockchain_app > backup/db_$(date +%Y%m%d_%H%M%S).sql

# 备份配置文件
tar -czf backup/config_$(date +%Y%m%d_%H%M%S).tar.gz .env docker-compose.yml

# 清理旧备份（保留30天）
find backup/ -name "*.sql" -mtime +30 -delete
find backup/ -name "*.tar.gz" -mtime +30 -delete
```

## 📞 获取帮助

如果遇到本指南未涵盖的问题：

1. **检查日志**: 查看应用和 Cosmos 链的日志文件
2. **运行测试**: 使用 `./scripts/test.sh` 诊断问题
3. **重新部署**: 使用 `./scripts/clean.sh` 清理后重新安装
4. **查看文档**: 参考 [CosmJS 文档](https://cosmos.github.io/cosmjs/) 和 [Ignite 文档](https://docs.ignite.com/)

## 🔄 更新日志

- **v1.1**: 修复了 txs 未定义错误，添加了全面的空值检查
- **v1.0**: 初始版本，包含所有核心功能

---

**最后更新**: 2025年8月22日
**版本**: 1.1