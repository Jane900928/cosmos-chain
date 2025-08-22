const express = require('express');
const router = express.Router();

// 获取区块链状态
router.get('/status', async (req, res) => {
    try {
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const status = await cosmosClient.getStatus();
        const latestBlock = await cosmosClient.getBlock();

        // 安全地访问区块数据
        const transactionCount = latestBlock?.block?.data?.txs?.length || 0;
        const blockTime = latestBlock?.block?.header?.time || new Date().toISOString();
        const blockHeight = latestBlock?.block?.header?.height || '0';
        const blockHash = latestBlock?.blockId?.hash || '';

        res.json({
            success: true,
            status: {
                nodeInfo: {
                    network: status.nodeInfo.network || 'unknown',
                    version: status.nodeInfo.version || 'unknown',
                    moniker: status.nodeInfo.moniker || 'unknown',
                    id: status.nodeInfo.id || 'unknown'
                },
                syncInfo: {
                    latestBlockHash: status.syncInfo.latestBlockHash || '',
                    latestBlockHeight: status.syncInfo.latestBlockHeight || '0',
                    latestBlockTime: status.syncInfo.latestBlockTime || new Date().toISOString(),
                    catchingUp: status.syncInfo.catchingUp || false
                },
                validatorInfo: {
                    address: status.validatorInfo?.address || '',
                    votingPower: status.validatorInfo?.votingPower || '0'
                },
                latestBlock: {
                    height: blockHeight,
                    time: blockTime,
                    hash: blockHash,
                    transactionCount: transactionCount
                }
            }
        });

    } catch (error) {
        console.error('Error getting blockchain status:', error);
        res.status(500).json({ 
            error: 'Failed to get blockchain status',
            details: error.message 
        });
    }
});

// 获取最新区块
router.get('/blocks/latest', async (req, res) => {
    try {
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const block = await cosmosClient.getBlock();

        // 安全地访问区块数据
        const transactions = block?.block?.data?.txs || [];
        const header = block?.block?.header || {};
        const blockId = block?.blockId || {};

        res.json({
            success: true,
            block: {
                height: header.height || '0',
                hash: blockId.hash || '',
                time: header.time || new Date().toISOString(),
                proposerAddress: header.proposerAddress || '',
                transactionCount: transactions.length,
                transactions: transactions,
                previousBlockHash: header.lastBlockId?.hash || '',
                evidence: block?.block?.evidence || {},
                lastCommit: block?.block?.lastCommit || {}
            }
        });

    } catch (error) {
        console.error('Error getting latest block:', error);
        res.status(500).json({ 
            error: 'Failed to get latest block',
            details: error.message 
        });
    }
});

// 根据高度获取区块
router.get('/blocks/:height', async (req, res) => {
    try {
        const { height } = req.params;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const blockHeight = parseInt(height);
        if (isNaN(blockHeight) || blockHeight < 0) {
            return res.status(400).json({ error: 'Invalid block height' });
        }

        const block = await cosmosClient.getBlock(blockHeight);

        if (!block) {
            return res.status(404).json({ error: 'Block not found' });
        }

        // 安全地访问区块数据
        const transactions = block?.block?.data?.txs || [];
        const header = block?.block?.header || {};
        const blockId = block?.blockId || {};

        res.json({
            success: true,
            block: {
                height: header.height || blockHeight.toString(),
                hash: blockId.hash || '',
                time: header.time || new Date().toISOString(),
                proposerAddress: header.proposerAddress || '',
                transactionCount: transactions.length,
                transactions: transactions,
                previousBlockHash: header.lastBlockId?.hash || '',
                evidence: block?.block?.evidence || {},
                lastCommit: block?.block?.lastCommit || {},
                validators: header.validatorsHash || ''
            }
        });

    } catch (error) {
        console.error('Error getting block:', error);
        res.status(500).json({ 
            error: 'Failed to get block',
            details: error.message 
        });
    }
});

// 获取区块列表
router.get('/blocks', async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        // 获取最新区块高度
        const latestBlock = await cosmosClient.getBlock();
        const latestHeight = parseInt(latestBlock?.block?.header?.height || '1');
        
        const limitNum = Math.min(parseInt(limit), 50); // 最多返回50个区块
        const offsetNum = parseInt(offset);
        
        const blocks = [];
        const startHeight = Math.max(1, latestHeight - offsetNum);
        const endHeight = Math.max(1, startHeight - limitNum + 1);

        for (let height = startHeight; height >= endHeight && height > 0; height--) {
            try {
                const block = await cosmosClient.getBlock(height);
                if (block) {
                    const transactions = block?.block?.data?.txs || [];
                    const header = block?.block?.header || {};
                    const blockId = block?.blockId || {};
                    
                    blocks.push({
                        height: header.height || height.toString(),
                        hash: blockId.hash || '',
                        time: header.time || new Date().toISOString(),
                        proposerAddress: header.proposerAddress || '',
                        transactionCount: transactions.length
                    });
                }
            } catch (error) {
                console.error(`Failed to get block ${height}:`, error);
                // 如果获取某个区块失败，添加一个占位符
                blocks.push({
                    height: height.toString(),
                    hash: 'unavailable',
                    time: new Date().toISOString(),
                    proposerAddress: '',
                    transactionCount: 0
                });
            }
        }

        res.json({
            success: true,
            blocks: blocks,
            pagination: {
                total: latestHeight,
                limit: limitNum,
                offset: offsetNum,
                hasMore: endHeight > 1
            }
        });

    } catch (error) {
        console.error('Error getting blocks:', error);
        res.status(500).json({ 
            error: 'Failed to get blocks',
            details: error.message 
        });
    }
});

