---

````md
# ConfidentialPayroll

Privacy-by-design payroll and payout rounds MVP built with Fhenix CoFHE.

This repository contains a contract-first implementation of confidential payout rounds for teams, DAOs, grants, and contributor compensation flows. The project is built as a strong hackathon-grade MVP: it supports encrypted per-recipient allocation storage, recipient-only private allocation reads, funding-backed payouts, strict round lifecycle management, and settlement of unclaimed funds.

**Repository:** https://github.com/Rusickk1995/fhenix-payroll-contracts

---

## Overview

Traditional onchain payroll and payout systems are transparent by default. That makes them easy to audit, but often unsuitable for teams that do not want every salary, grant, or contributor reward publicly visible at configuration time.

ConfidentialPayroll takes a privacy-by-design approach:

- allocation data is configured through encrypted CoFHE-compatible inputs
- only the intended recipient can privately read their allocation
- payouts are backed by real escrow
- rounds move through a strict lifecycle
- unclaimed funds can be reclaimed only after close

This repository focuses on the smart contract and operator flow. It does not include frontend code.

---

## MVP Scope

This MVP implements:

- round creation
- per-round escrow funding
- confidential per-recipient allocation storage
- recipient-only private allocation reveal
- one-time claims
- strict round lifecycle: `Draft -> Open -> Closed`
- deadline-aware claim activity
- post-close reclaim of unclaimed funds
- operator scripts for local and testnet execution
- automated test coverage for happy paths and protected failure paths

This MVP does **not** implement:

- fully confidential settlement at claim time
- multisig admin
- governance
- pause system
- upgradeability
- vesting
- recurring payroll
- multi-token payout rounds
- frontend

---

## Privacy Model

This project is privacy-by-design, but the privacy boundary is important.

### What is confidential

- recipient allocation data is configured through the FHE path
- only the intended recipient can privately read their own allocation
- allocation values are not openly repeated in custom claim events
- selective disclosure is enforced through the recipient read path

### What is public

- round metadata
- round aggregate accounting
- round lifecycle status
- claim activity at the round level
- payout settlement amount at claim time when using the current ERC20 rail

### Important limitation

This MVP does **not** provide fully confidential settlement at claim time.

The current payout rail uses a standard ERC20 transfer. That means the payout amount becomes public when a claim is settled on-chain through the ERC20 `Transfer` event. In other words:

- allocations are confidential at rest
- allocations are privately readable by the intended recipient
- settlement is real and funding-backed
- settlement is **not** fully confidential in the current implementation

That boundary is intentional and explicit in this repository.

---

## Architecture

### Core Contracts

#### `contracts/ConfidentialPayroll.sol`

Main contract implementing:

- payout round creation
- strict lifecycle checks
- round funding
- confidential allocation configuration
- recipient-only private reads
- claim logic
- close logic
- reclaim logic for leftover funds

#### `contracts/MockPayoutToken.sol`

Mock ERC20 payout token used for local development and testnet/manual operator flow.

#### `contracts/CoFheMockImports.sol`

Mock-support import surface used for local CoFHE-compatible testing.

---

## Round Lifecycle

Each round moves through these states:

### Draft

Round exists, but is not yet active.

In this state:
- admin can fund the round
- admin can configure allocations
- round cannot be claimed yet

### Open

Round is active for recipients.

A round can open only when:
- it is still in `Draft`
- at least one allocation has been configured
- `fundedAmount == totalAllocated`

In this state:
- recipients can privately read their own allocation
- eligible recipients can claim once
- claim activity is bounded by deadline checks

### Closed

Round is finalized.

In this state:
- claims are no longer active
- admin can reclaim leftover round escrow if any remains

---

## Accounting Semantics

Each round tracks the following aggregate accounting values:

- `fundedAmount` — total escrow funded into the round
- `totalAllocated` — total configured payout amount across recipients
- `totalClaimed` — total amount already claimed
- `totalReclaimed` — total amount reclaimed by admin after close

