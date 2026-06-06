// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract FederaModelNFT is ERC1155Burnable, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    struct Contributor {
        address addr;
        uint256 contributionScore;
        uint256 roundsParticipated;
    }

    struct ModelMetadata {
        string name;
        string description;
        string image;
        uint256 taskId;
        uint256 version;
        uint256 parentVersion;
        string modelArchitecture;
        uint256 accuracy;
        uint256 loss;
        Contributor[] contributors;
        string trainingConfig;
        string modelUri;
        uint256 createdAt;
    }

    uint256 private _tokenIdCounter;
    mapping(uint256 => ModelMetadata) public modelMetadata;
    string public baseURI;

    event ModelVersionMinted(
        uint256 indexed tokenId,
        uint256 indexed taskId,
        uint256 version,
        address indexed minter
    );

    event ModelMetadataUpdated(uint256 indexed tokenId);

    constructor(string memory _uri, string memory _baseURI) ERC1155(_uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
        baseURI = _baseURI;
    }

    /**
     * @dev 铸造新的模型版本NFT
     */
    function mintModelVersion(
        address to,
        uint256 taskId,
        uint256 parentVersion,
        string memory modelArchitecture,
        uint256 accuracy,
        uint256 loss,
        Contributor[] memory contributors,
        string memory trainingConfig,
        string memory modelUri,
        string memory name,
        string memory description,
        string memory image
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = ++_tokenIdCounter;
        
        // 使用辅助函数来避免堆栈深度问题
        _createModelMetadata(tokenId, taskId, parentVersion, modelArchitecture, accuracy, loss, contributors, trainingConfig, modelUri, name, description, image);

        _mint(to, tokenId, 1, "");

        emit ModelVersionMinted(tokenId, taskId, parentVersion + 1, to);

        return tokenId;
    }

    /**
     * @dev 辅助函数，创建模型元数据以避免堆栈深度问题
     */
    function _createModelMetadata(
        uint256 tokenId,
        uint256 taskId,
        uint256 parentVersion,
        string memory modelArchitecture,
        uint256 accuracy,
        uint256 loss,
        Contributor[] memory contributors,
        string memory trainingConfig,
        string memory modelUri,
        string memory name,
        string memory description,
        string memory image
    ) private {
        ModelMetadata storage newMetadata = modelMetadata[tokenId];
        newMetadata.name = name;
        newMetadata.description = description;
        newMetadata.image = image;
        newMetadata.taskId = taskId;
        newMetadata.version = parentVersion + 1;
        newMetadata.parentVersion = parentVersion;
        newMetadata.modelArchitecture = modelArchitecture;
        newMetadata.accuracy = accuracy;
        newMetadata.loss = loss;
        newMetadata.contributors = contributors;
        newMetadata.trainingConfig = trainingConfig;
        newMetadata.modelUri = modelUri;
        newMetadata.createdAt = block.timestamp;
    }

    /**
     * @dev 批量铸造模型版本NFT
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        _mintBatch(to, tokenIds, amounts, data);
    }

    /**
     * @dev 更新模型元数据
     */
    function updateModelMeta(
        uint256 tokenId,
        string memory newName,
        string memory newDescription,
        uint256 newAccuracy,
        uint256 newLoss
    ) public onlyRole(UPDATER_ROLE) {
        require(_exists(tokenId), "Token does not exist");

        ModelMetadata storage metadata = modelMetadata[tokenId];
        metadata.name = newName;
        metadata.description = newDescription;
        metadata.accuracy = newAccuracy;
        metadata.loss = newLoss;

        emit ModelMetadataUpdated(tokenId);
    }

    /**
     * @dev 获取模型元数据
     */
    function getModelMetadata(uint256 tokenId) public view returns (ModelMetadata memory) {
        return modelMetadata[tokenId];
    }

    /**
     * @dev 检查token是否存在
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return balanceOf(address(this), tokenId) > 0 || 
               balanceOf(address(0), tokenId) > 0; // 检查token是否已被铸造
    }

    /**
     * @dev 检查token是否存在（公共接口）
     */
    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @dev 获取token URI
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        if (bytes(baseURI).length > 0) {
            return string(abi.encodePacked(baseURI, tokenId.toString()));
        }
        
        // 返回包含元数据的JSON格式
        ModelMetadata memory metadata = modelMetadata[tokenId];
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                _encodeBase64(
                    abi.encodePacked(
                        '{"name":"',
                        metadata.name,
                        '","description":"',
                        metadata.description,
                        '","image":"',
                        metadata.image,
                        '","properties":{',
                        '"taskId":"',
                        metadata.taskId.toString(),
                        '","version":',
                        metadata.version.toString(),
                        ',"parentVersion":',
                        metadata.parentVersion.toString(),
                        ',"modelArchitecture":"',
                        metadata.modelArchitecture,
                        '","performanceMetrics":{',
                        '"accuracy":',
                        (metadata.accuracy / 100).toString(),
                        '.',
                        (metadata.accuracy % 100).toString(),
                        ',"loss":',
                        (metadata.loss / 100).toString(),
                        '.',
                        (metadata.loss % 100).toString(),
                        '},'
                        '"contributors":['
                    )
                ),
                _encodeContributors(metadata.contributors),
                abi.encodePacked(
                    '],"trainingConfig":"',
                    metadata.trainingConfig,
                    '","modelUri":"',
                    metadata.modelUri,
                    '","createdAt":',
                    metadata.createdAt.toString(),
                    '}}'
                )
            )
        );
    }

    /**
     * @dev 内部函数：编码贡献者数组为JSON字符串
     */
    function _encodeContributors(Contributor[] memory contributors) internal pure returns (bytes memory) {
        if (contributors.length == 0) {
            return "[]";
        }

        bytes memory result = "[";
        for (uint256 i = 0; i < contributors.length; i++) {
            result = abi.encodePacked(
                result,
                '{"address":"',
                _addressToString(contributors[i].addr),
                '","contributionScore":',
                contributors[i].contributionScore.toString(),
                ',"roundsParticipated":',
                contributors[i].roundsParticipated.toString()
            );
            
            if (i < contributors.length - 1) {
                result = abi.encodePacked(result, "},");
            } else {
                result = abi.encodePacked(result, "}");
            }
        }
        result = abi.encodePacked(result, "]");
        
        return result;
    }

    /**
     * @dev 内部函数：将地址转换为字符串
     */
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = "0";
        s[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(addr)) / (2**(8*(19-i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i + 2] = _char(hi);
            s[2*i + 3] = _char(lo);
        }
        return string(s);
    }

    /**
     * @dev 内部函数：将字节转换为字符
     */
    function _char(bytes1 b) internal pure returns (bytes1) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    /**
     * @dev Base64编码函数（简化版）
     */
    function _encodeBase64(bytes memory data) internal pure returns (string memory) {
        // 这是一个简化的Base64编码实现
        // 在实际部署中，你可能需要一个完整的Base64库
        return string(data); // 临时返回原数据
    }

    /**
     * @dev 设置基础URI
     */
    function setBaseURI(string memory newBaseURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        baseURI = newBaseURI;
    }

    /**
     * @dev 铸造给多个接收者
     */
    function mintToMultiple(
        address[] memory recipients,
        uint256 taskId,
        uint256 parentVersion,
        string memory modelArchitecture,
        uint256 accuracy,
        uint256 loss,
        Contributor[] memory contributors,
        string memory trainingConfig,
        string memory modelUri,
        string memory name,
        string memory description,
        string memory image
    ) public onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < recipients.length; i++) {
            mintModelVersion(
                recipients[i],
                taskId,
                parentVersion,
                modelArchitecture,
                accuracy,
                loss,
                contributors,
                trainingConfig,
                modelUri,
                name,
                description,
                image
            );
        }
    }
    
    /**
     * @dev 支持接口
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}