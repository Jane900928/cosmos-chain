const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const router = express.Router();

// 矿工数据存储路径
const MINERS_DATA_PATH = path.join(__dirname, '../../data/miners.json');

// 确保数据目录存在
async function ensureDataDir() {
    await fs.ensureDir(path.dirname(MINERS_DATA_PATH));
}

// 读取矿工数据
async function loadMiners() {
    try {
        await ensureDataDir();
        if (await fs.pathExists(MINERS_DATA_PATH)) {
            return await fs.readJson(MINERS_DATA_PATH);
        }
        return {};
    } catch (error) {
        console.error('Failed to load miners:', error);
        return {};
    }
}

// 保存矿工数据
async function saveMiners(miners) {
    try {
        await ensureDataDir();
        await fs.writeJson(MINERS_DATA_PATH, miners, { spaces: 2 });
    } catch (error) {
        console.error('Failed to save miners:', error);
        throw error;
    }
}

// 注册矿工
router.post('/register', async (req, res) => {
    try {
        const { userId, minerName, hashRate } = req.body;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        if (!userId || !minerName) {
            return res.status(400).json({ 
                error: 'Missing required parameters: userId, minerName' 
            });
        }

        // 读取用户数据
        const usersPath = path.join(__dirname, '../../data/users.json');
        const users = await fs.readJson(usersPath);
        const user = users[userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 加载现有矿工
        const miners = await loadMiners();

        // 检查是否已经注册
        const existingMiner = Object.values(miners).find(m => m.userId === userId);
        if (existingMiner) {
            return res.status(400).json({ error: 'User already registered as miner' });
        }

        // 创建矿工记录
        const minerId = `miner_${userId}`;
        const newMiner = {
            id: minerId,
            userId: userId,
            address: user.address,
            name: minerName,
            hashRate: hashRate || 1000000, // 默认算力 1MH/s
            status: 'active',
            totalBlocks: 0,
            totalRewards: 0,
            lastBlockTime: null,
            registeredAt: new Date().toISOString(),
            statistics: {
                blocksToday: 0,
                rewardsToday: 0,
                averageBlockTime: 0,
                efficiency: 100
            }
        };

        miners[minerId] = newMiner;
        await saveMiners(miners);

        res.json({
            success: true,
            miner: newMiner,
            message: 'Miner registered successfully'
        });

    } catch (error) {
        console.error('Error registering miner:', error);
        res.status(500).json({ 
            error: 'Failed to register miner',
            details: error.message 
        });
    }
});

// 获取所有矿工
router.get('/', async (req, res) => {
    try {
        const miners = await loadMiners();
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        // 获取当前区块高度用于计算统计信息
        const latestBlock = await cosmosClient.getBlock();
        const currentHeight = parseInt(latestBlock.block.header.height);

        res.json({
            success: true,
            miners: Object.values(miners),
            networkStats: {
                currentHeight: currentHeight,
                totalMiners: Object.keys(miners).length,
                activeMiners: Object.values(miners).filter(m => m.status === 'active').length
            }
        });

    } catch (error) {
        console.error('Error getting miners:', error);
        res.status(500).json({ 
            error: 'Failed to get miners',
            details: error.message 
        });
    }
});

// 获取单个矿工信息
router.get('/:minerId', async (req, res) => {
    try {
        const { minerId } = req.params;
        const miners = await loadMiners();
        
        const miner = miners[minerId];
        if (!miner) {
            return res.status(404).json({ error: 'Miner not found' });
        }

        res.json({
            success: true,
            miner: miner
        });

    } catch (error) {
        console.error('Error getting miner:', error);
        res.status(500).json({ 
            error: 'Failed to get miner',
            details: error.message 
        });
    }
});

// 模拟挖矿（生成区块奖励）
router.post('/:minerId/mine', async (req, res) => {
    try {
        const { minerId } = req.params;
        const { reward = 10 } = req.body; // 默认奖励 10 token
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const miners = await loadMiners();
        const miner = miners[minerId];
        
        if (!miner) {
            return res.status(404).json({ error: 'Miner not found' });
        }

        if (miner.status !== 'active') {
            return res.status(400).json({ error: 'Miner is not active' });
        }

        // 获取当前区块信息
        const latestBlock = await cosmosClient.getBlock();
        const currentHeight = parseInt(latestBlock.block.header.height);
        const currentTime = new Date().toISOString();

        // 模拟挖矿成功概率（基于算力）
        const miningProbability = Math.min(miner.hashRate / 10000000, 0.8); // 最高80%成功率
        const miningSuccess = Math.random() < miningProbability;

        if (!miningSuccess) {
            return res.json({
                success: false,
                message: 'Mining attempt failed',
                probability: Math.round(miningProbability * 100),
                nextAttempt: 'Try again'
            });
        }

        // 更新矿工统计信息
        miner.totalBlocks += 1;
        miner.totalRewards += reward;
        miner.lastBlockTime = currentTime;
        miner.statistics.blocksToday += 1;
        miner.statistics.rewardsToday += reward;

        // 计算平均出块时间
        if (miner.totalBlocks > 1) {
            const timeDiff = new Date(currentTime) - new Date(miner.registeredAt);
            miner.statistics.averageBlockTime = Math.round(timeDiff / miner.totalBlocks / 1000); // 秒
        }

        miners[minerId] = miner;
        await saveMiners(miners);

        // 模拟发放挖矿奖励（这里需要一个系统账户来发放奖励）
        // 在实际应用中，这应该是区块链协议自动处理的
        
        res.json({
            success: true,
            miningResult: {
                blockHeight: currentHeight + 1, // 模拟下一个区块
                reward: reward,
                timestamp: currentTime,
                miner: {
                    id: miner.id,
                    name: miner.name,
                    address: miner.address,
                    totalBlocks: miner.totalBlocks,
                    totalRewards: miner.totalRewards
                }
            },
            message: 'Block mined successfully!'
        });

    } catch (error) {
        console.error('Error mining:', error);
        res.status(500).json({ 
            error: 'Mining failed',
            details: error.message 
        });
    }
});

// 更新矿工状态
router.put('/:minerId/status', async (req, res) => {
    try {
        const { minerId } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive', 'maintenance'].includes(status)) {
            return res.status(400).json({ 
                error: 'Invalid status. Must be: active, inactive, or maintenance' 
            });
        }

        const miners = await loadMiners();
        const miner = miners[minerId];
        
        if (!miner) {
            return res.status(404).json({ error: 'Miner not found' });
        }

        miner.status = status;
        miner.updatedAt = new Date().toISOString();

        miners[minerId] = miner;
        await saveMiners(miners);

        res.json({
            success: true,
            miner: miner,
            message: `Miner status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating miner status:', error);
        res.status(500).json({ 
            error: 'Failed to update miner status',
            details: error.message 
        });
    }
});

// 获取挖矿统计信息
router.get('/stats/overview', async (req, res) => {
    try {
        const miners = await loadMiners();
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const allMiners = Object.values(miners);
        
        // 计算总体统计
        const totalHashRate = allMiners.reduce((sum, miner) => sum + miner.hashRate, 0);
        const totalBlocks = allMiners.reduce((sum, miner) => sum + miner.totalBlocks, 0);
        const totalRewards = allMiners.reduce((sum, miner) => sum + miner.totalRewards, 0);
        const activeMiners = allMiners.filter(m => m.status === 'active').length;

        // 获取网络信息
        const latestBlock = await cosmosClient.getBlock();
        const networkStatus = await cosmosClient.getStatus();

        res.json({
            success: true,
            stats: {
                network: {
                    currentHeight: latestBlock.block.header.height,
                    chainId: networkStatus.nodeInfo.network,
                    latestBlockTime: latestBlock.block.header.time
                },
                mining: {
                    totalMiners: allMiners.length,
                    activeMiners: activeMiners,
                    totalHashRate: totalHashRate,
                    totalBlocksMined: totalBlocks,
                    totalRewardsDistributed: totalRewards,
                    averageHashRate: allMiners.length > 0 ? Math.round(totalHashRate / allMiners.length) : 0
                },
                topMiners: allMiners
                    .sort((a, b) => b.totalBlocks - a.totalBlocks)
                    .slice(0, 5)
                    .map(miner => ({
                        name: miner.name,
                        address: miner.address,
                        totalBlocks: miner.totalBlocks,
                        totalRewards: miner.totalRewards,
                        hashRate: miner.hashRate
                    }))
            }
        });

    } catch (error) {
        console.error('Error getting mining stats:', error);
        res.status(500).json({ 
            error: 'Failed to get mining stats',
            details: error.message 
        });
    }
});

// 获取挖矿历史
router.get('/:minerId/history', async (req, res) => {
    try {
        const { minerId } = req.params;
        const { limit = 20 } = req.query;
        
        const miners = await loadMiners();
        const miner = miners[minerId];
        
        if (!miner) {
            return res.status(404).json({ error: 'Miner not found' });
        }

        // 这里返回模拟的挖矿历史
        // 在实际应用中，应该从区块链查询实际的区块数据
        const history = [];
        for (let i = 0; i < Math.min(miner.totalBlocks, parseInt(limit)); i++) {
            history.push({
                blockHeight: 1000 + i, // 模拟区块高度
                timestamp: new Date(Date.now() - i * 6000).toISOString(), // 模拟时间（6秒间隔）
                reward: 10,
                gasRewards: Math.random() * 0.5,
                difficulty: 1000000 + Math.random() * 100000
            });
        }

        res.json({
            success: true,
            miner: {
                id: miner.id,
                name: miner.name,
                address: miner.address
            },
            history: history.reverse() // 最新的在前面
        });

    } catch (error) {
        console.error('Error getting mining history:', error);
        res.status(500).json({ 
            error: 'Failed to get mining history',
            details: error.message 
        });
    }
});

module.exports = router;