### Invariants

The intended accounting semantics are:

- a round can only open when `fundedAmount == totalAllocated`
- claims reduce the effective escrow remainder through `totalClaimed`
- reclaim only applies after close
- reclaimable amount is derived from remaining round escrow
- after final reclaim, the expected residual round escrow is zero

---

## Repository Structure

```text
contracts/
  CoFheMockImports.sol
  ConfidentialPayroll.sol
  MockPayoutToken.sol

scripts/
  claim-round.ts
  close-round.ts
  create-round.ts
  fund-round.ts
  helpers.ts
  open-round.ts
  read-my-allocation.ts
  reclaim-round.ts
  round-summary.ts
  set-allocation.ts

tasks/
  deploy-payroll.ts
  index.ts

test/
  ConfidentialPayroll.test.ts
````

---

## Prerequisites

Recommended environment:

* Node.js 18+
* npm
* Hardhat
* Windows PowerShell or compatible shell

---

## Installation

Install dependencies:

```powershell
npm install
```

---

## Compile

```powershell
npx hardhat compile
```

Expected result:

* compile succeeds
* no contract errors
* typings updated if needed

---

## Test Suite

Run the focused payroll suite:

```powershell
npx hardhat test test\ConfidentialPayroll.test.ts
```

Expected result:

* all tests pass
* current expected suite result: `11 passing`

The suite covers:

* owner-only protections
* lifecycle enforcement
* funding semantics
* confidential recipient read path
* one-time claim enforcement
* deadline checks
* reclaim behavior
* protected invalid-path failures
* end-to-end manual-equivalent flow

---

## Localhost Validation

The project has been validated locally end to end on localhost.

### Local workflow

#### Terminal 1

```powershell
npx hardhat node
```

#### Terminal 2

Deploy:

```powershell
npx hardhat deploy-payroll --network localhost
```

Create round:

```powershell
$env:ROUND_NAME='Hackathon Round 1'
$env:ROUND_DEADLINE='1800000000'
npx hardhat run .\scripts\create-round.ts --network localhost
```

Fund round:

```powershell
$env:ROUND_ID='0'
$env:AMOUNT='400'
npx hardhat run .\scripts\fund-round.ts --network localhost
```

Set allocations:

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
$env:AMOUNT='250'
npx hardhat run .\scripts\set-allocation.ts --network localhost
```

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
$env:AMOUNT='150'
npx hardhat run .\scripts\set-allocation.ts --network localhost
```

Open round:

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\open-round.ts --network localhost
```

Recipient private read:

```powershell
$env:SIGNER_INDEX='1'
$env:ROUND_ID='0'
npx hardhat run .\scripts\read-my-allocation.ts --network localhost
```

Recipient claim:

```powershell
$env:SIGNER_INDEX='1'
$env:ROUND_ID='0'
npx hardhat run .\scripts\claim-round.ts --network localhost
```

Close round:

```powershell
Remove-Item Env:\SIGNER_INDEX -ErrorAction SilentlyContinue
$env:ROUND_ID='0'
npx hardhat run .\scripts\close-round.ts --network localhost
```

Reclaim unclaimed funds:

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\reclaim-round.ts --network localhost
```

Final summary:

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
npx hardhat run .\scripts\round-summary.ts --network localhost
```

### Local expected final state

* `status=2`
* `recipientCount=2`
* `claimedCount=1`
* `fundedAmount=400`
* `totalAllocated=400`
* `totalClaimed=250`
* `totalReclaimed=150`
* `reclaimableAmount=0`

---

## Arbitrum Sepolia Validation

The project has also been manually validated on **Arbitrum Sepolia**.

### Network

* **Network:** Arbitrum Sepolia
* **Chain ID:** `421614`

### Deployed Contracts

* **ConfidentialPayroll:** `0x7f931Ad76C0a802D8bfEeC5A472855c56a7ACf49`
* **MockPayoutToken:** `0x1511F877f6d6551d1B2DcF619666a2111aA0542e`

