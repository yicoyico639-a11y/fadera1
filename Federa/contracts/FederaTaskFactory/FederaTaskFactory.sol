// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../FederaTask/FederaTask.sol";

contract FederaTaskFactory is Ownable {
    struct TaskInfo {
        address creator;
        address taskContract;
        uint256 createdAt;
        bool isActive;
    }

    TaskInfo[] public tasks;
    mapping(address => bool) public isVerifiedTask;

    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        address taskContract,
        bytes32 initialModelHash,
        uint256 rewardPool
    );

    event TaskCancelled(uint256 indexed taskId);

    modifier onlyVerifiedTask() {
        require(isVerifiedTask[msg.sender], "Only verified task contracts");
        _;
    }

    constructor() {
        _transferOwnership(msg.sender);
    }

    function createTask(
        address rewardToken,
        address registry,
        bytes32 initialModelHash,
        uint256 rewardPool,
        uint256 roundReward,
        uint256 maxRounds,
        uint256 minTrainerStake,
        uint256 minAggregatorStake
    ) external returns (uint256 taskId) {
        require(rewardPool > 0, "Reward pool must be greater than 0");

        // 创建新的任务合约
        FederaTask newTask = new FederaTask(
            rewardToken,
            registry,
            initialModelHash,
            rewardPool,
            minTrainerStake,
            minAggregatorStake,
            maxRounds,
            0 // performanceTarget placeholder
        );

        taskId = tasks.length;
        tasks.push(TaskInfo({
            creator: msg.sender,
            taskContract: address(newTask),
            createdAt: block.timestamp,
            isActive: true
        }));

        isVerifiedTask[address(newTask)] = true;

        emit TaskCreated(
            taskId,
            msg.sender,
            address(newTask),
            initialModelHash,
            rewardPool
        );
    }

    function getTaskCount() external view returns (uint256) {
        return tasks.length;
    }

    function getTask(uint256 taskId) external view returns (TaskInfo memory) {
        require(taskId < tasks.length, "Task does not exist");
        return tasks[taskId];
    }

    function getAllTasks() external view returns (TaskInfo[] memory) {
        return tasks;
    }
}