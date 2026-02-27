const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PropChain", function () {
  let propToken, propertyNFT, marketplace, propertyYield;
  let owner, alice, bob, feeCollector;
  const YIELD_RATE = ethers.parseEther("0.01"); // 0.01 PROP/sec

  beforeEach(async function () {
    [owner, alice, bob, feeCollector] = await ethers.getSigners();

    // Deploy PropToken
    const PropToken = await ethers.getContractFactory("PropToken");
    propToken = await PropToken.deploy();

    // Deploy PropertyNFT
    const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
    propertyNFT = await PropertyNFT.deploy();

    // Deploy Marketplace
    const PropertyMarketplace = await ethers.getContractFactory("PropertyMarketplace");
    marketplace = await PropertyMarketplace.deploy(
      await propToken.getAddress(),
      await propertyNFT.getAddress()
    );

    // Deploy PropertyYield
    const PropertyYield = await ethers.getContractFactory("PropertyYield");
    propertyYield = await PropertyYield.deploy(
      await propertyNFT.getAddress(),
      await propToken.getAddress(),
      YIELD_RATE
    );

    // Transfer PROP mint rights to PropertyYield
    await propToken.transferOwnership(await propertyYield.getAddress());

    // Give alice and bob some PROP tokens for marketplace
    await propToken.transfer(alice.address, ethers.parseEther("100000"));
    await propToken.transfer(bob.address, ethers.parseEther("100000"));
  });

  // ─────────────────────────────────────────
  //  PropToken
  // ─────────────────────────────────────────
  describe("PropToken", function () {
    it("should have correct name, symbol, and initial supply", async function () {
      expect(await propToken.name()).to.equal("PropToken");
      expect(await propToken.symbol()).to.equal("PROP");
      const totalSupply = await propToken.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("10000000"));
    });

    it("should transfer ownership to PropertyYield", async function () {
      expect(await propToken.owner()).to.equal(await propertyYield.getAddress());
    });
  });

  // ─────────────────────────────────────────
  //  PropertyNFT — Minting
  // ─────────────────────────────────────────
  describe("PropertyNFT — Minting", function () {
    it("should mint a property with correct metadata", async function () {
      await propertyNFT.mintProperty(alice.address, "Downtown Loft", "New York", 85, ethers.parseEther("500"));

      expect(await propertyNFT.ownerOf(0)).to.equal(alice.address);

      const prop = await propertyNFT.properties(0);
      expect(prop.name).to.equal("Downtown Loft");
      expect(prop.location).to.equal("New York");
      expect(prop.area).to.equal(85);
      expect(prop.mintPrice).to.equal(ethers.parseEther("500"));
    });

    it("should emit PropertyMinted event", async function () {
      await expect(
        propertyNFT.mintProperty(alice.address, "Beach House", "Miami", 200, ethers.parseEther("1000"))
      )
        .to.emit(propertyNFT, "PropertyMinted")
        .withArgs(0, alice.address, "Beach House", "Miami", 200, ethers.parseEther("1000"));
    });

    it("should increment token IDs", async function () {
      await propertyNFT.mintProperty(alice.address, "Prop A", "City A", 50, ethers.parseEther("100"));
      await propertyNFT.mintProperty(bob.address, "Prop B", "City B", 75, ethers.parseEther("200"));

      expect(await propertyNFT.totalProperties()).to.equal(2);
      expect(await propertyNFT.ownerOf(0)).to.equal(alice.address);
      expect(await propertyNFT.ownerOf(1)).to.equal(bob.address);
    });

    it("should generate on-chain tokenURI", async function () {
      await propertyNFT.mintProperty(alice.address, "Test Prop", "TestCity", 100, ethers.parseEther("250"));

      const uri = await propertyNFT.tokenURI(0);
      expect(uri).to.contain("data:application/json;base64,");

      // Decode and verify
      const base64 = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(base64, "base64").toString());
      expect(json.name).to.equal("Test Prop");
      expect(json.attributes[0].value).to.equal("TestCity");
    });

    it("should revert if non-owner tries to mint", async function () {
      await expect(
        propertyNFT.connect(alice).mintProperty(alice.address, "X", "Y", 1, 1)
      ).to.be.revertedWithCustomError(propertyNFT, "OwnableUnauthorizedAccount");
    });

    it("should support ERC721Enumerable", async function () {
      await propertyNFT.mintProperty(alice.address, "P1", "L1", 50, ethers.parseEther("100"));
      await propertyNFT.mintProperty(alice.address, "P2", "L2", 75, ethers.parseEther("200"));

      expect(await propertyNFT.balanceOf(alice.address)).to.equal(2);
      expect(await propertyNFT.tokenOfOwnerByIndex(alice.address, 0)).to.equal(0);
      expect(await propertyNFT.tokenOfOwnerByIndex(alice.address, 1)).to.equal(1);
    });
  });

  // ─────────────────────────────────────────
  //  Marketplace — Listings
  // ─────────────────────────────────────────
  describe("Marketplace — Listings", function () {
    beforeEach(async function () {
      await propertyNFT.mintProperty(alice.address, "Apartment", "London", 60, ethers.parseEther("300"));
      await propertyNFT.connect(alice).approve(await marketplace.getAddress(), 0);
    });

    it("should list a property", async function () {
      const price = ethers.parseEther("500");
      await expect(marketplace.connect(alice).listProperty(0, price))
        .to.emit(marketplace, "Listed")
        .withArgs(0, alice.address, price);

      const listing = await marketplace.listings(0);
      expect(listing.seller).to.equal(alice.address);
      expect(listing.price).to.equal(price);
      expect(listing.active).to.be.true;
    });

    it("should revert listing if not owner", async function () {
      await expect(
        marketplace.connect(bob).listProperty(0, ethers.parseEther("500"))
      ).to.be.revertedWith("Not token owner");
    });

    it("should revert listing if marketplace not approved", async function () {
      await propertyNFT.mintProperty(bob.address, "Villa", "Rome", 150, ethers.parseEther("800"));
      // Bob does NOT approve marketplace
      await expect(
        marketplace.connect(bob).listProperty(1, ethers.parseEther("500"))
      ).to.be.revertedWith("Marketplace not approved");
    });

    it("should revert listing with zero price", async function () {
      await expect(
        marketplace.connect(alice).listProperty(0, 0)
      ).to.be.revertedWith("Price must be > 0");
    });

    it("should delist a property", async function () {
      await marketplace.connect(alice).listProperty(0, ethers.parseEther("500"));
      await expect(marketplace.connect(alice).delistProperty(0))
        .to.emit(marketplace, "Delisted")
        .withArgs(0, alice.address);

      const listing = await marketplace.listings(0);
      expect(listing.active).to.be.false;
    });

    it("should revert delist if not seller", async function () {
      await marketplace.connect(alice).listProperty(0, ethers.parseEther("500"));
      await expect(
        marketplace.connect(bob).delistProperty(0)
      ).to.be.revertedWith("Not seller");
    });
  });

  // ─────────────────────────────────────────
  //  Marketplace — Direct Buy
  // ─────────────────────────────────────────
  describe("Marketplace — Direct Buy", function () {
    const PRICE = ethers.parseEther("1000");

    beforeEach(async function () {
      await propertyNFT.mintProperty(alice.address, "Penthouse", "Dubai", 250, ethers.parseEther("2000"));
      await propertyNFT.connect(alice).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(alice).listProperty(0, PRICE);
      await propToken.connect(bob).approve(await marketplace.getAddress(), ethers.MaxUint256);
    });

    it("should buy property and transfer NFT + PROP correctly", async function () {
      const aliceBalBefore = await propToken.balanceOf(alice.address);
      const ownerBalBefore = await propToken.balanceOf(owner.address); // fee collector = owner

      await expect(marketplace.connect(bob).buyProperty(0))
        .to.emit(marketplace, "Sold");

      // NFT transferred
      expect(await propertyNFT.ownerOf(0)).to.equal(bob.address);

      // Listing deactivated
      const listing = await marketplace.listings(0);
      expect(listing.active).to.be.false;

      // 5% fee = 50 PROP, seller gets 950 PROP
      const fee = PRICE * 500n / 10000n;
      const sellerProceeds = PRICE - fee;

      expect(await propToken.balanceOf(alice.address)).to.equal(aliceBalBefore + sellerProceeds);
      expect(await propToken.balanceOf(owner.address)).to.equal(ownerBalBefore + fee);
    });

    it("should revert if buyer is seller", async function () {
      await propToken.connect(alice).approve(await marketplace.getAddress(), ethers.MaxUint256);
      await expect(
        marketplace.connect(alice).buyProperty(0)
      ).to.be.revertedWith("Cannot buy own listing");
    });

    it("should revert if not listed", async function () {
      await marketplace.connect(alice).delistProperty(0);
      await expect(
        marketplace.connect(bob).buyProperty(0)
      ).to.be.revertedWith("Not listed");
    });
  });

  // ─────────────────────────────────────────
  //  Marketplace — Escrow Offers
  // ─────────────────────────────────────────
  describe("Marketplace — Escrow Offers", function () {
    const OFFER_AMOUNT = ethers.parseEther("800");

    beforeEach(async function () {
      await propertyNFT.mintProperty(alice.address, "Condo", "Singapore", 90, ethers.parseEther("700"));
      await propertyNFT.connect(alice).approve(await marketplace.getAddress(), 0);
      await propToken.connect(bob).approve(await marketplace.getAddress(), ethers.MaxUint256);
    });

    it("should make an offer and escrow tokens", async function () {
      const bobBalBefore = await propToken.balanceOf(bob.address);

      await expect(marketplace.connect(bob).makeOffer(0, OFFER_AMOUNT))
        .to.emit(marketplace, "OfferMade")
        .withArgs(0, 0, bob.address, OFFER_AMOUNT);

      // Tokens escrowed in marketplace
      expect(await propToken.balanceOf(bob.address)).to.equal(bobBalBefore - OFFER_AMOUNT);
      expect(await propToken.balanceOf(await marketplace.getAddress())).to.equal(OFFER_AMOUNT);

      const offer = await marketplace.offers(0, 0);
      expect(offer.buyer).to.equal(bob.address);
      expect(offer.amount).to.equal(OFFER_AMOUNT);
      expect(offer.active).to.be.true;
    });

    it("should accept an offer: transfer NFT + distribute funds", async function () {
      await marketplace.connect(bob).makeOffer(0, OFFER_AMOUNT);

      const aliceBalBefore = await propToken.balanceOf(alice.address);

      await expect(marketplace.connect(alice).acceptOffer(0, 0))
        .to.emit(marketplace, "OfferAccepted");

      // NFT transferred to buyer
      expect(await propertyNFT.ownerOf(0)).to.equal(bob.address);

      // Fee: 5% of 800 = 40, seller gets 760
      const fee = OFFER_AMOUNT * 500n / 10000n;
      const sellerProceeds = OFFER_AMOUNT - fee;

      expect(await propToken.balanceOf(alice.address)).to.equal(aliceBalBefore + sellerProceeds);
    });

    it("should cancel an offer and refund", async function () {
      await marketplace.connect(bob).makeOffer(0, OFFER_AMOUNT);

      const bobBalBefore = await propToken.balanceOf(bob.address);

      await expect(marketplace.connect(bob).cancelOffer(0, 0))
        .to.emit(marketplace, "OfferCancelled")
        .withArgs(0, 0, bob.address);

      // Refunded
      expect(await propToken.balanceOf(bob.address)).to.equal(bobBalBefore + OFFER_AMOUNT);
    });

    it("should revert cancel if not offer maker", async function () {
      await marketplace.connect(bob).makeOffer(0, OFFER_AMOUNT);
      await expect(
        marketplace.connect(alice).cancelOffer(0, 0)
      ).to.be.revertedWith("Not offer maker");
    });

    it("should revert accept if not token owner", async function () {
      await marketplace.connect(bob).makeOffer(0, OFFER_AMOUNT);
      await expect(
        marketplace.connect(bob).acceptOffer(0, 0)
      ).to.be.revertedWith("Not token owner");
    });

    it("should handle multiple offers on same property", async function () {
      await propToken.connect(alice).approve(await marketplace.getAddress(), ethers.MaxUint256);

      // Bob's offer is already set up, we also need Alice to NOT be the owner for this test
      // Instead: mint another property for bob, then both alice and bob make offers on it
      await propertyNFT.mintProperty(bob.address, "Tower", "Tokyo", 120, ethers.parseEther("900"));
      await propertyNFT.connect(bob).approve(await marketplace.getAddress(), 1);

      await marketplace.connect(alice).makeOffer(1, ethers.parseEther("400"));
      await marketplace.connect(alice).makeOffer(1, ethers.parseEther("500"));

      expect(await marketplace.offerCount(1)).to.equal(2);

      const offer0 = await marketplace.offers(1, 0);
      const offer1 = await marketplace.offers(1, 1);
      expect(offer0.amount).to.equal(ethers.parseEther("400"));
      expect(offer1.amount).to.equal(ethers.parseEther("500"));
    });

    it("should revert offer on own property", async function () {
      await expect(
        marketplace.connect(alice).makeOffer(0, OFFER_AMOUNT)
      ).to.be.revertedWith("Cannot offer on own property");
    });
  });

  // ─────────────────────────────────────────
  //  Marketplace — Fees & Admin
  // ─────────────────────────────────────────
  describe("Marketplace — Fees & Admin", function () {
    it("should update fee", async function () {
      await expect(marketplace.setFee(250))
        .to.emit(marketplace, "FeeUpdated")
        .withArgs(250);
      expect(await marketplace.feeBasisPoints()).to.equal(250);
    });

    it("should revert fee above 10%", async function () {
      await expect(marketplace.setFee(1001)).to.be.revertedWith("Fee too high");
    });

    it("should update fee collector", async function () {
      await expect(marketplace.setFeeCollector(feeCollector.address))
        .to.emit(marketplace, "FeeCollectorUpdated")
        .withArgs(feeCollector.address);
      expect(await marketplace.feeCollector()).to.equal(feeCollector.address);
    });

    it("should revert fee collector to zero address", async function () {
      await expect(
        marketplace.setFeeCollector(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });

    it("should collect fees to custom collector", async function () {
      await marketplace.setFeeCollector(feeCollector.address);

      await propertyNFT.mintProperty(alice.address, "House", "Paris", 80, ethers.parseEther("300"));
      await propertyNFT.connect(alice).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(alice).listProperty(0, ethers.parseEther("1000"));

      await propToken.connect(bob).approve(await marketplace.getAddress(), ethers.MaxUint256);
      await marketplace.connect(bob).buyProperty(0);

      const fee = ethers.parseEther("1000") * 500n / 10000n; // 50 PROP
      expect(await propToken.balanceOf(feeCollector.address)).to.equal(fee);
    });
  });

  // ─────────────────────────────────────────
  //  PropertyYield
  // ─────────────────────────────────────────
  describe("PropertyYield", function () {
    beforeEach(async function () {
      await propertyNFT.mintProperty(alice.address, "Farm", "Texas", 500, ethers.parseEther("200"));
      await propertyYield.registerProperty(0);
    });

    it("should register property for yield", async function () {
      const startTime = await propertyYield.yieldStartTime(0);
      expect(startTime).to.be.gt(0);
    });

    it("should accumulate yield over time", async function () {
      await time.increase(100); // 100 seconds

      const pending = await propertyYield.pendingYield(0);
      // ~100 seconds * 0.01 PROP/sec = ~1 PROP (allow small variance)
      expect(pending).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.02"));
    });

    it("should claim yield and mint PROP tokens", async function () {
      await time.increase(200);

      const balBefore = await propToken.balanceOf(alice.address);

      await expect(propertyYield.connect(alice).claimYield(0))
        .to.emit(propertyYield, "YieldClaimed");

      const balAfter = await propToken.balanceOf(alice.address);
      const earned = balAfter - balBefore;
      // ~200 seconds * 0.01 = 2 PROP (allow variance for block timestamp)
      expect(earned).to.be.closeTo(ethers.parseEther("2"), ethers.parseEther("0.02"));
    });

    it("should reset pending yield after claim", async function () {
      await time.increase(100);
      await propertyYield.connect(alice).claimYield(0);

      const pending = await propertyYield.pendingYield(0);
      expect(pending).to.be.closeTo(0, ethers.parseEther("0.01"));
    });

    it("should revert claim by non-owner", async function () {
      await time.increase(100);
      await expect(
        propertyYield.connect(bob).claimYield(0)
      ).to.be.revertedWith("Not property owner");
    });

    it("should NOT let old owner claim after transfer", async function () {
      await time.increase(100);

      // Transfer property from alice to bob
      await propertyNFT.connect(alice).transferFrom(alice.address, bob.address, 0);

      // Alice (old owner) can no longer claim
      await expect(
        propertyYield.connect(alice).claimYield(0)
      ).to.be.revertedWith("Not property owner");

      // Bob (new owner) can claim
      await expect(propertyYield.connect(bob).claimYield(0)).to.not.be.reverted;
    });

    it("should batch claim yield for multiple properties", async function () {
      await propertyNFT.mintProperty(alice.address, "Ranch", "Montana", 1000, ethers.parseEther("400"));
      await propertyYield.registerProperty(1);

      await time.increase(100);

      const balBefore = await propToken.balanceOf(alice.address);
      await propertyYield.connect(alice).batchClaimYield([0, 1]);
      const balAfter = await propToken.balanceOf(alice.address);

      // 2 properties * 100 seconds * 0.01 PROP/sec = ~2 PROP
      const earned = balAfter - balBefore;
      expect(earned).to.be.closeTo(ethers.parseEther("2"), ethers.parseEther("0.05"));
    });

    it("should update yield rate", async function () {
      const newRate = ethers.parseEther("0.05");
      await expect(propertyYield.setYieldRate(newRate))
        .to.emit(propertyYield, "YieldRateUpdated")
        .withArgs(newRate);
      expect(await propertyYield.yieldRate()).to.equal(newRate);
    });

    it("should revert registration of already registered property", async function () {
      await expect(propertyYield.registerProperty(0)).to.be.revertedWith("Already registered");
    });

    it("should revert claim on unregistered property", async function () {
      await propertyNFT.mintProperty(alice.address, "Cabin", "Alaska", 30, ethers.parseEther("50"));
      await expect(
        propertyYield.connect(alice).claimYield(1)
      ).to.be.revertedWith("Property not registered");
    });
  });

  // ─────────────────────────────────────────
  //  Access Control
  // ─────────────────────────────────────────
  describe("Access Control", function () {
    it("only owner can mint PropertyNFT", async function () {
      await expect(
        propertyNFT.connect(alice).mintProperty(alice.address, "X", "Y", 1, 1)
      ).to.be.revertedWithCustomError(propertyNFT, "OwnableUnauthorizedAccount");
    });

    it("only owner can set marketplace fee", async function () {
      await expect(
        marketplace.connect(alice).setFee(100)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });

    it("only owner can set fee collector", async function () {
      await expect(
        marketplace.connect(alice).setFeeCollector(alice.address)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });

    it("only owner can register property for yield", async function () {
      await propertyNFT.mintProperty(alice.address, "Villa", "Bali", 200, ethers.parseEther("500"));
      await expect(
        propertyYield.connect(alice).registerProperty(0)
      ).to.be.revertedWithCustomError(propertyYield, "OwnableUnauthorizedAccount");
    });

    it("only owner can set yield rate", async function () {
      await expect(
        propertyYield.connect(alice).setYieldRate(1)
      ).to.be.revertedWithCustomError(propertyYield, "OwnableUnauthorizedAccount");
    });
  });

  // ─────────────────────────────────────────
  //  Integration — Full Flow
  // ─────────────────────────────────────────
  describe("Integration — Full Flow", function () {
    it("mint → list → buy → earn yield → claim", async function () {
      // 1. Mint property to alice
      await propertyNFT.mintProperty(alice.address, "Skyscraper", "Shanghai", 300, ethers.parseEther("5000"));
      await propertyYield.registerProperty(0);

      // 2. List on marketplace
      await propertyNFT.connect(alice).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(alice).listProperty(0, ethers.parseEther("10000"));

      // 3. Bob buys
      await propToken.connect(bob).approve(await marketplace.getAddress(), ethers.MaxUint256);
      await marketplace.connect(bob).buyProperty(0);

      expect(await propertyNFT.ownerOf(0)).to.equal(bob.address);

      // 4. Time passes, bob earns yield
      await time.increase(300);

      // 5. Bob claims yield
      const balBefore = await propToken.balanceOf(bob.address);
      await propertyYield.connect(bob).claimYield(0);
      const balAfter = await propToken.balanceOf(bob.address);

      expect(balAfter - balBefore).to.be.closeTo(ethers.parseEther("3"), ethers.parseEther("0.05"));
    });

    it("mint → offer → accept → new owner claims yield", async function () {
      await propertyNFT.mintProperty(alice.address, "Warehouse", "Detroit", 400, ethers.parseEther("1000"));
      await propertyYield.registerProperty(0);

      // Bob makes escrow offer
      await propToken.connect(bob).approve(await marketplace.getAddress(), ethers.MaxUint256);
      await marketplace.connect(bob).makeOffer(0, ethers.parseEther("2000"));

      // Alice accepts
      await propertyNFT.connect(alice).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(alice).acceptOffer(0, 0);

      expect(await propertyNFT.ownerOf(0)).to.equal(bob.address);

      // Yield accrues for new owner
      await time.increase(500);
      await propertyYield.connect(bob).claimYield(0);

      const bobBal = await propToken.balanceOf(bob.address);
      // Bob started with 100k, spent 2k on offer, earned ~5 PROP yield
      expect(bobBal).to.be.closeTo(ethers.parseEther("98005"), ethers.parseEther("1"));
    });
  });
});
