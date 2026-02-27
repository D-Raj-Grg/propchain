const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Seeding with:", deployer.address);

  // Load contract addresses from env
  const propTokenAddr = process.env.NEXT_PUBLIC_PROP_TOKEN_ADDRESS;
  const propertyNFTAddr = process.env.NEXT_PUBLIC_PROPERTY_NFT_ADDRESS;
  const marketplaceAddr = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
  const propertyYieldAddr = process.env.NEXT_PUBLIC_PROPERTY_YIELD_ADDRESS;

  if (!propTokenAddr || !propertyNFTAddr || !marketplaceAddr || !propertyYieldAddr) {
    console.error("Missing contract addresses. Set NEXT_PUBLIC_* env vars first.");
    console.error("You can copy them from your deploy output or frontend/.env.local");
    process.exit(1);
  }

  const propToken = await hre.ethers.getContractAt("PropToken", propTokenAddr);
  const propertyNFT = await hre.ethers.getContractAt("PropertyNFT", propertyNFTAddr);
  const marketplace = await hre.ethers.getContractAt("PropertyMarketplace", marketplaceAddr);
  const propertyYield = await hre.ethers.getContractAt("PropertyYield", propertyYieldAddr);

  // ── Mint 6 demo properties ──
  const properties = [
    { name: "Downtown Loft", location: "New York", area: 85, price: "500" },
    { name: "Beachfront Villa", location: "Miami", area: 220, price: "1200" },
    { name: "Skyline Penthouse", location: "Dubai", area: 310, price: "2500" },
    { name: "Heritage Townhouse", location: "London", area: 175, price: "800" },
    { name: "Garden Estate", location: "Tokyo", area: 450, price: "1500" },
    { name: "Lakeside Cabin", location: "Vancouver", area: 95, price: "350" },
  ];

  console.log("\nMinting properties...");
  for (const p of properties) {
    const tx = await propertyNFT.mintProperty(
      deployer.address,
      p.name,
      p.location,
      p.area,
      hre.ethers.parseEther(p.price)
    );
    await tx.wait();
    console.log(`  Minted: ${p.name} (${p.location})`);
  }

  // ── Register all for yield ──
  console.log("\nRegistering properties for yield...");
  const totalProps = await propertyNFT.totalProperties();
  for (let i = 0; i < Number(totalProps); i++) {
    try {
      const tx = await propertyYield.registerProperty(i);
      await tx.wait();
      console.log(`  Registered token #${i} for yield`);
    } catch {
      console.log(`  Token #${i} already registered (skipped)`);
    }
  }

  // ── Approve marketplace for NFTs ──
  console.log("\nApproving marketplace for NFTs...");
  const approveTx = await propertyNFT.setApprovalForAll(marketplaceAddr, true);
  await approveTx.wait();
  console.log("  Approved");

  // ── List 4 properties on marketplace ──
  const listings = [
    { tokenId: 0, price: "600" },
    { tokenId: 1, price: "1500" },
    { tokenId: 2, price: "3000" },
    { tokenId: 4, price: "1800" },
  ];

  console.log("\nListing properties on marketplace...");
  for (const l of listings) {
    const tx = await marketplace.listProperty(l.tokenId, hre.ethers.parseEther(l.price));
    await tx.wait();
    const prop = await propertyNFT.properties(l.tokenId);
    console.log(`  Listed: ${prop.name} for ${l.price} PROP`);
  }

  console.log("\nSeed complete!");
  console.log(`  ${properties.length} properties minted`);
  console.log(`  ${listings.length} properties listed on marketplace`);
  console.log(`  ${Number(totalProps)} properties registered for yield`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
