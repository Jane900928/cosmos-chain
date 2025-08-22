const express = require('express');
const router = express.Router();

// 模拟数据生成器
function generateMockStatus() {
    return {
        success: true,
        status: {
            nodeInfo: {
                network: process.env.CHAIN_ID || 'test-chain',
                version: '0.47.0',
                moniker: 'mock-node',
                id: 'mock-node-id'
            },
            syncInfo: {
                latestBlockHash: 'mock-block-hash',
                latestBlockHeight: Math.floor(Date.now() / 6000).toString(), // 每6秒一个新区块
                latestBlockTime: new Date().toISOString(),
                catchingUp: false
            },
            validatorInfo: {
                address: 'mock-validator-address',
                votingPower: '1000000'
            },
            latestBlock: {
                height: Math.floor(Date.now() / 6000).toString(),
                time: new Date().toISOString(),
                hash: 'mock-block-hash',
                transactionCount: Math.floor(Math.random() * 10)
            }
        },
        mode: 'mock'
    };
}

function generateMockBlock(height = null) {
    const blockHeight = height || Math.floor(Date.now() / 6000);
    return {
        success: true,
        block: {
            height: blockHeight.toString(),
            hash: `mock-block-hash-${blockHeight}`,
            time: new Date(Date.now() - (height ? (Date.now() / 6000 - height) * 6000 : 0)).toISOString(),
            proposerAddress: 'mock-proposer-address',
            transactionCount: Math.floor(Math.random() * 10),
            transactions: [],
            previousBlockHash: `mock-block-hash-${blockHeight - 1}`,
            evidence: {},
            lastCommit: {}
        },
        mode: 'mock'
    };
}

// 获取区块链状态
router.get('/status', async (req, res) => {
    try {
        const cosmosClient = req.cosmosClient;
        const isConnected = req.isClientConnected;

        console.log(`[STATUS] Client connected: ${isConnected}`);

        if (!cosmosClient || !isConnected) {
            console.log('[STATUS] Using mock data - client not connected');
            return res.json(generateMockStatus());
        }

        // 尝试获取真实状态
        try {
            const status = await cosmosClient.getStatus();
            const latestBlock = await cosmosClient.getBlock();

            // 安全地访问区块数据
            const transactionCount = latestBlock?.block?.data?.txs?.length || 0;
            const blockTime = latestBlock?.block?.header?.time || new Date().toISOString();
            const blockHeight = latestBlock?.block?.header?.height || '0';
            const blockHash = latestBlock?.blockId?.hash || '';

            console.log(`[STATUS] Real data - Block height: ${blockHeight}`);

            res.json({
                success: true,
                status: {
                    nodeInfo: {
                        network: status.nodeInfo?.network || 'unknown',
                        version: status.nodeInfo?.version || 'unknown',
                        moniker: status.nodeInfo?.moniker || 'unknown',
                        id: status.nodeInfo?.id || 'unknown'
                    },
                    syncInfo: {
                        latestBlockHash: status.syncInfo?.latestBlockHash || '',
                        latestBlockHeight: status.syncInfo?.latestBlockHeight || '0',
                        latestBlockTime: status.syncInfo?.latestBlockTime || new Date().toISOString(),
                        catchingUp: status.syncInfo?.catchingUp || false
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
                },
                mode: 'real'
            });

        } catch (realDataError) {
            console.log('[STATUS] Real data failed, using mock:', realDataError.message);
            res.json(generateMockStatus());
        }

    } catch (error) {
        console.error('[STATUS] Error:', error);
        res.json(generateMockStatus());
    }
});

// 获取最新区块
router.get('/blocks/latest', async (req, res) => {
    try {
        const cosmosClient = req.cosmosClient;
        const isConnected = req.isClientConnected;

        if (!cosmosClient || !isConnected) {
            return res.json(generateMockBlock());
        }

        try {
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
                },
                mode: 'real'
            });

        } catch (realDataError) {
            console.log('[LATEST BLOCK] Real data failed, using mock:', realDataError.message);
            res.json(generateMockBlock());
        }

    } catch (error) {
        console.error('[LATEST BLOCK] Error:', error);
        res.json(generateMockBlock());
    }
});

// 根据高度获取区块
router.get('/blocks/:height', async (req, res) => {
    try {
        const { height } = req.params;
        const cosmosClient = req.cosmosClient;
        const isConnected = req.isClientConnected;

        const blockHeight = parseInt(height);
        if (isNaN(blockHeight) || blockHeight < 0) {
            return res.status(400).json({ error: 'Invalid block height' });
        }

        if (!cosmosClient || !isConnected) {
            return res.json(generateMockBlock(blockHeight));
        }

        try {
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
                },
                mode: 'real'
            });

        } catch (realDataError) {
            console.log(`[BLOCK ${height}] Real data failed, using mock:`, realDataError.message);
            res.json(generateMockBlock(blockHeight));
        }

    } catch (error) {
        console.error(`[BLOCK ${height}] Error:`, error);
        res.json(generateMockBlock(parseInt(height)));
    }
});

