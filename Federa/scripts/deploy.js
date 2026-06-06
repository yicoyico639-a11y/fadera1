const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);

  // 部署FederaRegistry
  console.log("\nDeploying FederaRegistry...");
  const FederaRegistry = await ethers.getContractFactory("FederaRegistry");
  const federaRegistry = await FederaRegistry.deploy();
  await federaRegistry.deployed(); // 使用deployed()替代waitForDeployment()
  console.log(`FederaRegistry deployed at: ${federaRegistry.address}`);

  // 部署FederaTaskFactory
  console.log("\nDeploying FederaTaskFactory...");
  const FederaTaskFactory = await ethers.getContractFactory("FederaTaskFactory");
  const federaTaskFactory = await FederaTaskFactory.deploy();
  await federaTaskFactory.deployed(); // 使用deployed()替代waitForDeployment()
  console.log(`FederaTaskFactory deployed at: ${federaTaskFactory.address}`);

  // 部署FederaDataRegistry
  console.log("\nDeploying FederaDataRegistry...");
  const FederaDataRegistry = await ethers.getContractFactory("FederaDataRegistry");
  const federaDataRegistry = await FederaDataRegistry.deploy();
  await federaDataRegistry.deployed(); // 使用deployed()替代waitForDeployment()
  console.log(`FederaDataRegistry deployed at: ${federaDataRegistry.address}`);

  // 部署FederaModelNFT
  console.log("\nDeploying FederaModelNFT...");
  const FederaModelNFT = await ethers.getContractFactory("FederaModelNFT");
  const federaModelNFT = await FederaModelNFT.deploy("https://api.federa.example/model/", "https://api.federa.example/model/");
  await federaModelNFT.deployed(); // 使用deployed()替代waitForDeployment()
  console.log(`FederaModelNFT deployed at: ${federaModelNFT.address}`);

  console.log("\nAll contracts deployed successfully!");
  
  // 输出部署信息供后续使用
  console.log("\nDeployment Summary:");
  console.log(`FederaRegistry: ${federaRegistry.address}`);
  console.log(`FederaTaskFactory: ${federaTaskFactory.address}`);
  console.log(`FederaDataRegistry: ${federaDataRegistry.address}`);
  console.log(`FederaModelNFT: ${federaModelNFT.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });