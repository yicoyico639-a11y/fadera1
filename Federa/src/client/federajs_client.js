/**
 * Federa JavaScript客户端
 * 用于与智能合约交互
 */

const { ethers } = require('ethers');

class FederaClient {
    /**
     * 初始化Federa客户端
     * @param {string} providerUrl - 区块链节点URL
     * @param {string} privateKey - 用户私钥
     */
    constructor(providerUrl, privateKey) {
        this.provider = new ethers.JsonRpcProvider(providerUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        
        // 合约地址将在部署后填入
        this.contracts = {};
        console.log(`Federa client initialized for address: ${this.wallet.address}`);
    }

    /**
     * 连接到已部署的合约
     * @param {Object} contractAddresses - 合约地址对象
     * @param {Object} abis - 合约ABI对象
     */
    async connectContracts(contractAddresses, abis) {
        // 连接到FederaRegistry
        if (contractAddresses.registry) {
            this.contracts.registry = new ethers.Contract(
                contractAddresses.registry,
                abis.FederaRegistry || [],
                this.wallet
            );
        }

        // 连接到FederaTaskFactory
        if (contractAddresses.taskFactory) {
            this.contracts.taskFactory = new ethers.Contract(
                contractAddresses.taskFactory,
                abis.FederaTaskFactory || [],
                this.wallet
            );
        }

        // 连接到FederaDataRegistry
        if (contractAddresses.dataRegistry) {
            this.contracts.dataRegistry = new ethers.Contract(
                contractAddresses.dataRegistry,
                abis.FederaDataRegistry || [],
                this.wallet
            );
        }

        // 连接到FederaModelNFT
        if (contractAddresses.modelNFT) {
            this.contracts.modelNFT = new ethers.Contract(
                contractAddresses.modelNFT,
                abis.FederaModelNFT || [],
                this.wallet
            );
        }

        console.log('Connected to Federa contracts');
    }

    /**
     * 注册为训练节点
     */
    async registerAsTrainer() {
        if (!this.contracts.registry) {
            throw new Error('Registry contract not connected');
        }

        const tx = await this.contracts.registry.registerTrainer();
        const receipt = await tx.wait();
        console.log(`Registered as trainer: ${receipt.hash}`);
        return receipt;
    }

    /**
     * 注册为聚合节点
     */
    async registerAsAggregator() {
        if (!this.contracts.registry) {
            throw new Error('Registry contract not connected');
        }

        const tx = await this.contracts.registry.registerAggregator();
        const receipt = await tx.wait();
        console.log(`Registered as aggregator: ${receipt.hash}`);
        return receipt;
    }

    /**
     * 注册数据集
     * @param {string} datasetHash - 数据集哈希
     * @param {string} datasetName - 数据集名称
     * @param {string} datasetDescription - 数据集描述
     * @param {string} accessPolicy - 访问策略
     */
    async registerDataset(datasetHash, datasetName, datasetDescription, accessPolicy) {
        if (!this.contracts.dataRegistry) {
            throw new Error('DataRegistry contract not connected');
        }

        const tx = await this.contracts.dataRegistry.registerDataset(
            datasetHash,
            datasetName,
            datasetDescription,
            accessPolicy
        );
        const receipt = await tx.wait();
        console.log(`Dataset registered: ${receipt.hash}`);
        return receipt;
    }

    /**
     * 创建新任务
     * @param {string} initialModelHash - 初始模型哈希
     * @param {number} rewardPool - 奖励池金额
     * @param {number} roundReward - 每轮奖励
     * @param {number} maxRounds - 最大轮次
     * @param {number} minTrainerStake - 训练节点最低质押
     * @param {number} minAggregatorStake - 聚合节点最低质押
     * @param {number} value - 发送的ETH/代币数量
     */
    async createTask(initialModelHash, rewardPool, roundReward, maxRounds, 
                     minTrainerStake, minAggregatorStake, value) {
        if (!this.contracts.taskFactory) {
            throw new Error('TaskFactory contract not connected');
        }

        const tx = await this.contracts.taskFactory.createTask(
            initialModelHash,
            rewardPool,
            roundReward,
            maxRounds,
            minTrainerStake,
            minAggregatorStake,
            { value: ethers.parseEther(value.toString()) }
        );
        const receipt = await tx.wait();
        console.log(`Task created: ${receipt.hash}`);
        return receipt;
    }

    /**
     * 提交梯度
     * @param {Object} taskContract - 任务合约实例
     * @param {string} gradientHash - 梯度哈希
     * @param {string} zkProof - ZK证明
     * @param {string} dataCommitment - 数据承诺
     * @param {string} modelSnapshotHash - 模型快照哈希
     */
    async submitGradient(taskContract, gradientHash, zkProof, dataCommitment, modelSnapshotHash) {
        const tx = await taskContract.submitGradient(
            gradientHash,
            zkProof,
            dataCommitment,
            modelSnapshotHash
        );
        const receipt = await tx.wait();
        console.log(`Gradient submitted: ${receipt.hash}`);
        return receipt;
    }

    /**
     * 提交聚合结果
     * @param {Object} taskContract - 任务合约实例
     * @param {string} newModelHash - 新模型哈希
     * @param {string} performanceHash - 性能指标哈希
     * @param {string} aggregationProof - 聚合证明
     * @param {Array<number>} contributionScores - 贡献评分数组
     */
    async submitAggregation(taskContract, newModelHash, performanceHash, 
                           aggregationProof, contributionScores) {
        const tx = await taskContract.submitAggregation(
            newModelHash,
            performanceHash,
            aggregationProof,
            contributionScores
        );
        const receipt = await tx.wait();
        console.log(`Aggregation submitted: ${receipt.hash}`);
        return receipt;
    }

    /**
     * 发起挑战
     * @param {Object} taskContract - 任务合约实例
     * @param {number} round - 轮次
     * @param {number} challengeStake - 挑战质押
     */
    async challengeAggregation(taskContract, round, challengeStake) {
        const tx = await taskContract.challengeAggregation(
            round,
            ethers.parseEther(challengeStake.toString())
        );
        const receipt = await tx.wait();
        console.log(`Aggregation challenged: ${receipt.hash}`);
        return receipt;
    }

    /**
     * 领取奖励
     * @param {Object} taskContract - 任务合约实例
     * @param {number} round - 轮次
     */
    async claimReward(taskContract, round) {
        const tx = await taskContract.claimReward(round);
        const receipt = await tx.wait();
        console.log(`Reward claimed: ${receipt.hash}`);
        return receipt;
    }

    /**
     * 获取节点信息
     * @param {string} nodeAddress - 节点地址
     */
    async getNodeInfo(nodeAddress) {
        if (!this.contracts.registry) {
            throw new Error('Registry contract not connected');
        }

        const nodeInfo = await this.contracts.registry.getNodeInfo(nodeAddress);
        return {
            nodeAddress: nodeInfo.nodeAddress,
            nodeType: nodeInfo.nodeType,
            isActive: nodeInfo.isActive,
            registrationTime: nodeInfo.registrationTime,
            reputation: {
                score: Number(nodeInfo.reputation.score),
                totalRounds: Number(nodeInfo.reputation.totalRounds),
                successRounds: Number(nodeInfo.reputation.successRounds),
                slashedCount: Number(nodeInfo.reputation.slashedCount),
                lastActiveRound: Number(nodeInfo.reputation.lastActiveRound)
            }
        };
    }

    /**
     * 检查节点是否有资格参与
     * @param {string} nodeAddress - 节点地址
     */
    async isEligibleToParticipate(nodeAddress) {
        if (!this.contracts.registry) {
            throw new Error('Registry contract not connected');
        }

        return await this.contracts.registry.isEligibleToParticipate(nodeAddress);
    }

    /**
     * 获取当前任务信息
     * @param {Object} taskContract - 任务合约实例
     */
    async getCurrentRoundInfo(taskContract) {
        const info = await taskContract.getCurrentRoundInfo();
        return {
            currentRound: Number(info.currentRound),
            submissionDeadline: Number(info.submissionDeadline),
            aggregationDeadline: Number(info.aggregationDeadline),
            status: info.status
        };
    }
}

// 导出模块
module.exports = FederaClient;

// 示例使用
if (typeof window === 'undefined') {  // 只在Node.js环境中运行示例
    console.log('Federa JavaScript Client loaded.');
    console.log('To use: const client = new FederaClient(providerUrl, privateKey);');
}