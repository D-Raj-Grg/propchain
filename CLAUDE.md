# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PropChain is an NFT Property Marketplace DApp. Users mint virtual property NFTs (ERC-721), list them for sale on a decentralized marketplace with escrow, buy/sell using PROP tokens (ERC-20), and earn passive yield from owned properties. Four Solidity contracts + Next.js 14 frontend with RainbowKit/Wagmi.

## Commands

### Contracts (`contracts/`)
```bash
npm run compile              # hardhat compile
npm run test                 # hardhat test
npm run node                 # local hardhat node
npm run deploy:local         # deploy to localhost
npm run deploy:sepolia       # deploy to Sepolia testnet
```

Run a single test:
```bash
cd contracts && npx hardhat test --grep "test name pattern"
```

### Frontend (`frontend/`)
```bash
npm run dev                  # next dev on localhost:3000
npm run build                # next build
npm run lint                 # next lint
```

## Architecture

### Smart Contracts (`contracts/contracts/`)
- **PropToken.sol** — ERC-20 "PROP" with 10M initial supply + owner mint. Currency for all marketplace transactions.
- **PropertyNFT.sol** — ERC-721 "PNFT" with on-chain metadata (name, location, area, mintPrice). ERC721Enumerable for iteration. Admin-only minting.
- **PropertyMarketplace.sol** — Core logic: `listProperty`, `buyProperty`, `makeOffer` (escrow), `acceptOffer`, `cancelOffer`. 5% marketplace fee (configurable). ReentrancyGuard + Ownable. SafeERC20 for token transfers.
- **PropertyYield.sol** — Passive PROP earnings per property per second. `claimYield`, `batchClaimYield`. Mints new PROP via ownership. Only current NFT owner can claim.

Deployment order: PropToken → PropertyNFT → PropertyMarketplace → PropertyYield → transfer PROP ownership to PropertyYield.

### Frontend (`frontend/src/`)
- **`lib/contracts.ts`** — Minimal ABIs and contract addresses from env vars.
- **`lib/wagmi.ts`** — Wagmi config with RainbowKit; chain selected via `NEXT_PUBLIC_CHAIN_ID`.
- **`lib/chains.ts`** — Chain mapping + explorer URL helpers.
- **`hooks/useMarketplace.ts`** — Marketplace reads (totalSupply, fees, balances, allowances).
- **`hooks/usePropertyNFT.ts`** — User's owned NFTs with metadata (uses ERC721Enumerable).
- **`hooks/useYield.ts`** — Pending yield per property + yield rate.
- **`components/`** — `StatsDashboard`, `PropertyCard`, `MarketGrid`, `MyProperties`, `MintProperty`, `OfferModal`, `StatCard`, `ErrorBoundary`.
- **`app/page.tsx`** — Tab navigation: Marketplace, My Properties, Mint.

### Stack
- Solidity 0.8.24 / Hardhat / OpenZeppelin v5
- Next.js 14 / React 18 / TypeScript / Tailwind CSS
- Wagmi v2 / Viem v2 / RainbowKit v2 / TanStack React Query

## Environment Variables

Contracts need `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `ETHERSCAN_API_KEY` (see `contracts/.env.example`).

Frontend needs `NEXT_PUBLIC_PROP_TOKEN_ADDRESS`, `NEXT_PUBLIC_PROPERTY_NFT_ADDRESS`, `NEXT_PUBLIC_MARKETPLACE_ADDRESS`, `NEXT_PUBLIC_PROPERTY_YIELD_ADDRESS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_CHAIN_ID` (see `frontend/.env.local.example`).
