// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../FederaRegistry/FederaRegistry.sol";

contract FederaTask is ReentrancyGuard {
    using SafeMath for uint256;

    enum TaskStatus {
        Created,       // 已创建，等待参与者
        Active,        // 进行中
        Paused,        // 暂停
        Challenged,    // 争议仲裁中
        Completed,     // 已完成
        Cancelled      // 已取消
    }

    struct Task {
        address creator;              // 任务发起者
        bytes32 initialModelHash;     // 初始模型哈希
        uint256 rewardPool;           // 奖励池总额
        uint256 roundReward;          // 每轮奖励额度
        uint256 currentRound;         // 当前轮次
        uint256 maxRounds;            // 最大轮次
        TaskStatus status;            // 任务状态
        uint256 minTrainerStake;      // 训练节点最低质押
        uint256 minAggregatorStake;   // 聚合节点最低质押
        uint256 performanceTarget;    // 性能目标
        uint256 submissionDeadline;   // 提交截止时间
        uint256 aggregationDeadline;  // 聚合截止时间
    }

    struct TrainerSubmission {
        address trainer;              // 训练节点地址
        bytes32 gradientHash;         // 梯度哈希
        bytes zkProof;                // ZK证明
        bytes32 dataCommitment;       // 数据承诺
        bytes32 modelSnapshotHash;    // 模型快照哈希
        bool verified;                // 是否验证通过
        bool qualityPassed;           // 统计质量检测是否通过
        uint256 submittedAt;          // 提交时间
    }

    struct AggregationResult {
        address aggregator;           // 聚合节点地址
        bytes32 newModelHash;         // 新模型哈希
        bytes32 performanceHash;      // 性能指标哈希
        bytes aggregationProof;       // 聚合正确性证明
        uint256[] contributionScores; // 贡献评分
        uint256 submittedAt;          // 提交时间
        bool challenged;              // 是否被挑战
    }

    struct Challenge {
        address challenger;
        uint256 challengeStake;
        uint256 challengeDeadline;
        address winner;
        bool resolved;
    }

    IERC20 public rewardToken;
    FederaRegistry public registry;

    Task public taskInfo;
    mapping(uint256 => mapping(address => TrainerSubmission)) public trainerSubmissions;  // round => trainer => submission
    mapping(uint256 => AggregationResult) public aggregationResults;  // round => result
    mapping(uint256 => mapping(address => uint256)) public roundRewards;  // round => trainer => reward
    mapping(uint256 => Challenge) public challenges;  // round => challenge
    mapping(uint256 => address[]) public roundParticipants;  // round => trainers

    uint256 public constant SUBMISSION_WINDOW = 2 hours; // 2小时提交窗口
    uint256 public constant AGGREGATION_WINDOW = 1 hours; // 1小时聚合窗口
    uint256 public constant CHALLENGE_WINDOW = 7 days; // 7天挑战窗口

    event TaskCreated(address indexed creator, uint256 taskId);
    event RoundStarted(uint256 indexed round);
    event GradientSubmitted(address indexed trainer, uint256 indexed round);
    event AggregationSubmitted(uint256 indexed round);
    event RoundCompleted(uint256 indexed round);
    event RewardClaimed(address indexed trainer, uint256 amount);
    event AggregationChallenged(uint256 indexed round, address indexed challenger);
    event DisputeResolved(uint256 indexed round, address indexed winner);
    event TaskFinalized();

    modifier onlyTaskCreator() {
        require(msg.sender == taskInfo.creator, "Only task creator");
        _;
    }

    modifier onlyActiveTask() {
        require(taskInfo.status == TaskStatus.Active, "Task not active");
        _;
    }

    modifier onlyTrainer() {
        require(registry.isEligibleToParticipate(msg.sender), "Not eligible trainer");
        _;
    }

    constructor(
        address _rewardToken,
        address _registry,
        bytes32 _initialModelHash,
        uint256 _rewardPool,
        uint256 _minTrainerStake,
        uint256 _minAggregatorStake,
        uint256 _maxRounds,
        uint256 _performanceTarget
    ) {
        rewardToken = IERC20(_rewardToken);
        registry = FederaRegistry(_registry);
        
        taskInfo = Task({
            creator: msg.sender,
            initialModelHash: _initialModelHash,
            rewardPool: _rewardPool,
            roundReward: _rewardPool / _maxRounds,
            currentRound: 0,
            maxRounds: _maxRounds,
            status: TaskStatus.Created,
            minTrainerStake: _minTrainerStake,
            minAggregatorStake: _minAggregatorStake,
            performanceTarget: _performanceTarget,
            submissionDeadline: 0,
            aggregationDeadline: 0
        });
    }

    /**
     * @dev 开始新任务
     */
    function startTask() external onlyTaskCreator {
        require(taskInfo.status == TaskStatus.Created, "Task already started");
        taskInfo.status = TaskStatus.Active;
        taskInfo.currentRound = 1;
        _startNewRound();
        emit TaskCreated(msg.sender, 0); // taskId暂时为0
    }

    /**
     * @dev 开始新轮次
     */
    function _startNewRound() internal {
        taskInfo.submissionDeadline = block.timestamp + SUBMISSION_WINDOW;
        taskInfo.aggregationDeadline = taskInfo.submissionDeadline + AGGREGATION_WINDOW;
        emit RoundStarted(taskInfo.currentRound);
    }

    /**
     * @dev 提交梯度
     */
    function submitGradient(
        bytes32 gradientHash,
        bytes calldata zkProof,
        bytes32 dataCommitment,
        bytes32 modelSnapshotHash
    ) external onlyTrainer onlyActiveTask nonReentrant {
        require(block.timestamp <= taskInfo.submissionDeadline, "Submission window closed");
        require(taskInfo.status != TaskStatus.Challenged, "Task is in dispute");

        // 这里应该调用ZK证明验证器，为了简化先跳过
        // bool proofValid = verifyZkProof(zkProof, modelSnapshotHash, dataCommitment, gradientHash);
        // require(proofValid, "ZK proof verification failed");

        trainerSubmissions[taskInfo.currentRound][msg.sender] = TrainerSubmission({
            trainer: msg.sender,
            gradientHash: gradientHash,
            zkProof: zkProof,
            dataCommitment: dataCommitment,
            modelSnapshotHash: modelSnapshotHash,
            verified: true, // 暂时设为true，实际应验证ZK证明
            qualityPassed: false, // 质量检测由聚合节点完成
            submittedAt: block.timestamp
        });

        roundParticipants[taskInfo.currentRound].push(msg.sender);

        emit GradientSubmitted(msg.sender, taskInfo.currentRound);
    }

    /**
     * @dev 提交聚合结果
     */
    function submitAggregation(
        bytes32 newModelHash,
        bytes32 performanceHash,
        bytes calldata aggregationProof,
        uint256[] calldata contributionScores
    ) external onlyActiveTask nonReentrant {
        // 验证调用者是否为有效的聚合节点
        require(registry.isEligibleToParticipate(msg.sender), "Not eligible aggregator");
        require(block.timestamp > taskInfo.submissionDeadline, "Submission window not closed");
        require(block.timestamp <= taskInfo.aggregationDeadline, "Aggregation window closed");

        // 验证聚合证明
        // bool proofValid = verifyAggregationProof(aggregationProof);
        // require(proofValid, "Aggregation proof verification failed");

        // 验证贡献评分数组长度与参与者数量匹配
        require(contributionScores.length == roundParticipants[taskInfo.currentRound].length, "Contribution scores mismatch");

        aggregationResults[taskInfo.currentRound] = AggregationResult({
            aggregator: msg.sender,
            newModelHash: newModelHash,
            performanceHash: performanceHash,
            aggregationProof: aggregationProof,
            contributionScores: contributionScores,
            submittedAt: block.timestamp,
            challenged: false
        });

        emit AggregationSubmitted(taskInfo.currentRound);
    }

    /**
     * @dev 结束当前轮次
     */
    function endRound() external onlyActiveTask {
        require(
            block.timestamp > taskInfo.aggregationDeadline ||
            (aggregationResults[taskInfo.currentRound].submittedAt > 0 && 
             block.timestamp > aggregationResults[taskInfo.currentRound].submittedAt + 1 minutes),
            "Aggregation deadline not reached"
        );

        // 如果没有聚合结果，则认为超时
        if (aggregationResults[taskInfo.currentRound].submittedAt == 0) {
            // 处理超时情况
            taskInfo.currentRound++;
            if (taskInfo.currentRound <= taskInfo.maxRounds) {
                _startNewRound();
            } else {
                taskInfo.status = TaskStatus.Completed;
                emit TaskFinalized();
            }
            return;
        }

        // 分配奖励
        _distributeRewards();

        // 进入下一轮或结束任务
        taskInfo.currentRound++;
        if (taskInfo.currentRound <= taskInfo.maxRounds) {
            _startNewRound();
        } else {
            taskInfo.status = TaskStatus.Completed;
            emit TaskFinalized();
        }

        emit RoundCompleted(taskInfo.currentRound - 1);
    }

    /**
     * @dev 分配奖励
     */
    function _distributeRewards() internal {
        address[] memory participants = roundParticipants[taskInfo.currentRound];
        uint256[] memory contributions = aggregationResults[taskInfo.currentRound].contributionScores;
        uint256 totalReward = taskInfo.roundReward;

        uint256 totalPositiveContribution = 0;
        uint256 positiveCount = 0;

        // 计算总正贡献值
        for (uint256 i = 0; i < contributions.length; i++) {
            if (contributions[i] > 0) {
                totalPositiveContribution += contributions[i];
                positiveCount++;
            }
        }

        // 分发奖励给正贡献者
        if (totalPositiveContribution > 0) {
            for (uint256 i = 0; i < participants.length; i++) {
                if (contributions[i] > 0) {
                    uint256 reward = (totalReward * contributions[i]) / totalPositiveContribution;
                    roundRewards[taskInfo.currentRound][participants[i]] = reward;
                } else if (contributions[i] < 0) {
                    // 负贡献处理：减少质押并降低信誉
                    // 这里可以调用registry更新信誉分，传入负的贡献分数
                    registry.updateReputation(participants[i], int256(contributions[i])); // 将uint256转为int256
                }
            }
        }
    }

    /**
     * @dev 领取奖励
     */
    function claimReward(uint256 round) external nonReentrant {
        uint256 reward = roundRewards[round][msg.sender];
        require(reward > 0, "No reward to claim");
        require(rewardToken.balanceOf(address(this)) >= reward, "Insufficient reward pool");

        roundRewards[round][msg.sender] = 0;
        require(rewardToken.transfer(msg.sender, reward), "Transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }

    /**
     * @dev 发起挑战
     */
    function challengeAggregation(uint256 round, uint256 challengeStake) external nonReentrant {
        require(aggregationResults[round].submittedAt > 0, "No aggregation to challenge");
        require(!aggregationResults[round].challenged, "Already challenged");
        require(block.timestamp < aggregationResults[round].submittedAt + CHALLENGE_WINDOW, "Challenge period ended");

        // 转移挑战质押
        require(rewardToken.transferFrom(msg.sender, address(this), challengeStake), "Challenge stake transfer failed");

        challenges[round] = Challenge({
            challenger: msg.sender,
            challengeStake: challengeStake,
            challengeDeadline: block.timestamp + 48 hours, // 48小时仲裁期
            winner: address(0),
            resolved: false
        });

        aggregationResults[round].challenged = true;
        taskInfo.status = TaskStatus.Challenged;

        emit AggregationChallenged(round, msg.sender);
    }

    /**
     * @dev 提交仲裁证据
     */
    function submitArbitration(uint256 round, bytes calldata independentAggregationProof) external {
        require(aggregationResults[round].challenged, "Not under challenge");
        require(!challenges[round].resolved, "Challenge already resolved");
        require(block.timestamp < challenges[round].challengeDeadline, "Challenge deadline passed");

        // 实际应用中，这里需要验证独立聚合证明
        // 这是一个简化的占位实现
        // 需要比较两个聚合结果并确定哪个是正确的
    }

    /**
     * @dev 解决争议
     */
    function resolveDispute(uint256 round, address winner) external onlyTaskCreator {
        require(aggregationResults[round].challenged, "Not under challenge");
        require(!challenges[round].resolved, "Challenge already resolved");

        Challenge storage challenge = challenges[round];
        AggregationResult storage aggResult = aggregationResults[round];

        challenge.winner = winner;
        challenge.resolved = true;
        taskInfo.status = TaskStatus.Active;

        // 分配挑战奖励/罚没
        if (winner == aggResult.aggregator) {
            // 聚合节点胜诉：挑战者的质押归聚合节点
            require(rewardToken.transfer(aggResult.aggregator, challenge.challengeStake), "Transfer to aggregator failed");
        } else if (winner == challenge.challenger) {
            // 挑战者胜诉：一半给挑战者，一半归奖池
            uint256 toChallenger = challenge.challengeStake / 2;
            uint256 toPool = challenge.challengeStake - toChallenger;
            
            require(rewardToken.transfer(challenge.challenger, toChallenger), "Transfer to challenger failed");
            // 奖池增加
            taskInfo.rewardPool += toPool;
        }

        emit DisputeResolved(round, winner);
    }

    /**
     * @dev 终止任务
     */
    function finalizeTask() external onlyTaskCreator {
        require(taskInfo.status != TaskStatus.Completed && taskInfo.status != TaskStatus.Cancelled, "Task already finalized");
        taskInfo.status = TaskStatus.Cancelled;
        emit TaskFinalized();
    }

    /**
     * @dev 获取当前轮次信息
     */
    function getCurrentRoundInfo() external view returns (
        uint256 currentRound,
        uint256 submissionDeadline,
        uint256 aggregationDeadline,
        TaskStatus status
    ) {
        return (
            taskInfo.currentRound,
            taskInfo.submissionDeadline,
            taskInfo.aggregationDeadline,
            taskInfo.status
        );
    }

    /**
     * @dev 获取轮次参与者
     */
    function getRoundParticipants(uint256 round) external view returns (address[] memory) {
        return roundParticipants[round];
    }
}