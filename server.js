const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// 导入路由模块
const cosmosClient = require('./src/cosmos-client');
const userRoutes = require('./src/routes/users');
const tokenRoutes = require('./src/routes/tokens');
const blockchainRoutes = require('./src/routes/blockchain');
const minerRoutes = require('./src/routes/miner');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 初始化 Cosmos 客户端
let client = null;
let isInitializing = false;

async function initializeCosmosClient() {
    if (isInitializing) {
        console.log('Client initialization already in progress...');
        return client;
    }
    
    isInitializing = true;
    try {
        console.log('Initializing Cosmos client...');
        client = await cosmosClient.initializeClient();
        console.log('✅ Cosmos client initialized successfully');
        return client;
    } catch (err) {
        console.error('❌ Failed to initialize Cosmos client:', err.message);
        console.log('ℹ️  Application will continue with limited functionality');
        client = null;
        return null;
    } finally {
        isInitializing = false;
    }
}

// 启动时初始化客户端
initializeCosmosClient();

// 将客户端传递给路由的中间件
app.use((req, res, next) => {
    req.cosmosClient = client;
    req.isClientConnected = client !== null;
    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        cosmosConnected: client !== null,
        environment: process.env.NODE_ENV || 'development'
    });
});

// API 路由
app.use('/api/users', userRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/miner', minerRoutes);

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 重新连接端点
app.post('/api/reconnect', async (req, res) => {
    try {
        console.log('Manual reconnection requested...');
        const newClient = await initializeCosmosClient();
        res.json({
            success: newClient !== null,
            message: newClient ? 'Reconnected successfully' : 'Reconnection failed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Reconnection failed',
            details: error.message
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    if (client) {
        await client.disconnect();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    if (client) {
        await client.disconnect();
    }
    process.exit(0);
});

// 定期检查连接状态
setInterval(async () => {
    if (!client) {
        console.log('🔄 Attempting to reconnect to Cosmos client...');
        await initializeCosmosClient();
    }
}, 30000); // 每30秒检查一次

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📱 Blockchain Explorer: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔗 RPC Endpoint: ${process.env.RPC_ENDPOINT || 'http://localhost:26657'}`);
    console.log(`⛓️  Chain ID: ${process.env.CHAIN_ID || 'test-chain'}`);
});

module.exports = app;