// 获取区块列表
router.get('/blocks', async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const cosmosClient = req.cosmosClient;
        const isConnected = req.isClientConnected;

        const limitNum = Math.min(parseInt(limit), 50);
        const offsetNum = parseInt(offset);

        if (!cosmosClient || !isConnected) {
            // 生成模拟区块列表
            const currentHeight = Math.floor(Date.now() / 6000);
            const startHeight = Math.max(1, currentHeight - offsetNum);
            const endHeight = Math.max(1, startHeight - limitNum + 1);
            
            const blocks = [];
            for (let height = startHeight; height >= endHeight && height > 0; height--) {
                blocks.push({
                    height: height.toString(),
                    hash: `mock-block-hash-${height}`,
                    time: new Date(Date.now() - (currentHeight - height) * 6000).toISOString(),
                    proposerAddress: 'mock-proposer',
                    transactionCount: Math.floor(Math.random() * 10)
                });
            }

            return res.json({
                success: true,
                blocks: blocks,
                pagination: {
                    total: currentHeight,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: endHeight > 1
                },
                mode: 'mock'
            });
        }

        try {
            // 获取最新区块高度
            const latestBlock = await cosmosClient.getBlock();
            const latestHeight = parseInt(latestBlock?.block?.header?.height || '1');
            
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
                } catch (blockError) {
                    console.error(`Failed to get block ${height}:`, blockError);
                    // 添加占位符
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
                },
                mode: 'real'
            });

        } catch (realDataError) {
            console.log('[BLOCKS] Real data failed, using mock:', realDataError.message);
            // 返回模拟数据
            const currentHeight = Math.floor(Date.now() / 6000);
            const blocks = [];
            for (let i = 0; i < limitNum; i++) {
                const height = currentHeight - offsetNum - i;
                if (height > 0) {
                    blocks.push({
                        height: height.toString(),
                        hash: `mock-block-hash-${height}`,
                        time: new Date(Date.now() - i * 6000).toISOString(),
                        proposerAddress: 'mock-proposer',
                        transactionCount: Math.floor(Math.random() * 10)
                    });
                }
            }

            res.json({
                success: true,
                blocks: blocks,
                pagination: {
                    total: currentHeight,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: true
                },
                mode: 'mock'
            });
        }

    } catch (error) {
        console.error('[BLOCKS] Error:', error);
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
        const isConnected = req.isClientConnected;

        if (!cosmosClient || !isConnected) {
            return res.json({
                success: true,
                validators: [{
                    address: 'mock-validator-address',
                    publicKey: 'mock-public-key',
                    votingPower: '1000000',
                    proposerPriority: '0'
                }],
                totalCount: 1,
                blockHeight: '0',
                mode: 'mock'
            });
        }

        try {
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
                blockHeight: validators.blockHeight || '0',
                mode: 'real'
            });

        } catch (realDataError) {
            console.log('[VALIDATORS] Real data failed, using mock:', realDataError.message);
            res.json({
                success: true,
                validators: [{
                    address: 'mock-validator-address',
                    publicKey: 'mock-public-key',
                    votingPower: '1000000',
                    proposerPriority: '0'
                }],
                totalCount: 1,
                blockHeight: '0',
                mode: 'mock'
            });
        }

    } catch (error) {
        console.error('[VALIDATORS] Error:', error);
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
        const isConnected = req.isClientConnected;

        if (!cosmosClient || !isConnected) {
            return res.json({
                success: true,
                network: {
                    chainId: process.env.CHAIN_ID || 'test-chain',
                    latestHeight: Math.floor(Date.now() / 6000).toString(),
                    latestBlockTime: new Date().toISOString(),
                    validatorCount: 1,
                    totalVotingPower: 1000000,
                    averageBlockTime: '~6s',
                    nodeVersion: 'mock-version',
                    isCatchingUp: false,
                    moniker: 'mock-node'
                },
                mode: 'mock'
            });
        }

        try {
            const status = await cosmosClient.getStatus();
            const validators = await cosmosClient.getValidators();

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
                    averageBlockTime: '~6s',
                    nodeVersion: status.nodeInfo?.version || 'unknown',
                    isCatchingUp: status.syncInfo?.catchingUp || false,
                    moniker: status.nodeInfo?.moniker || 'unknown'
                },
                mode: 'real'
            });

        } catch (realDataError) {
            console.log('[NETWORK] Real data failed, using mock:', realDataError.message);
            res.json({
                success: true,
                network: {
                    chainId: process.env.CHAIN_ID || 'test-chain',
                    latestHeight: Math.floor(Date.now() / 6000).toString(),
                    latestBlockTime: new Date().toISOString(),
                    validatorCount: 1,
                    totalVotingPower: 1000000,
                    averageBlockTime: '~6s',
                    nodeVersion: 'mock-version',
                    isCatchingUp: false,
                    moniker: 'mock-node'
                },
                mode: 'mock'
            });
        }

    } catch (error) {
        console.error('[NETWORK] Error:', error);
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
        const isConnected = req.isClientConnected;

        if (!cosmosClient || !isConnected) {
            // 模拟搜索结果
            const height = parseInt(query);
            if (!isNaN(height) && height > 0) {
                return res.json({
                    success: true,
                    query: query,
                    result: {
                        type: 'block',
                        data: {
                            height: height.toString(),
                            hash: `mock-block-hash-${height}`,
                            time: new Date().toISOString(),
                            transactionCount: Math.floor(Math.random() * 10)
                        }
                    },
                    mode: 'mock'
                });
            } else {
                return res.status(404).json({ 
                    error: 'No results found (mock mode)',
                    query: query,
                    mode: 'mock'
                });
            }
        }

        try {
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
                    console.log('Address search failed:', error.message);
                }
            }

            if (!results.data) {
                return res.status(404).json({ 
                    error: 'No results found',
                    query: query,
                    mode: 'real'
                });
            }

            res.json({
                success: true,
                query: query,
                result: results,
                mode: 'real'
            });

        } catch (realDataError) {
            console.log('[SEARCH] Real data failed:', realDataError.message);
            res.status(404).json({ 
                error: 'Search failed',
                query: query,
                details: realDataError.message
            });
        }

    } catch (error) {
        console.error('[SEARCH] Error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.message 
        });
    }
});

module.exports = router;