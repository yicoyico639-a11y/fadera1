// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract FederaRegistry is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    enum NodeType {
        None,
        Trainer,
        Aggregator,
        DataProvider
    }

    struct NodeReputation {
        uint256 score;                // 信誉分 (0-100)
        uint256 totalRounds;          // 参与总轮次
        uint256 successRounds;        // 成功轮次
        uint256 slashedCount;         // 被罚没次数
        uint256 lastActiveRound;      // 最后活跃轮次
    }

    struct NodeInfo {
        address nodeAddress;
        NodeType nodeType;
        bool isActive;
        uint256 registrationTime;
        NodeReputation reputation;
    }

    mapping(address => NodeInfo) public nodes;
    
    EnumerableSet.AddressSet private allNodes;

    event NodeRegistered(address indexed node, NodeType nodeType);
    event NodeUnregistered(address indexed node);
    event ReputationUpdated(address indexed node, int256 scoreChange);

    modifier onlyRegisteredNode() {
        require(nodes[msg.sender].nodeAddress != address(0), "Node not registered");
        require(nodes[msg.sender].isActive, "Node not active");
        _;
    }

    /**
     * @dev 注册训练节点
     */
    function registerTrainer() external {
        _registerNode(NodeType.Trainer);
    }

    /**
     * @dev 注册聚合节点
     */
    function registerAggregator() external {
        _registerNode(NodeType.Aggregator);
    }

    /**
     * @dev 注册数据提供者
     */
    function registerDataProvider() external {
        _registerNode(NodeType.DataProvider);
    }

    /**
     * @dev 内部注册节点函数
     */
    function _registerNode(NodeType nodeType) internal {
        require(nodes[msg.sender].nodeAddress == address(0), "Node already registered");

        nodes[msg.sender] = NodeInfo({
            nodeAddress: msg.sender,
            nodeType: nodeType,
            isActive: true,
            registrationTime: block.timestamp,
            reputation: NodeReputation({
                score: 100,  // 初始信誉分为100
                totalRounds: 0,
                successRounds: 0,
                slashedCount: 0,
                lastActiveRound: 0
            })
        });

        allNodes.add(msg.sender);

        emit NodeRegistered(msg.sender, nodeType);
    }

    /**
     * @dev 注销节点
     */
    function unregisterNode() external onlyRegisteredNode {
        nodes[msg.sender].isActive = false;
        allNodes.remove(msg.sender);
        emit NodeUnregistered(msg.sender);
    }

    /**
     * @dev 更新信誉分
     */
    function updateReputation(address node, int256 scoreChange) external onlyOwner {
        NodeReputation storage rep = nodes[node].reputation;
        
        if (scoreChange < 0) {
            // 如果是负数变化，确保不会使信誉分变成负数
            uint256 absScoreChange = uint256(-scoreChange);
            rep.score = rep.score > absScoreChange ? rep.score - absScoreChange : 0;
        } else {
            // 如果是正数变化，确保不会超过100
            uint256 newScore = rep.score + uint256(scoreChange);
            rep.score = newScore > 100 ? 100 : newScore;
        }
        
        rep.lastActiveRound = block.number;
        emit ReputationUpdated(node, scoreChange);
    }

    /**
     * @dev 查询节点信息
     */
    function getNodeInfo(address node) external view returns (NodeInfo memory) {
        return nodes[node];
    }

    /**
     * @dev 获取所有注册节点数量
     */
    function getNodeCount() external view returns (uint256) {
        return allNodes.length();
    }

    /**
     * @dev 获取节点信誉分
     */
    function getReputationScore(address node) external view returns (uint256) {
        return nodes[node].reputation.score;
    }

    /**
     * @dev 检查节点是否有资格参与
     */
    function isEligibleToParticipate(address node) external view returns (bool) {
        return nodes[node].isActive && nodes[node].reputation.score >= 10;
    }
    
    /**
     * @dev 获取所有节点地址 (如果需要遍历)
     */
    function getAllNodes() external view returns (address[] memory) {
        return allNodes.values();
    }
}