### Demo Test Actors

These public testnet wallets were used for the manual operator flow:

* **Admin:** `0x7657aD6B0d710428b803E2F355a86a10f9675433`
* **Recipient 1:** `0x9051e6Dc8df8814f530171081A5052d58EA417a2`
* **Recipient 2:** `0xbF20747abb97AAa7E6E147549C6Da386bB9De6E0`

### Arbitrum Sepolia Manual Flow

Set RPC and active signer:

```powershell
$env:ARBITRUM_SEPOLIA_RPC_URL='https://sepolia-rollup.arbitrum.io/rpc'
$env:PRIVATE_KEY='0xYOUR_ACTIVE_PRIVATE_KEY'
```

Deploy:

```powershell
npx hardhat deploy-payroll --network arb-sepolia
```

Create round:

```powershell
$env:ROUND_NAME='Hackathon Round 1'
$env:ROUND_DEADLINE='1800000000'
npx hardhat run .\scripts\create-round.ts --network arb-sepolia
```

Fund round:

```powershell
$env:ROUND_ID='0'
$env:AMOUNT='400'
npx hardhat run .\scripts\fund-round.ts --network arb-sepolia
```

Set allocation for recipient 1:

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0x9051e6Dc8df8814f530171081A5052d58EA417a2'
$env:AMOUNT='250'
npx hardhat run .\scripts\set-allocation.ts --network arb-sepolia
```

Set allocation for recipient 2:

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0xbF20747abb97AAa7E6E147549C6Da386bB9De6E0'
$env:AMOUNT='150'
npx hardhat run .\scripts\set-allocation.ts --network arb-sepolia
```

Open round:

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\open-round.ts --network arb-sepolia
```

Switch to recipient 1 private key, then private read:

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\read-my-allocation.ts --network arb-sepolia
```

Recipient 1 claim:

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\claim-round.ts --network arb-sepolia
```

Switch back to admin private key, then close round:

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\close-round.ts --network arb-sepolia
```

Reclaim unclaimed funds:

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\reclaim-round.ts --network arb-sepolia
```

Final summary:

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0xbF20747abb97AAa7E6E147549C6Da386bB9De6E0'
npx hardhat run .\scripts\round-summary.ts --network arb-sepolia
```

### Arbitrum Sepolia Validation Result

Validated successfully on testnet with the same end-to-end operator flow:

* deploy
* create round
* fund round
* set allocation 1
* set allocation 2
* open round
* recipient private read
* recipient claim
* close round
* reclaim
* final summary

### Final Testnet State

* `status=2`
* `recipientCount=2`
* `claimedCount=1`
* `fundedAmount=400`
* `totalAllocated=400`
* `totalClaimed=250`
* `totalReclaimed=150`
* `reclaimableAmount=0`

---

## Verified Arbitrum Sepolia Transactions

* **Deploy MockPayoutToken:** `0x06591865c49ccdf1d0111422f3ac55412aa4e40eac5c255990b3f4f849236c21`
* **Mint MockPayoutToken supply:** `0x05101a206ad8b18b2c0c3c35bf2040e273ae001317293d30eda4e0e8800fccf2`
* **Deploy ConfidentialPayroll:** `0x256b7a9cd770f1a31fc1be59f21b9bffb01544ace4a603f4c59e59372014136f`
* **Create round:** `0x761b3ca576f89443f8dfa2ef77054214d0c04fee20e342d416ca990ced8dfa0a`
* **Approve payout token:** `0x7c74e00ffbbaa2e3aa3fe6bafbbb44dde6995ef944aa156e144242cafaefecd1`
* **Fund round:** `0xce58f47bb1f41b6a93ad65e9864cce00b39840f28ca077929940b21f864b3d0b`
* **Set allocation 1:** `0x1bd4ac2ae57705145c0c1bdd144fa8b14edb28b0cb74355fc831f4ec6c4c2330`
* **Set allocation 2:** `0x52a612883d8c9c4ba67b7e7d98144e18e63e4c9e5212d0efc249fc181d4dd9f4`
* **Open round:** `0xf4c273c91fe3954d2261014c8bcc8f682c4d8ff3954bb4906e79b61d8ba41fd0`
* **Claim:** `0xe666a41a910443f364849d9531eff8ce4f181d6e8e5094287b1d2b4201ef51e3`
* **Close round:** `0x41eca1f24f7dd19887e3c3aff1ddfd3d02a679d1e78751e3b62433c219cf5d90`
* **Reclaim unclaimed funds:** `0xc06512ec62d5c35bfb6a1c8459c669d45503bf046b5e8546bb0dd7230bafe26c`

