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
let client;
cosmosClient.initializeClient().then(c => {
    client = c;
    console.log('Cosmos client initialized successfully');
}).catch(err => {
    console.error('Failed to initialize Cosmos client:', err);
});

// 将客户端传递给路由
app.use((req, res, next) => {
    req.cosmosClient = client;
    next();
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

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Blockchain Explorer: http://localhost:${PORT}`);
});

module.exports = app;