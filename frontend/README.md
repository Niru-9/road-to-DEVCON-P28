# Stepwell Frontend — The Meetup That Only Happens If We All Chip In

> An assurance contract for the Road to Devcon Indore chapter: sixty students, one hall deposit, and a rule nobody has to trust Meera on.

This frontend connects directly to the live `StepwellCampaign` contract deployed on Ethereum Sepolia (`chainId 11155111`), reading state and executing pledges, settlement collections, and pull refunds.

---

## 🎨 Visual System & Architecture

The design follows the warm, editorial aesthetic inspired by the reference design:
- **Palette**: Warm milk cream (`#FBF7F4`), oat card surfaces (`#F3ECE2`, `#EFEAE2`), muted taupe accents (`#8E8071`), and deep charcoal typography (`#1F1D1A`).
- **Hero**: Organic sweeping curves representing collective community cooperation.
- **Real-Time Data**: Live Sepolia JSON-RPC calls load on-chain state without requiring a connected wallet.

### Multi-Page Routes

| Route | Purpose | Key Capabilities |
|---|---|---|
| [`/`](file:///n:/lop1/frontend/app/page.tsx) | **Landing Page** | Hero, 3 assurance pillars, active campaign card, live 0.05 ETH Sepolia stat, FAQ accordion, and quick slide-out pledge drawer. |
| [`/campaign`](file:///n:/lop1/frontend/app/campaign/page.tsx) | **Campaign & Pledging Portal** | Detailed meetup narrative, hall deposit parameters, live funding gauge, preset ETH buttons, and Web3 `pledge()` transaction execution. |
| [`/settlement`](file:///n:/lop1/frontend/app/settlement/page.tsx) | **Settlement & Refunds** | Contract state machine engine (`Active`, `Succeeded`, `Failed`, `Collected`), pull-refund terminal for pledgers (`refund()`), and one-shot payout collector for Meera (`collect()`). |
| [`/verify`](file:///n:/lop1/frontend/app/verify/page.tsx) | **Verification & Proofs** | Live Sepolia contract readback inspector, 10 scored harness criteria breakdown (80/80 pts), and 128k-call invariant test coverage details. |

---

## 🔗 Live On-Chain Parameters

- **Network**: Sepolia (`chainId 11155111`)
- **Contract Address**: [`0x468926db1F042A7237729E1b9336352Af96aF020`](https://sepolia.etherscan.io/address/0x468926db1F042A7237729E1b9336352Af96aF020)
- **Target**: `0.05 ETH` (`50000000000000000` wei)
- **Deadline**: `1793343612` (2026-10-30 07:00:12 UTC)
- **Beneficiary (Meera)**: [`0x0d3477209913afFAF06CDe63Dd0F13f4C5728135`](https://sepolia.etherscan.io/address/0x0d3477209913afFAF06CDe63Dd0F13f4C5728135)

---

## 🚀 Running Locally

```bash
cd frontend

# Install dependencies (already installed)
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```
