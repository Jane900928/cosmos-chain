const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const router = express.Router();

// 用户数据路径
const USERS_DATA_PATH = path.join(__dirname, '../../data/users.json');

// 读取用户数据
async function loadUsers() {
    try {
        if (await fs.pathExists(USERS_DATA_PATH)) {
            return await fs.readJson(USERS_DATA_PATH);
        }
        return {};
    } catch (error) {
        console.error('Failed to load users:', error);
        return {};
    }
}

// 代币转账
router.post('/transfer', async (req, res) => {
    try {
        const { fromUserId, toAddress, amount, denom = 'stake', memo = '' } = req.body;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        // 验证参数
        if (!fromUserId || !toAddress || !amount) {
            return res.status(400).json({ 
                error: 'Missing required parameters: fromUserId, toAddress, amount' 
            });
        }

        // 获取发送者信息
        const users = await loadUsers();
        const fromUser = users[fromUserId];
        
        if (!fromUser) {
            return res.status(404).json({ error: 'Sender user not found' });
        }

        // 验证金额
        const transferAmount = parseInt(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // 检查发送者余额
        const senderBalance = await cosmosClient.getBalance(fromUser.address, denom);
        const senderAmount = parseInt(senderBalance.amount);
        
        if (senderAmount < transferAmount) {
            return res.status(400).json({ 
                error: 'Insufficient balance',
                available: senderAmount,
                required: transferAmount
            });
        }

        // 执行转账
        const result = await cosmosClient.sendTokens(
            fromUser.mnemonic,
            toAddress,
            transferAmount.toString(),
            denom,
            memo
        );

        res.json({
            success: true,
            transaction: {
                hash: result.transactionHash,
                height: result.height,
                gasUsed: result.gasUsed,
                gasWanted: result.gasWanted,
                from: fromUser.address,
                to: toAddress,
                amount: transferAmount,
                denom: denom,
                memo: memo
            },
            message: 'Transfer completed successfully'
        });

    } catch (error) {
        console.error('Error transferring tokens:', error);
        res.status(500).json({ 
            error: 'Failed to transfer tokens',
            details: error.message 
        });
    }
});

// 代币生产/铸造（简化版本）
router.post('/mint', async (req, res) => {
    try {
        const { minterUserId, recipientAddress, amount, denom = 'stake' } = req.body;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        // 验证参数
        if (!minterUserId || !recipientAddress || !amount) {
            return res.status(400).json({ 
                error: 'Missing required parameters: minterUserId, recipientAddress, amount' 
            });
        }

        // 获取铸造者信息
        const users = await loadUsers();
        const minterUser = users[minterUserId];
        
        if (!minterUser) {
            return res.status(404).json({ error: 'Minter user not found' });
        }

        // 验证金额
        const mintAmount = parseInt(amount);
        if (isNaN(mintAmount) || mintAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // 执行代币铸造（这里使用转账模拟，实际需要铸造权限）
        const result = await cosmosClient.mintTokens(
            minterUser.mnemonic,
            recipientAddress,
            mintAmount.toString(),
            denom
        );

        res.json({
            success: true,
            transaction: {
                hash: result.transactionHash,
                height: result.height,
                gasUsed: result.gasUsed,
                gasWanted: result.gasWanted,
                minter: minterUser.address,
                recipient: recipientAddress,
                amount: mintAmount,
                denom: denom
            },
            message: 'Tokens minted successfully'
        });

    } catch (error) {
        console.error('Error minting tokens:', error);
        res.status(500).json({ 
            error: 'Failed to mint tokens',
            details: error.message 
        });
    }
});

// 获取代币信息
router.get('/info/:denom?', async (req, res) => {
    try {
        const { denom = 'stake' } = req.params;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        // 获取所有用户
        const users = await loadUsers();
        const userAddresses = Object.values(users).map(user => user.address);

        // 获取每个用户的余额
        const balances = [];
        let totalSupply = 0;

        for (const address of userAddresses) {
            try {
                const balance = await cosmosClient.getBalance(address, denom);
                const amount = parseInt(balance.amount);
                if (amount > 0) {
                    balances.push({
                        address: address,
                        amount: amount,
                        denom: denom
                    });
                    totalSupply += amount;
                }
            } catch (error) {
                console.error(`Failed to get balance for ${address}:`, error);
            }
        }

        res.json({
            success: true,
            tokenInfo: {
                denom: denom,
                totalSupply: totalSupply,
                holders: balances.length,
                balances: balances
            }
        });

    } catch (error) {
        console.error('Error getting token info:', error);
        res.status(500).json({ 
            error: 'Failed to get token info',
            details: error.message 
        });
    }
});

// 获取交易历史
router.get('/transactions', async (req, res) => {
    try {
        const { address, limit = 10 } = req.query;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        let transactions = [];
        
        if (address) {
            // 搜索特定地址的交易
            const senderTxs = await cosmosClient.searchTransactions([
                { key: 'message.sender', value: address }
            ]);
            
            const recipientTxs = await cosmosClient.searchTransactions([
                { key: 'transfer.recipient', value: address }
            ]);
            
            transactions = [...senderTxs, ...recipientTxs];
        } else {
            // 获取最近的交易（这里可能需要根据具体实现调整）
            try {
                const recentTxs = await cosmosClient.searchTransactions([]);
                transactions = recentTxs;
            } catch (error) {
                console.log('No transactions found');
                transactions = [];
            }
        }

        // 限制结果数量
        transactions = transactions.slice(0, parseInt(limit));

        res.json({
            success: true,
            transactions: transactions.map(tx => ({
                hash: tx.hash,
                height: tx.height,
                timestamp: tx.timestamp,
                gasUsed: tx.gasUsed,
                gasWanted: tx.gasWanted,
                events: tx.events,
                memo: tx.memo
            }))
        });

    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ 
            error: 'Failed to get transactions',
            details: error.message 
        });
    }
});

// 根据哈希获取交易详情
router.get('/transaction/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const transaction = await cosmosClient.getTransaction(hash);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({
            success: true,
            transaction: {
                hash: transaction.hash,
                height: transaction.height,
                timestamp: transaction.timestamp,
                gasUsed: transaction.gasUsed,
                gasWanted: transaction.gasWanted,
                fee: transaction.fee,
                memo: transaction.memo,
                events: transaction.events,
                rawLog: transaction.rawLog
            }
        });

    } catch (error) {
        console.error('Error getting transaction:', error);
        res.status(500).json({ 
            error: 'Failed to get transaction',
            details: error.message 
        });
    }
});

module.exports = router;