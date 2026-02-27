# PropChain — NFT Property Marketplace

![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)
![Hardhat](https://img.shields.io/badge/Hardhat-2.22-f0d000?logo=hardhat)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-v5-4E5EE4?logo=openzeppelin)
![Wagmi](https://img.shields.io/badge/Wagmi-v2-1C1B1F)
![RainbowKit](https://img.shields.io/badge/RainbowKit-v2-7B3FE4)
![License](https://img.shields.io/badge/License-MIT-green)

A decentralized marketplace for virtual property NFTs with escrow-based trading and passive yield earnings, built on Ethereum.

> **Live Demo:** [propchain-marketplace.vercel.app](https://propchain-marketplace.vercel.app/)

---

## Features

- **Property NFTs (ERC-721)** — Mint virtual properties with on-chain metadata (name, location, area)
- **Marketplace with Escrow** — List properties for sale, buy directly, or make escrow-backed offers
- **Custom Currency (PROP)** — All transactions use the PROP ERC-20 token
- **Passive Yield** — Property owners earn PROP tokens over time, claimable per-property or in batch
- **5% Marketplace Fee** — Configurable fee on every sale, collected to a designated address
- **Full Security** — ReentrancyGuard, Ownable access control, SafeERC20 transfers

## Deployed Contracts (Sepolia)

| Contract | Address |
|---|---|
| **PropToken** (ERC-20) | [`0x5fb379720B34f3d2d5C54Ac6644C84972Ef702ca`](https://sepolia.etherscan.io/address/0x5fb379720B34f3d2d5C54Ac6644C84972Ef702ca) |
| **PropertyNFT** (ERC-721) | [`0xdfFC2E373c6E5d51783f62F0b1124EEa052a276A`](https://sepolia.etherscan.io/address/0xdfFC2E373c6E5d51783f62F0b1124EEa052a276A) |
| **PropertyMarketplace** | [`0x7EA151ec169123b8c8804696bc218697009a92b1`](https://sepolia.etherscan.io/address/0x7EA151ec169123b8c8804696bc218697009a92b1) |
| **PropertyYield** | [`0x6e0A0Da2C0f29e503981da5C960BFEc8c95697c8`](https://sepolia.etherscan.io/address/0x6e0A0Da2C0f29e503981da5C960BFEc8c95697c8) |

## Architecture

```
                    ┌─────────────────┐
                    │   PropToken     │  ERC-20 "PROP" (10M supply)
                    │   (Currency)    │  Ownership → PropertyYield (mints rewards)
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  PropertyNFT    │ │  Marketplace    │ │  PropertyYield  │
│  (ERC-721)      │ │  (Trading)      │ │  (Rewards)      │
│                 │ │                 │ │                 │
│  • mintProperty │ │  • listProperty │ │  • registerProp │
│  • on-chain URI │ │  • buyProperty  │ │  • pendingYield │
│  • Enumerable   │ │  • makeOffer    │ │  • claimYield   │
│                 │ │  • acceptOffer  │ │  • batchClaim   │
│                 │ │  • cancelOffer  │ │  • yieldRate    │
└─────────────────┘ │  • delistProp   │ └─────────────────┘
                    │  • 5% fee       │
                    └─────────────────┘
```

## Smart Contracts

| Contract | Description |
|---|---|
| `PropToken.sol` | ERC-20 "PROP" currency token (10M initial supply) |
| `PropertyNFT.sol` | ERC-721 property NFTs with on-chain metadata |
| `PropertyMarketplace.sol` | Listing, buying, escrow offers with fee system |
| `PropertyYield.sol` | Passive PROP earnings for property holders |

## Tech Stack

- **Contracts:** Solidity 0.8.24, Hardhat, OpenZeppelin v5
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Web3:** Wagmi v2, Viem v2, RainbowKit v2, TanStack React Query

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask or any WalletConnect-compatible wallet

### Contracts

```bash
cd contracts
npm install
npm run compile
npm run test            # 48 tests
npm run node            # start local node
npm run deploy:local    # deploy to localhost
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in contract addresses from deploy output
npm run dev
```

### Deploy to Sepolia

```bash
cd contracts
cp .env.example .env
# Fill in SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
npm run deploy:sepolia
```

### Seed Demo Data

After deploying, populate the marketplace with demo properties:

```bash
# Set contract addresses (from deploy output) in your .env or export them
npm run seed:sepolia
```

This mints 6 properties, registers them for yield, and lists 4 on the marketplace.

## User Flow

1. **Admin mints** property NFTs (name, location, area)
2. **Owner lists** a property on the marketplace with a PROP price
3. **Buyer** either buys directly or makes an escrow offer
4. **Seller accepts** offer — NFT transfers atomically, PROP distributed (minus 5% fee)
5. **Owner earns** passive PROP yield over time from held properties
6. **Owner claims** accumulated yield anytime

## Test Coverage

```
PropChain
  PropToken (2 tests)
  PropertyNFT — Minting (6 tests)
  Marketplace — Listings (6 tests)
  Marketplace — Direct Buy (3 tests)
  Marketplace — Escrow Offers (7 tests)
  Marketplace — Fees & Admin (5 tests)
  Security — Reentrancy (2 tests)
  PropertyYield (9 tests)
  Access Control (5 tests)
  Integration — Full Flow (2 tests)

48 passing
```

## Screenshots

| Marketplace | My Properties |
|---|---|
| Browse & buy listed properties | Manage portfolio, list/delist, claim yield |

## License

MIT
