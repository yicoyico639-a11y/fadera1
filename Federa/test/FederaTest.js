const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Federa Protocol", function () {
  let federaRegistry;
  let federaTaskFactory;
  let federaDataRegistry;
  let federaModelNFT;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // 部署FederaRegistry
    const FederaRegistry = await ethers.getContractFactory("FederaRegistry");
    federaRegistry = await FederaRegistry.deploy();
    await federaRegistry.deployed(); // 使用deployed()方法

    // 部署FederaTaskFactory
    const FederaTaskFactory = await ethers.getContractFactory("FederaTaskFactory");
    federaTaskFactory = await FederaTaskFactory.deploy();
    await federaTaskFactory.deployed(); // 使用deployed()方法

    // 部署FederaDataRegistry
    const FederaDataRegistry = await ethers.getContractFactory("FederaDataRegistry");
    federaDataRegistry = await FederaDataRegistry.deploy();
    await federaDataRegistry.deployed(); // 使用deployed()方法

    // 部署FederaModelNFT
    const FederaModelNFT = await ethers.getContractFactory("FederaModelNFT");
    federaModelNFT = await FederaModelNFT.deploy("https://api.federa.io/metadata/", "https://api.federa.io/metadata/");
    await federaModelNFT.deployed(); // 使用deployed()方法
  });

  describe("FederaRegistry", function () {
    it("Should allow node registration", async function () {
      // 注册训练节点
      await federaRegistry.connect(addr1).registerTrainer();
      
      // 检查节点是否已注册
      const nodeInfo = await federaRegistry.getNodeInfo(addr1.address);
      expect(nodeInfo.nodeType).to.equal(1); // Trainer = 1
      
      // 注册聚合节点
      await federaRegistry.connect(addr2).registerAggregator();
      
      // 检查聚合节点是否已注册
      const aggregatorInfo = await federaRegistry.getNodeInfo(addr2.address);
      expect(aggregatorInfo.nodeType).to.equal(2); // Aggregator = 2
    });

    it("Should handle node registration and eligibility", async function () {
      // 注册节点
      await federaRegistry.connect(addr1).registerTrainer();
      
      // 检查节点是否注册成功
      const nodeInfo = await federaRegistry.getNodeInfo(addr1.address);
      expect(nodeInfo.nodeAddress).to.equal(addr1.address);
      expect(nodeInfo.isActive).to.equal(true);
      
      // 检查节点是否有资格参与
      const isEligible = await federaRegistry.isEligibleToParticipate(addr1.address);
      expect(isEligible).to.equal(true);
    });

    it("Should handle reputation updates", async function () {
      // 注册节点
      await federaRegistry.connect(addr1).registerTrainer();
      
      // 获取初始信誉分
      let initialScore = await federaRegistry.getReputationScore(addr1.address);
      expect(initialScore).to.equal(100); // 初始信誉分是100
      
      // 更新信誉分 - 需要所有者权限
      await federaRegistry.connect(owner).updateReputation(addr1.address, 10);
      
      // 检查信誉分
      const newScore = await federaRegistry.getReputationScore(addr1.address);
      expect(newScore).to.equal(100); // 注意：由于最大值限制为100，所以仍然是100
      
      // 测试降低信誉分
      await federaRegistry.connect(owner).updateReputation(addr1.address, -10);
      const lowerScore = await federaRegistry.getReputationScore(addr1.address);
      expect(lowerScore).to.equal(90);
    });
  });

  describe("FederaDataRegistry", function () {
    it("Should register datasets", async function () {
      const datasetHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("dataset_v1"));
      const datasetName = "Test Dataset";
      const datasetDescription = "A test dataset for federated learning";
      const accessPolicy = "TEE_ONLY";
      
      await federaDataRegistry.connect(addr1).registerDataset(datasetHash, datasetName, datasetDescription, accessPolicy);
      
      const datasetInfo = await federaDataRegistry.getDataset(datasetHash);
      expect(datasetInfo.owner).to.equal(addr1.address);
      expect(datasetInfo.datasetName).to.equal(datasetName);
    });
  });

  describe("FederaModelNFT", function () {
    it("Should mint model NFTs", async function () {
      // 授予铸币权限
      const MINTER_ROLE = await federaModelNFT.MINTER_ROLE();
      await federaModelNFT.grantRole(MINTER_ROLE, owner.address);
      
      const contributor = {
        addr: addr1.address,
        contributionScore: 100,
        roundsParticipated: 5
      };
      
      const tokenId = await federaModelNFT.callStatic.mintModelVersion(
        addr1.address,
        1, // taskId
        0, // parentVersion
        "ResNet50",
        9500, // accuracy (95.00%)
        500, // loss (5.00%)
        [contributor],
        '{"learningRate": 0.001}',
        "ipfs://Qm...",
        "Model v1.0",
        "Initial model version",
        "https://example.com/model.png"
      );
      
      await federaModelNFT.mintModelVersion(
        addr1.address,
        1, // taskId
        0, // parentVersion
        "ResNet50",
        9500, // accuracy (95.00%)
        500, // loss (5.00%)
        [contributor],
        '{"learningRate": 0.001}',
        "ipfs://Qm...",
        "Model v1.0",
        "Initial model version",
        "https://example.com/model.png"
      );
      
      // 由于FederaModelNFT继承自ERC1155，它没有ownerOf方法，而是使用balanceOf
      expect(await federaModelNFT.balanceOf(addr1.address, tokenId)).to.equal(1);
    });
  });
});