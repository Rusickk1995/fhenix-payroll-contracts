---

# Готовый README.md

Скопируй **целиком**:

````md
# ConfidentialPayroll

Privacy-by-design payroll and payout rounds MVP built on Fhenix CoFHE.

This repository contains a contract-first implementation of confidential payout rounds for teams, DAOs, grants, and contributor compensation flows. The project is designed as a strong hackathon-grade MVP: it provides encrypted per-recipient allocation storage, recipient-only private allocation reads, funding-backed payouts, strict round lifecycle management, and settlement of unclaimed funds.

---

## Overview

Traditional onchain payroll and payout systems are transparent by default. That makes them easy to audit, but often unusable for teams that do not want every salary, grant, or contributor reward publicly visible at configuration time.

ConfidentialPayroll takes a privacy-by-design approach:

- allocation data is configured through encrypted CoFHE-compatible inputs
- only the intended recipient can privately read their allocation
- payouts are backed by real round escrow
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
- operator scripts for local/manual execution
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

- recipient allocation data is stored through the FHE path
- only the intended recipient can privately read their own allocation
- allocation values are not openly emitted in custom claim events
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

Mock ERC20 payout token used for local development and manual operator flow.

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

## Operator Flow

The intended manual flow is:

1. deploy contracts
2. create round
3. fund round
4. configure allocations
5. open round
6. recipient privately reads allocation
7. recipient claims
8. admin closes round
9. admin reclaims leftover funds
10. operator verifies final round summary

This flow is validated both manually and in automated tests.

---

## Repository Structure

```text
contracts/
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

  deployments/
    ...local deployment outputs, ignored in git
````

---

## Prerequisites

Recommended environment:

* Node.js 18+
* npm
* Hardhat
* Windows PowerShell or compatible shell
* local dev environment already configured for this repository

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

## Local Development Workflow

### Terminal 1 — start local Hardhat node

```powershell
npx hardhat node
```

Keep this terminal open.

### Terminal 2 — deploy contracts

```powershell
npx hardhat deploy-payroll --network localhost
```

Expected deployment includes:

* local CoFHE mock setup
* `MockPayoutToken`
* `ConfidentialPayroll`

---

## Manual End-to-End Flow

### 1. Create round

```powershell
$env:ROUND_NAME='Hackathon Round 1'
$env:ROUND_DEADLINE='1800000000'
npx hardhat run .\scripts\create-round.ts --network localhost
```

### 2. Fund round

```powershell
$env:ROUND_ID='0'
$env:AMOUNT='400'
npx hardhat run .\scripts\fund-round.ts --network localhost
```

### 3. Configure recipient allocations

Recipient 1:

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
$env:AMOUNT='250'
npx hardhat run .\scripts\set-allocation.ts --network localhost
```

Recipient 2:

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
$env:AMOUNT='150'
npx hardhat run .\scripts\set-allocation.ts --network localhost
```

### 4. Open round

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\open-round.ts --network localhost
```

### 5. Recipient privately reads allocation

Signer index `1` corresponds to `0x7099...79C8` in local Hardhat accounts.

```powershell
$env:ROUND_ID='0'
$env:SIGNER_INDEX='1'
npx hardhat run .\scripts\read-my-allocation.ts --network localhost
```

Expected result:

* `allowed=true`
* correct allocation revealed only for that recipient

### 6. Recipient claims

```powershell
$env:ROUND_ID='0'
$env:SIGNER_INDEX='1'
npx hardhat run .\scripts\claim-round.ts --network localhost
```

Expected result:

* claim succeeds
* payout is executed
* script confirms balance changed

### 7. Close round

```powershell
Remove-Item Env:\SIGNER_INDEX
$env:ROUND_ID='0'
npx hardhat run .\scripts\close-round.ts --network localhost
```

### 8. Reclaim unclaimed funds

```powershell
$env:ROUND_ID='0'
npx hardhat run .\scripts\reclaim-round.ts --network localhost
```

### 9. Final summary

```powershell
$env:ROUND_ID='0'
$env:RECIPIENT='0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
npx hardhat run .\scripts\round-summary.ts --network localhost
```

Expected final sample state:

* `status=2`
* `recipientCount=2`
* `claimedCount=1`
* `fundedAmount=400`
* `totalAllocated=400`
* `totalClaimed=250`
* `totalReclaimed=150`
* `reclaimableAmount=0`

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
* `SIGNER_INDEX`

### `scripts/claim-round.ts`

Claims a recipient payout once.

Inputs:

* `ROUND_ID`
* `SIGNER_INDEX`

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

## Current Status

Current local status of the MVP:

* compile passes
* focused test suite passes
* manual localhost flow passes end to end
* exact-escrow opening semantics enforced
* recipient-only private allocation read path works
* one-time claim works
* reclaim after close works
* final state verification works

---

## Testnet Migration

The next engineering step after local validation is migration from localhost to a supported testnet flow such as:

* Arbitrum Sepolia
* Ethereum Sepolia
* Base Sepolia

That migration should preserve:

* current contract semantics
* current operator flow
* current privacy model
* current accounting guarantees

---

## Honest Technical Positioning

This repository should be described as:

**A privacy-by-design payout rounds MVP with confidential recipient allocation reads, exact-escrow round semantics, and real funding-backed onchain settlement.**

It should **not** be described as:

* fully confidential payroll settlement
* fully private payouts end to end
* confidential ERC20 settlement

because the current settlement rail still uses a standard ERC20 payout transfer.

---

## Future Work

Possible next-step directions after the current MVP:

* testnet deployment flow for Arbitrum Sepolia
* frontend integration
* improved demo UX
* migration to a confidential settlement rail if the required Fhenix-native asset primitive is integrated in a future version

These are intentionally out of scope for the current contract-first MVP.

---

## License

MIT

````

---

# 4. Сохранить файл

В VS Code просто `Ctrl + S`

Если хочешь без VS Code, можно через PowerShell, но для большого README удобнее руками в редакторе.

---

# 5. Проверить файл

```powershell
Get-Content README.md
````

или открыть:

```powershell
code README.md
```

---
