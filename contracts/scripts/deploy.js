const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy PropToken (ERC-20)
  const PropToken = await hre.ethers.getContractFactory("PropToken");
  const propToken = await PropToken.deploy();
  await propToken.waitForDeployment();
  const propTokenAddr = await propToken.getAddress();
  console.log("PropToken deployed to:", propTokenAddr);

  // 2. Deploy PropertyNFT (ERC-721)
  const PropertyNFT = await hre.ethers.getContractFactory("PropertyNFT");
  const propertyNFT = await PropertyNFT.deploy();
  await propertyNFT.waitForDeployment();
  const propertyNFTAddr = await propertyNFT.getAddress();
  console.log("PropertyNFT deployed to:", propertyNFTAddr);

  // 3. Deploy PropertyMarketplace
  const PropertyMarketplace = await hre.ethers.getContractFactory("PropertyMarketplace");
  const marketplace = await PropertyMarketplace.deploy(propTokenAddr, propertyNFTAddr);
  await marketplace.waitForDeployment();
  const marketplaceAddr = await marketplace.getAddress();
  console.log("PropertyMarketplace deployed to:", marketplaceAddr);

  // 4. Deploy PropertyYield (yield rate: 0.01 PROP/sec per property)
  const yieldRate = hre.ethers.parseEther("0.01");
  const PropertyYield = await hre.ethers.getContractFactory("PropertyYield");
  const propertyYield = await PropertyYield.deploy(propertyNFTAddr, propTokenAddr, yieldRate);
  await propertyYield.waitForDeployment();
  const propertyYieldAddr = await propertyYield.getAddress();
  console.log("PropertyYield deployed to:", propertyYieldAddr);

  // 5. Transfer PropToken ownership to PropertyYield (so it can mint rewards)
  await propToken.transferOwnership(propertyYieldAddr);
  console.log("PropToken ownership transferred to PropertyYield");

  console.log("\n--- Frontend .env.local ---");
  console.log(`NEXT_PUBLIC_PROP_TOKEN_ADDRESS=${propTokenAddr}`);
  console.log(`NEXT_PUBLIC_PROPERTY_NFT_ADDRESS=${propertyNFTAddr}`);
  console.log(`NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddr}`);
  console.log(`NEXT_PUBLIC_PROPERTY_YIELD_ADDRESS=${propertyYieldAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