---

## Operator Scripts

### `scripts/create-round.ts`

Creates a payout round.

Inputs:

* `ROUND_NAME`
* `ROUND_DEADLINE`

### `scripts/fund-round.ts`

Funds a round escrow with the payout token.

Inputs:

* `ROUND_ID`
* `AMOUNT`

### `scripts/set-allocation.ts`

Sets one recipient allocation for a round.

Inputs:

* `ROUND_ID`
* `RECIPIENT`
* `AMOUNT`

### `scripts/open-round.ts`

Opens a round when all openability conditions are satisfied.

Inputs:

* `ROUND_ID`

### `scripts/read-my-allocation.ts`

Performs the recipient-only private read path.

Inputs:

* `ROUND_ID`
* localhost only: optional `SIGNER_INDEX`

### `scripts/claim-round.ts`

Claims a recipient payout once.

Inputs:

* `ROUND_ID`
* localhost only: optional `SIGNER_INDEX`

### `scripts/close-round.ts`

Closes the round.

Inputs:

* `ROUND_ID`

### `scripts/reclaim-round.ts`

Reclaims leftover round escrow after close.

Inputs:

* `ROUND_ID`

### `scripts/round-summary.ts`

Prints public round state and optional per-recipient status indicators.

Inputs:

* `ROUND_ID`
* optional `RECIPIENT`

---

## Failure Cases Intentionally Enforced

The project intentionally rejects:

* opening a round with no configured allocations
* opening a round unless escrow exactly matches configured total
* claiming before round open
* claiming after close
* claiming after deadline expiry
* double claim
* reclaim before close
* double reclaim
* unauthorized admin actions
* invalid allocation setup
* invalid funding paths

These are tested and expected behaviors.

---

## Known Limitations

* settlement is still executed via a standard ERC20 payout rail
* claim-time payout amount is therefore public through ERC20 transfer semantics
* this MVP does not yet include a confidential token or encrypted balance settlement primitive
* frontend is intentionally out of scope in this repository

---

## Buildathon Fit

This MVP is aligned with the core privacy-by-design buildathon thesis:

* encrypted state for recipient allocation data
* selective disclosure through recipient-only reads
* strict onchain logic around funding, lifecycle, claims, and reclaim
* privacy-first architecture for payroll and payout rounds
* validated locally and on Arbitrum Sepolia testnet

This repository should be described as:

**A privacy-by-design payout rounds MVP with confidential recipient allocation reads, exact-escrow round semantics, and real funding-backed onchain settlement.**

It should **not** be described as:

* fully confidential payroll settlement
* fully private payouts end to end
* confidential ERC20 settlement

because the current settlement rail still uses a standard ERC20 payout transfer.

---

## Current Status

Current validated status of the MVP:

* compile passes
* focused test suite passes
* localhost end-to-end flow passes
* Arbitrum Sepolia end-to-end flow passes
* exact-escrow opening semantics enforced
* recipient-only private allocation read path works
* one-time claim works
* reclaim after close works
* final state verification works

---

## Future Work

Possible next-step directions after the current MVP:

* frontend integration
* improved demo UX
* expanded explorer/documentation links
* migration to a confidential settlement rail if the required Fhenix-native asset primitive is integrated in a future version

These are intentionally out of scope for the current contract-first MVP.

---

## License

MIT

````

---