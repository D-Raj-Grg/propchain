# PropChain — NFT Property Marketplace

A decentralized marketplace for virtual property NFTs with escrow-based trading and passive yield earnings, built on Ethereum.

## Features

- **Property NFTs (ERC-721)** — Mint virtual properties with on-chain metadata (name, location, area)
- **Marketplace with Escrow** — List properties for sale, buy directly, or make escrow-backed offers
- **Custom Currency (PROP)** — All transactions use the PROP ERC-20 token
- **Passive Yield** — Property owners earn PROP tokens over time, claimable per-property or in batch
- **5% Marketplace Fee** — Configurable fee on every sale, collected to a designated address
- **Full Security** — ReentrancyGuard, Ownable access control, SafeERC20 transfers

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
npm run test            # 46 tests
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
  PropertyYield (9 tests)
  Access Control (5 tests)
  Integration — Full Flow (2 tests)

46 passing
```

## License

MIT
