const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 用户数据存储路径
const USERS_DATA_PATH = path.join(__dirname, '../../data/users.json');

// 确保数据目录存在
async function ensureDataDir() {
    await fs.ensureDir(path.dirname(USERS_DATA_PATH));
}

// 读取用户数据
async function loadUsers() {
    try {
        await ensureDataDir();
        if (await fs.pathExists(USERS_DATA_PATH)) {
            return await fs.readJson(USERS_DATA_PATH);
        }
        return {};
    } catch (error) {
        console.error('Failed to load users:', error);
        return {};
    }
}

// 保存用户数据
async function saveUsers(users) {
    try {
        await ensureDataDir();
        await fs.writeJson(USERS_DATA_PATH, users, { spaces: 2 });
    } catch (error) {
        console.error('Failed to save users:', error);
        throw error;
    }
}

// 创建新用户
router.post('/create', async (req, res) => {
    try {
        const { name, mnemonic } = req.body;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        // 生成新用户
        const userAccount = await cosmosClient.createUser(mnemonic);
        const userId = uuidv4();

        // 加载现有用户
        const users = await loadUsers();

        // 创建用户对象
        const newUser = {
            id: userId,
            name: name || `User_${userId.slice(0, 8)}`,
            address: userAccount.address,
            publicKey: userAccount.publicKey,
            createdAt: new Date().toISOString(),
            // 注意：在生产环境中不应该存储助记词！
            mnemonic: userAccount.mnemonic
        };

        // 保存用户
        users[userId] = newUser;
        await saveUsers(users);

        // 返回用户信息（不包含助记词）
        const { mnemonic: _, ...userResponse } = newUser;
        res.json({
            success: true,
            user: userResponse,
            message: 'User created successfully'
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ 
            error: 'Failed to create user',
            details: error.message 
        });
    }
});

// 获取所有用户
router.get('/', async (req, res) => {
    try {
        const users = await loadUsers();
        
        // 移除敏感信息
        const safeUsers = Object.values(users).map(user => {
            const { mnemonic, ...safeUser } = user;
            return safeUser;
        });

        res.json({
            success: true,
            users: safeUsers
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ 
            error: 'Failed to get users',
            details: error.message 
        });
    }
});

// 获取单个用户
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const users = await loadUsers();
        
        const user = users[id];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 移除敏感信息
        const { mnemonic, ...safeUser } = user;
        res.json({
            success: true,
            user: safeUser
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ 
            error: 'Failed to get user',
            details: error.message 
        });
    }
});

// 获取用户余额
router.get('/:id/balance', async (req, res) => {
    try {
        const { id } = req.params;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const users = await loadUsers();
        const user = users[id];
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 获取用户余额
        const balances = await cosmosClient.getAllBalances(user.address);

        res.json({
            success: true,
            address: user.address,
            balances: balances
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({ 
            error: 'Failed to get balance',
            details: error.message 
        });
    }
});

// 通过地址获取用户信息
router.get('/address/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const users = await loadUsers();
        
        const user = Object.values(users).find(u => u.address === address);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 移除敏感信息
        const { mnemonic, ...safeUser } = user;
        res.json({
            success: true,
            user: safeUser
        });
    } catch (error) {
        console.error('Error getting user by address:', error);
        res.status(500).json({ 
            error: 'Failed to get user',
            details: error.message 
        });
    }
});

// 导出用户私钥/助记词（仅用于开发测试）
router.post('/:id/export', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body; // 在实际应用中需要验证密码
        
        const users = await loadUsers();
        const user = users[id];
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 简单的密码验证（在生产中应该更安全）
        if (password !== 'export123') {
            return res.status(401).json({ error: 'Invalid password' });
        }

        res.json({
            success: true,
            mnemonic: user.mnemonic,
            warning: 'Keep this mnemonic safe and never share it!'
        });
    } catch (error) {
        console.error('Error exporting user:', error);
        res.status(500).json({ 
            error: 'Failed to export user',
            details: error.message 
        });
    }
});

module.exports = router;