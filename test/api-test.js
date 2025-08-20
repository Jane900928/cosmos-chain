/**
 * Cosmos 区块链应用 API 测试脚本
 * 用于验证所有主要功能的正常工作
 */

const axios = require('axios');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const DELAY_BETWEEN_TESTS = 2000; // 测试间隔时间（毫秒）

// 颜色输出
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

// 打印函数
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    test: (msg) => console.log(`${colors.cyan}[TEST]${colors.reset} ${msg}`),
    step: (msg) => console.log(`${colors.magenta}[STEP]${colors.reset} ${msg}`)
};

// 测试数据存储
const testData = {
    users: [],
    miners: [],
    transactions: []
};

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API 调用封装
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        throw new Error(`API call failed: ${error.response?.data?.error || error.message}`);
    }
}

// 测试函数
class BlockchainTester {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runTest(testName, testFunction) {
        this.testResults.total++;
        log.test(`Running: ${testName}`);
        
        try {
            await testFunction();
            this.testResults.passed++;
            log.success(`✅ ${testName} - PASSED`);
        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push({ testName, error: error.message });
            log.error(`❌ ${testName} - FAILED: ${error.message}`);
        }
        
        await delay(DELAY_BETWEEN_TESTS);
    }

    // 1. 测试网络连接
    async testNetworkConnection() {
        const status = await apiCall('/blockchain/status');
        if (!status.success) {
            throw new Error('Network status check failed');
        }
        log.info(`Connected to chain: ${status.status.nodeInfo.network}`);
        log.info(`Latest block: ${status.status.syncInfo.latestBlockHeight}`);
    }

    // 2. 测试用户创建
    async testCreateUser() {
        const userData = {
            name: `TestUser_${Date.now()}`
        };
        
        const result = await apiCall('/users/create', 'POST', userData);
        if (!result.success) {
            throw new Error('User creation failed');
        }
        
        testData.users.push(result.user);
        log.info(`Created user: ${result.user.name} (${result.user.address})`);
    }

    // 3. 测试获取用户列表
    async testGetUsers() {
        const result = await apiCall('/users');
        if (!result.success || !Array.isArray(result.users)) {
            throw new Error('Failed to get users list');
        }
        
        log.info(`Found ${result.users.length} users`);
    }

    // 4. 测试用户余额查询
    async testGetUserBalance() {
        if (testData.users.length === 0) {
            throw new Error('No users available for balance test');
        }
        
        const user = testData.users[0];
        const result = await apiCall(`/users/${user.id}/balance`);
        if (!result.success) {
            throw new Error('Failed to get user balance');
        }
        
        log.info(`User ${user.name} balance: ${JSON.stringify(result.balances)}`);
    }

    // 5. 测试代币铸造
    async testMintTokens() {
        if (testData.users.length === 0) {
            throw new Error('No users available for minting test');
        }
        
        const user = testData.users[0];
        const mintData = {
            minterUserId: user.id,
            recipientAddress: user.address,
            amount: 1000
        };
        
        const result = await apiCall('/tokens/mint', 'POST', mintData);
        if (!result.success) {
            throw new Error('Token minting failed');
        }
        
        testData.transactions.push(result.transaction);
        log.info(`Minted 1000 tokens to ${user.address}`);
        log.info(`Transaction hash: ${result.transaction.hash}`);
    }

    // 6. 测试代币转账
    async testTransferTokens() {
        if (testData.users.length < 2) {
            // 创建第二个用户用于转账测试
            await this.testCreateUser();
        }
        
        const sender = testData.users[0];
        const recipient = testData.users[1];
        
        const transferData = {
            fromUserId: sender.id,
            toAddress: recipient.address,
            amount: 100,
            memo: 'Test transfer'
        };
        
        const result = await apiCall('/tokens/transfer', 'POST', transferData);
        if (!result.success) {
            throw new Error('Token transfer failed');
        }
        
        testData.transactions.push(result.transaction);
        log.info(`Transferred 100 tokens from ${sender.address} to ${recipient.address}`);
        log.info(`Transaction hash: ${result.transaction.hash}`);
    }

    // 7. 测试矿工注册
    async testRegisterMiner() {
        if (testData.users.length === 0) {
            throw new Error('No users available for miner registration');
        }
        
        const user = testData.users[0];
        const minerData = {
            userId: user.id,
            minerName: `TestMiner_${Date.now()}`,
            hashRate: 5000000
        };
        
        const result = await apiCall('/miner/register', 'POST', minerData);
        if (!result.success) {
            throw new Error('Miner registration failed');
        }
        
        testData.miners.push(result.miner);
        log.info(`Registered miner: ${result.miner.name} (${result.miner.id})`);
        log.info(`Hash rate: ${(result.miner.hashRate / 1000000).toFixed(2)} MH/s`);
    }

    // 8. 测试挖矿
    async testMining() {
        if (testData.miners.length === 0) {
            throw new Error('No miners available for mining test');
        }
        
        const miner = testData.miners[0];
        const miningData = { reward: 10 };
        
        const result = await apiCall(`/miner/${miner.id}/mine`, 'POST', miningData);
        // 挖矿可能失败是正常的（基于概率）
        if (result.success) {
            log.info(`Mining successful! Block height: ${result.miningResult.blockHeight}`);
            log.info(`Reward: ${result.miningResult.reward} tokens`);
        } else {
            log.warn(`Mining attempt failed (this is normal based on probability)`);
        }
    }

    // 9. 测试获取矿工列表
    async testGetMiners() {
        const result = await apiCall('/miner');
        if (!result.success || !Array.isArray(result.miners)) {
            throw new Error('Failed to get miners list');
        }
        
        log.info(`Found ${result.miners.length} miners`);
        log.info(`Active miners: ${result.networkStats.activeMiners}`);
    }