// 获取验证者信息
router.get('/validators', async (req, res) => {
    try {
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const validators = await cosmosClient.getValidators();

        res.json({
            success: true,
            validators: (validators.validators || []).map(validator => ({
                address: validator.address || '',
                publicKey: validator.pubKey || '',
                votingPower: validator.votingPower || '0',
                proposerPriority: validator.proposerPriority || '0'
            })),
            totalCount: validators.total || 0,
            blockHeight: validators.blockHeight || '0'
        });

    } catch (error) {
        console.error('Error getting validators:', error);
        res.status(500).json({ 
            error: 'Failed to get validators',
            details: error.message 
        });
    }
});

// 获取网络信息
router.get('/network', async (req, res) => {
    try {
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const status = await cosmosClient.getStatus();
        const validators = await cosmosClient.getValidators();
        const latestBlock = await cosmosClient.getBlock();

        // 计算一些统计信息
        const validatorsList = validators.validators || [];
        const totalVotingPower = validatorsList.reduce(
            (sum, validator) => sum + parseInt(validator.votingPower || '0'), 
            0
        );

        res.json({
            success: true,
            network: {
                chainId: status.nodeInfo?.network || 'unknown',
                latestHeight: status.syncInfo?.latestBlockHeight || '0',
                latestBlockTime: status.syncInfo?.latestBlockTime || new Date().toISOString(),
                validatorCount: validatorsList.length,
                totalVotingPower: totalVotingPower,
                averageBlockTime: '~6s', // 这可以通过分析多个区块来计算
                nodeVersion: status.nodeInfo?.version || 'unknown',
                isCatchingUp: status.syncInfo?.catchingUp || false,
                moniker: status.nodeInfo?.moniker || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error getting network info:', error);
        res.status(500).json({ 
            error: 'Failed to get network info',
            details: error.message 
        });
    }
});

// 搜索功能
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const cosmosClient = req.cosmosClient;

        if (!cosmosClient) {
            return res.status(500).json({ error: 'Cosmos client not initialized' });
        }

        const results = {
            type: null,
            data: null
        };

        // 尝试作为区块高度搜索
        const height = parseInt(query);
        if (!isNaN(height) && height > 0) {
            try {
                const block = await cosmosClient.getBlock(height);
                if (block) {
                    const transactions = block?.block?.data?.txs || [];
                    const header = block?.block?.header || {};
                    const blockId = block?.blockId || {};
                    
                    results.type = 'block';
                    results.data = {
                        height: header.height || height.toString(),
                        hash: blockId.hash || '',
                        time: header.time || new Date().toISOString(),
                        transactionCount: transactions.length
                    };
                }
            } catch (error) {
                // 继续尝试其他搜索类型
                console.log('Block search failed:', error.message);
            }
        }

        // 尝试作为交易哈希搜索
        if (!results.data && query.length === 64) {
            try {
                const transaction = await cosmosClient.getTransaction(query);
                if (transaction) {
                    results.type = 'transaction';
                    results.data = {
                        hash: transaction.hash || query,
                        height: transaction.height || '0',
                        gasUsed: transaction.gasUsed || '0',
                        gasWanted: transaction.gasWanted || '0'
                    };
                }
            } catch (error) {
                // 继续尝试其他搜索类型
                console.log('Transaction search failed:', error.message);
            }
        }

        // 尝试作为地址搜索
        if (!results.data && query.length > 20) {
            try {
                const balance = await cosmosClient.getAllBalances(query);
                results.type = 'address';
                results.data = {
                    address: query,
                    balances: balance || []
                };
            } catch (error) {
                // 地址无效或没有余额
                console.log('Address search failed:', error.message);
            }
        }

        if (!results.data) {
            return res.status(404).json({ 
                error: 'No results found',
                query: query 
            });
        }

        res.json({
            success: true,
            query: query,
            result: results
        });

    } catch (error) {
        console.error('Error searching:', error);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.message 
        });
    }
});

module.exports = router;