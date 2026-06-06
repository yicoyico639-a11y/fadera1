// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FederaDataRegistry is Ownable, ReentrancyGuard {
    struct Dataset {
        bytes32 datasetHash;
        address owner;
        string datasetName;
        string datasetDescription;
        string accessPolicy; // 访问策略，如 "TEE_ONLY", "ENCRYPTED_ACCESS", etc.
        uint256 uploadTime;
        uint256 qualityScore; // 数据质量评分，初始为100
        bool isActive;
    }

    struct AccessPermission {
        address granter;
        address grantee;
        bytes32 datasetHash;
        uint256 grantedAt;
        bool isActive;
    }

    mapping(bytes32 => Dataset) public datasets;
    mapping(bytes32 => AccessPermission[]) public accessPermissions;
    mapping(address => bytes32[]) public userDatasets;
    
    event DatasetRegistered(
        bytes32 indexed datasetHash,
        address indexed owner,
        string datasetName
    );
    
    event DatasetRevoked(bytes32 indexed datasetHash, address indexed owner);
    event AccessGranted(
        bytes32 indexed datasetHash,
        address indexed granter,
        address indexed grantee
    );
    event AccessRevoked(
        bytes32 indexed datasetHash,
        address indexed granter,
        address indexed grantee
    );
    event DataQualityReported(
        bytes32 indexed datasetHash,
        uint256 newQualityScore
    );

    modifier onlyDatasetOwner(bytes32 datasetHash) {
        require(datasets[datasetHash].owner == msg.sender, "Not dataset owner");
        _;
    }

    /**
     * @dev 注册数据集
     */
    function registerDataset(
        bytes32 datasetHash,
        string memory datasetName,
        string memory datasetDescription,
        string memory accessPolicy
    ) external {
        require(datasetHash != bytes32(0), "Invalid dataset hash");
        require(datasets[datasetHash].datasetHash == bytes32(0), "Dataset already exists");

        datasets[datasetHash] = Dataset({
            datasetHash: datasetHash,
            owner: msg.sender,
            datasetName: datasetName,
            datasetDescription: datasetDescription,
            accessPolicy: accessPolicy,
            uploadTime: block.timestamp,
            qualityScore: 100, // 初始质量评分为100
            isActive: true
        });

        userDatasets[msg.sender].push(datasetHash);

        emit DatasetRegistered(datasetHash, msg.sender, datasetName);
    }

    /**
     * @dev 授权数据访问
     */
    function grantAccess(bytes32 datasetHash, address grantee) external onlyDatasetOwner(datasetHash) {
        require(datasets[datasetHash].isActive, "Dataset not active");
        require(grantee != address(0), "Invalid grantee address");

        AccessPermission memory permission = AccessPermission({
            granter: msg.sender,
            grantee: grantee,
            datasetHash: datasetHash,
            grantedAt: block.timestamp,
            isActive: true
        });

        accessPermissions[datasetHash].push(permission);

        emit AccessGranted(datasetHash, msg.sender, grantee);
    }

    /**
     * @dev 撤销数据访问权限
     */
    function revokeAccess(bytes32 datasetHash, address grantee) external onlyDatasetOwner(datasetHash) {
        AccessPermission[] storage permissions = accessPermissions[datasetHash];
        for (uint256 i = 0; i < permissions.length; i++) {
            if (permissions[i].grantee == grantee && permissions[i].isActive) {
                permissions[i].isActive = false;
                emit AccessRevoked(datasetHash, msg.sender, grantee);
                break;
            }
        }
    }

    /**
     * @dev 检查是否有访问权限
     */
    function hasAccessPermission(bytes32 datasetHash, address user) external view returns (bool) {
        AccessPermission[] storage permissions = accessPermissions[datasetHash];
        for (uint256 i = 0; i < permissions.length; i++) {
            if (permissions[i].grantee == user && permissions[i].isActive) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev 获取用户拥有的数据集列表
     */
    function getUserDatasets(address user) external view returns (bytes32[] memory) {
        return userDatasets[user];
    }

    /**
     * @dev 获取数据集信息
     */
    function getDataset(bytes32 datasetHash) external view returns (Dataset memory) {
        return datasets[datasetHash];
    }

    /**
     * @dev 获取数据集的访问权限列表
     */
    function getAccessPermissions(bytes32 datasetHash) external view returns (AccessPermission[] memory) {
        return accessPermissions[datasetHash];
    }

    /**
     * @dev 报告数据质量
     * @dev 当使用该数据集训练的节点持续产生负贡献时，数据质量评分自动下降
     */
    function reportDataQuality(bytes32 datasetHash, bool isGoodQuality) external {
        require(datasets[datasetHash].datasetHash != bytes32(0), "Dataset does not exist");
        
        Dataset storage dataset = datasets[datasetHash];
        
        if (isGoodQuality) {
            // 提升质量评分，但不超过100
            dataset.qualityScore = dataset.qualityScore < 100 ? dataset.qualityScore + 1 : 100;
        } else {
            // 降低质量评分，但不低于10
            dataset.qualityScore = dataset.qualityScore > 10 ? dataset.qualityScore - 1 : 10;
        }

        emit DataQualityReported(datasetHash, dataset.qualityScore);
    }

    /**
     * @dev 批量报告数据质量问题（用于系统自动调整）
     */
    function adjustDataQuality(bytes32 datasetHash, int256 adjustment) external onlyOwner {
        Dataset storage dataset = datasets[datasetHash];
        
        if (adjustment > 0) {
            // 增加质量评分，但不超过100
            uint256 newScore = uint256(int256(dataset.qualityScore) + adjustment);
            dataset.qualityScore = newScore > 100 ? 100 : newScore;
        } else {
            // 减少质量评分，但不低于10
            int256 newScore = int256(dataset.qualityScore) + adjustment;
            dataset.qualityScore = newScore < 10 ? 10 : uint256(newScore);
        }

        emit DataQualityReported(datasetHash, dataset.qualityScore);
    }

    /**
     * @dev 撤销数据集（数据提供者可以撤销自己的数据集）
     */
    function revokeDataset(bytes32 datasetHash) external onlyDatasetOwner(datasetHash) {
        datasets[datasetHash].isActive = false;
        
        // 移除用户数据集列表中的条目
        bytes32[] storage userDsets = userDatasets[msg.sender];
        for (uint256 i = 0; i < userDsets.length; i++) {
            if (userDsets[i] == datasetHash) {
                userDsets[i] = userDsets[userDsets.length - 1];
                userDsets.pop();
                break;
            }
        }

        emit DatasetRevoked(datasetHash, msg.sender);
    }
}