    // 10. 测试挖矿统计
    async testMiningStats() {
        const result = await apiCall('/miner/stats/overview');
        if (!result.success) {
            throw new Error('Failed to get mining stats');
        }
        
        const stats = result.stats;
        log.info(`Total miners: ${stats.mining.totalMiners}`);
        log.info(`Total hash rate: ${(stats.mining.totalHashRate / 1000000).toFixed(2)} MH/s`);
        log.info(`Total blocks mined: ${stats.mining.totalBlocksMined}`);
    }

    // 11. 测试区块信息
    async testGetBlocks() {
        const result = await apiCall('/blockchain/blocks?limit=5');
        if (!result.success || !Array.isArray(result.blocks)) {
            throw new Error('Failed to get blocks');
        }
        
        log.info(`Retrieved ${result.blocks.length} blocks`);
        if (result.blocks.length > 0) {
            const latestBlock = result.blocks[0];
            log.info(`Latest block height: ${latestBlock.height}`);
            log.info(`Latest block hash: ${latestBlock.hash.substring(0, 16)}...`);
        }
    }

    // 12. 测试代币信息
    async testTokenInfo() {
        const result = await apiCall('/tokens/info');
        if (!result.success) {
            throw new Error('Failed to get token info');
        }
        
        const tokenInfo = result.tokenInfo;
        log.info(`Token: ${tokenInfo.denom}`);
        log.info(`Total supply: ${tokenInfo.totalSupply.toLocaleString()}`);
        log.info(`Holders: ${tokenInfo.holders}`);
    }

    // 13. 测试搜索功能
    async testSearch() {
        // 搜索最新区块
        const statusResult = await apiCall('/blockchain/status');
        const latestHeight = statusResult.status.syncInfo.latestBlockHeight;
        
        const searchResult = await apiCall(`/blockchain/search/${latestHeight}`);
        if (!searchResult.success) {
            throw new Error('Search function failed');
        }
        
        log.info(`Search result type: ${searchResult.result.type}`);
        if (searchResult.result.type === 'block') {
            log.info(`Found block at height: ${searchResult.result.data.height}`);
        }
    }

    // 14. 测试交易查询
    async testGetTransactions() {
        const result = await apiCall('/tokens/transactions?limit=5');
        if (!result.success) {
            throw new Error('Failed to get transactions');
        }
        
        log.info(`Found ${result.transactions.length} transactions`);
    }

    // 运行所有测试
    async runAllTests() {
        log.step('🚀 Starting Cosmos Blockchain App API Tests');
        log.step('================================================');
        
        const tests = [
            ['Network Connection', () => this.testNetworkConnection()],
            ['Create User #1', () => this.testCreateUser()],
            ['Create User #2', () => this.testCreateUser()],
            ['Get Users List', () => this.testGetUsers()],
            ['Get User Balance', () => this.testGetUserBalance()],
            ['Mint Tokens', () => this.testMintTokens()],
            ['Transfer Tokens', () => this.testTransferTokens()],
            ['Register Miner', () => this.testRegisterMiner()],
            ['Mining Attempt', () => this.testMining()],
            ['Get Miners List', () => this.testGetMiners()],
            ['Mining Statistics', () => this.testMiningStats()],
            ['Get Blocks', () => this.testGetBlocks()],
            ['Token Information', () => this.testTokenInfo()],
            ['Search Function', () => this.testSearch()],
            ['Get Transactions', () => this.testGetTransactions()]
        ];
        
        for (const [testName, testFunction] of tests) {
            await this.runTest(testName, testFunction);
        }
        
        // 显示测试结果
        this.showTestResults();
    }

    showTestResults() {
        log.step('================================================');
        log.step('📊 Test Results Summary');
        log.step('================================================');
        
        log.info(`Total tests: ${this.testResults.total}`);
        log.success(`Passed: ${this.testResults.passed}`);
        log.error(`Failed: ${this.testResults.failed}`);
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        log.info(`Success rate: ${successRate}%`);
        
        if (this.testResults.failed > 0) {
            log.step('\n❌ Failed Tests:');
            this.testResults.errors.forEach(({ testName, error }) => {
                log.error(`  ${testName}: ${error}`);
            });
        }
        
        if (this.testResults.passed === this.testResults.total) {
            log.success('\n🎉 All tests passed! The blockchain application is working correctly.');
        } else if (this.testResults.failed < 3) {
            log.warn('\n⚠️  Some tests failed, but the core functionality is working.');
        } else {
            log.error('\n💥 Multiple tests failed. Please check the application setup.');
        }
        
        log.step('\n📋 Test Data Summary:');
        log.info(`Created users: ${testData.users.length}`);
        log.info(`Registered miners: ${testData.miners.length}`);
        log.info(`Executed transactions: ${testData.transactions.length}`);
        
        if (testData.users.length > 0) {
            log.step('\n👥 Created Users:');
            testData.users.forEach(user => {
                log.info(`  ${user.name}: ${user.address}`);
            });
        }
        
        if (testData.miners.length > 0) {
            log.step('\n⛏️  Registered Miners:');
            testData.miners.forEach(miner => {
                log.info(`  ${miner.name}: ${(miner.hashRate / 1000000).toFixed(2)} MH/s`);
            });
        }
    }
}

// 主函数
async function main() {
    const tester = new BlockchainTester();
    
    try {
        await tester.runAllTests();
    } catch (error) {
        log.error(`Test execution failed: ${error.message}`);
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    main().catch(error => {
        log.error(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = BlockchainTester;