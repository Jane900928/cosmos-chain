const { StargateClient, SigningStargateClient } = require('@cosmjs/stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { Tendermint34Client } = require('@cosmjs/tendermint-rpc');
const { stringToPath } = require('@cosmjs/crypto');

class CosmosClient {
    constructor() {
        this.rpcEndpoint = process.env.RPC_ENDPOINT || 'http://localhost:26657';
        this.chainId = process.env.CHAIN_ID || 'test-chain';
        this.addressPrefix = process.env.ADDRESS_PREFIX || 'cosmos';
        this.client = null;
        this.tmClient = null;
    }

    async initializeClient() {
        try {
            // 初始化 Stargate 客户端
            this.client = await StargateClient.connect(this.rpcEndpoint);
            
            // 初始化 Tendermint 客户端
            this.tmClient = await Tendermint34Client.connect(this.rpcEndpoint);
            
            console.log('Connected to blockchain:', this.chainId);
            console.log('RPC Endpoint:', this.rpcEndpoint);
            
            return this;
        } catch (error) {
            console.error('Failed to connect to blockchain:', error);
            throw error;
        }
    }

    // 创建新用户（生成钱包）
    async createUser(mnemonic = null) {
        try {
            const wallet = mnemonic 
                ? await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: this.addressPrefix })
                : await DirectSecp256k1HdWallet.generate(24, { prefix: this.addressPrefix });
            
            const [account] = await wallet.getAccounts();
            
            return {
                address: account.address,
                mnemonic: wallet.mnemonic,
                publicKey: Buffer.from(account.pubkey).toString('hex')
            };
        } catch (error) {
            console.error('Failed to create user:', error);
            throw error;
        }
    }

    // 获取账户余额
    async getBalance(address, denom = 'stake') {
        try {
            const balance = await this.client.getBalance(address, denom);
            return balance;
        } catch (error) {
            console.error('Failed to get balance:', error);
            throw error;
        }
    }

    // 获取所有余额
    async getAllBalances(address) {
        try {
            const balances = await this.client.getAllBalances(address);
            return balances;
        } catch (error) {
            console.error('Failed to get all balances:', error);
            throw error;
        }
    }

    // 发送代币
    async sendTokens(senderMnemonic, recipientAddress, amount, denom = 'stake', memo = '') {
        try {
            const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
                senderMnemonic, 
                { prefix: this.addressPrefix }
            );
            
            const signingClient = await SigningStargateClient.connectWithSigner(
                this.rpcEndpoint,
                wallet
            );

            const [senderAccount] = await wallet.getAccounts();
            
            const result = await signingClient.sendTokens(
                senderAccount.address,
                recipientAddress,
                [{ denom, amount }],
                'auto',
                memo
            );

            return result;
        } catch (error) {
            console.error('Failed to send tokens:', error);
            throw error;
        }
    }

    // 获取区块信息
    async getBlock(height = null) {
        try {
            if (height) {
                return await this.tmClient.block(height);
            } else {
                // 获取最新区块
                return await this.tmClient.block();
            }
        } catch (error) {
            console.error('Failed to get block:', error);
            throw error;
        }
    }

    // 获取区块链状态
    async getStatus() {
        try {
            return await this.tmClient.status();
        } catch (error) {
            console.error('Failed to get status:', error);
            throw error;
        }
    }

    // 获取交易信息
    async getTransaction(txHash) {
        try {
            return await this.client.getTx(txHash);
        } catch (error) {
            console.error('Failed to get transaction:', error);
            throw error;
        }
    }

    // 搜索交易
    async searchTransactions(query) {
        try {
            return await this.client.searchTx(query);
        } catch (error) {
            console.error('Failed to search transactions:', error);
            throw error;
        }
    }

    // 获取验证者信息
    async getValidators(height = null) {
        try {
            if (height) {
                return await this.tmClient.validators({ height });
            } else {
                return await this.tmClient.validatorsAll();
            }
        } catch (error) {
            console.error('Failed to get validators:', error);
            throw error;
        }
    }

    // 模拟代币生产（这里可以根据具体的区块链实现调整）
    async mintTokens(minterMnemonic, recipientAddress, amount, denom = 'stake') {
        try {
            // 这里使用转账来模拟代币生产
            // 在实际应用中，需要根据具体的模块实现
            return await this.sendTokens(minterMnemonic, recipientAddress, amount, denom, 'Token mint');
        } catch (error) {
            console.error('Failed to mint tokens:', error);
            throw error;
        }
    }

    // 断开连接
    async disconnect() {
        if (this.client) {
            this.client.disconnect();
        }
        if (this.tmClient) {
            this.tmClient.disconnect();
        }
    }
}

// 导出单例实例
const cosmosClient = new CosmosClient();

module.exports = {
    initializeClient: () => cosmosClient.initializeClient(),
    getClient: () => cosmosClient
};