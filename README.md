# Fhenix Payroll

Confidential payroll distribution on Ethereum using Fully Homomorphic Encryption (FHE). Allocation amounts are encrypted on-chain — only the designated recipient can decrypt their own payout. Everyone else sees ciphertext.

Built on [Fhenix CoFHE](https://docs.fhenix.zone/) with a Next.js frontend.

## Architecture

```
fhenix-payroll/
|
|-- contracts/                   Hardhat project (Solidity + scripts + tests)
|   |-- contracts/
|   |   |-- ConfidentialPayroll.sol   Core protocol (Ownable, FHE-integrated)
|   |   |-- MockPayoutToken.sol       Test ERC20 ("mUSD", unrestricted mint)
|   |-- scripts/                      CLI scripts for every lifecycle action
|   |-- tasks/                        Hardhat tasks (deploy-payroll)
|   |-- test/                         11 end-to-end tests
|   |-- deployments/                  Persisted addresses per network
|
|-- app/                         Next.js 16 frontend
    |-- app/                     Routes (/, /admin, /claim)
    |-- src/
        |-- config/              Network config, constants
        |-- lib/                 Contracts, chains, wagmi, utilities
        |   |-- generated/       Synced ABIs + deployment addresses
        |-- services/            Contract read/write + FHE encryption/decryption
        |-- hooks/               React Query wrappers (rounds, admin, personal status)
        |-- components/          UI primitives, layout, wallet, motion
        |-- features/            Admin (round management) + Recipient (claim)
        |-- types/               TypeScript definitions
```

## How the Protocol Works

### Lifecycle

A payroll round follows a strict state machine:

```
DRAFT ──> OPEN ──> CLOSED
  |         |         |
  |         |         |-- reclaimRoundBalance() → unclaimed funds back to owner
  |         |-- claim() → recipients withdraw payouts
  |         |-- closeRound() → stops new claims
  |-- setAllocation() → encrypt + assign per-recipient amounts
  |-- fundRound() → deposit ERC20 tokens (must match total allocated)
  |-- openRound() → enables claiming (requires exact funding)
```

### Step-by-Step

1. **Create Round** — Owner calls `createRound(name, claimDeadline)`. Gets a round ID. Status: `Draft`.

2. **Set Allocations** — Owner calls `setAllocation(roundId, recipient, encryptedAmount, payoutAmount)` for each recipient. The `encryptedAmount` is an FHE-encrypted `euint128`. The `payoutAmount` is the plaintext amount used for actual token transfers. On-chain, the contract stores both: the encrypted version (only recipient can read) and the plaintext (for claim execution). This is repeated per recipient, or batched via CSV.

3. **Fund Round** — Owner approves the payout token, then calls `fundRound(roundId, amount)`. Can be called multiple times. The round tracks `fundedAmount` and compares against `totalAllocated`.

4. **Open Round** — Owner calls `openRound(roundId)`. Requires:
   - At least one recipient configured
   - `fundedAmount == totalAllocated` (exact match)

   Status transitions to `Open`. Claims become active.

5. **Claim** — Recipients call `claim(roundId)`. The contract transfers `payoutAmount` tokens to `msg.sender`. Requires:
   - Round is `Open`
   - Before `claimDeadline` (if set, 0 = no deadline)
   - Caller has allocation and hasn't claimed yet

6. **Close Round** — Owner calls `closeRound(roundId)`. Status transitions to `Closed`. No more claims.

7. **Reclaim** — Owner calls `reclaimRoundBalance(roundId)`. Recovers `fundedAmount - totalClaimed - totalReclaimed`. Only works in `Closed` status.

## Smart Contracts

### ConfidentialPayroll.sol

The core contract. Inherits `Ownable` (OpenZeppelin). Uses `SafeERC20` for token transfers and Fhenix `FHE` library for encrypted storage.

**Owner-only functions:**

| Function | Purpose |
|----------|---------|
| `createRound(name, claimDeadline)` | Create new draft round |
| `setAllocation(roundId, recipient, encryptedAmount, payoutAmount)` | Set encrypted allocation |
| `fundRound(roundId, amount)` | Deposit payout tokens |
| `openRound(roundId)` | Transition Draft -> Open |
| `closeRound(roundId)` | Transition Open -> Closed |
| `reclaimRoundBalance(roundId)` | Withdraw unclaimed funds |

**Public functions:**

| Function | Purpose |
|----------|---------|
| `claim(roundId)` | Recipient claims their payout |

**View functions:**

| Function | Returns |
|----------|---------|
| `getMyAllocation(roundId)` | Encrypted allocation handle (`euint128`) for `msg.sender` |
| `hasAllocation(roundId, recipient)` | Whether recipient has allocation |
| `isClaimed(roundId, recipient)` | Whether recipient already claimed |
| `canClaim(roundId, recipient)` | Whether all claim conditions are met |
| `getRoundSummary(roundId)` | Full round metadata |
| `getRoundFundingStatus(roundId)` | `(fundedAmount, totalAllocated, shortfall, isExactFunding)` |
| `isRoundOpenable(roundId)` | Draft + funded + has recipients |
| `isClaimActive(roundId)` | Open + before deadline |
| `getReclaimableAmount(roundId)` | Unclaimed balance (only if Closed) |

**14 custom errors** cover every invalid state transition and input validation. **7 events** track every lifecycle action.

### MockPayoutToken.sol

Standard ERC20 with name `"Mock Payroll USD"` and symbol `"mUSD"`. Has a public `mint(to, amount)` function for testing.

## FHE (Fully Homomorphic Encryption)

### What it does

Allocation amounts are stored on-chain as encrypted `euint128` values using Fhenix CoFHE. No one — including the contract owner, block explorers, or other recipients — can read another recipient's allocation. Only the designated recipient can decrypt their own amount.

### How encryption works

**On localhost (mock FHE):**
1. Admin calls `MockZkVerifier.zkVerify(value, EUINT128_TFHE=6, issuer, 0, chainId)`
2. Returns `EncryptedInput { ctHash, securityZone, utype, signature }`
3. This is passed to `setAllocation()` as the `InEuint128` struct
4. The contract calls `FHE.asEuint128()` to store it

**On testnet (real FHE):**
1. Admin initializes `cofhejs` with wallet signer
2. Calls `cofhejs.encrypt([Encryptable.uint128(value)])`
3. Returns the same struct shape, passed to `setAllocation()`

### How decryption works

**On localhost:**
1. Recipient calls `getMyAllocation(roundId)` to get the encrypted handle
2. Calls `MockQueryDecrypter.mockQueryDecrypt(handle, 0, account)`
3. Returns `(allowed, error, decryptedAmount)`

**On testnet:**
1. Recipient initializes `cofhejs` with wallet + permit
2. Calls `cofhejs.unseal(handle, FheTypes.Uint128, account)`
3. Returns the plaintext amount

### Access control

The contract grants FHE read permission to:
- The contract itself (`FHE.allowThis()`)
- The specific recipient (`FHE.allow(amount, recipient)`)

No one else can decrypt.

## Frontend Architecture

### Stack

- **Next.js 16** (App Router, webpack mode for WASM support)
- **React 19** with client components for wallet interaction
- **TypeScript 5** (strict mode)
- **Tailwind CSS 4** with custom dark design system
- **wagmi 3 + viem 2** for blockchain interaction
- **React Query 5** for data fetching and caching
- **Framer Motion** for animations
- **cofhejs 0.3.1** for browser-side FHE operations
- **MetaMask** as the sole wallet connector

### Service Layer

| Service | Purpose |
|---------|---------|
| `payroll-service.ts` | Read-only contract queries (rounds, status, ownership) |
| `payroll-write-service.ts` | Write operations (setAllocation, fundRound, approve, mint) |
| `encryption-service.ts` | FHE encryption (MockZkVerifier for localhost, cofhejs for testnet) |
| `fhenix-service.ts` | FHE decryption (MockQueryDecrypter for localhost, cofhejs for testnet) |

### Hooks

| Hook | Purpose |
|------|---------|
| `useRounds()` | All rounds with 15s stale time |
| `useProtocolSnapshot()` | Aggregated protocol stats |
| `useMyRounds()` | Rounds where connected wallet has allocation |
| `usePersonalStatus(roundId)` | hasAllocation, claimed, canClaim for current user |
| `useIsAdmin()` | Whether connected wallet is contract owner |
| `useHydrated()` | SSR hydration guard |

### Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Landing page | Protocol overview, stats, how-it-works |
| `/admin` | RoundManagement | Full admin dashboard |
| `/claim` | AllocationCheck | Recipient payout discovery + claiming |

## User Flows

### Admin Flow

1. Connect owner wallet on `/admin`
2. **Create round** — Enter name and optional claim deadline
3. **Set allocations** — Enter recipient addresses + amounts (manual or CSV import). Each allocation triggers FHE encryption + on-chain transaction
4. **Fund round** — Check token balance, approve + deposit exact amount. Shortfall auto-calculated. On localhost: can mint test tokens
5. **Open round** — Button appears when all conditions met. If not openable, UI shows specific blockers (no allocations, funding mismatch, expired deadline)
6. **Close round** — Stops accepting claims
7. **Reclaim** — Withdraw unclaimed funds after closing

### Recipient Flow

1. Connect wallet on `/claim`
2. UI auto-discovers rounds where wallet has allocation
3. **Reveal amount** — Click "Reveal" to decrypt allocation via FHE. On localhost: mock decryption. On testnet: CoFHE permit + unseal
4. **Claim payout** — One-click claim. Transaction tracked with receipt + explorer link
5. Already-claimed rounds show success state

## Local Development

### Prerequisites

- Node.js >= 18
- pnpm or npm
- MetaMask browser extension

### Contracts

```bash
cd contracts
npm install
npx hardhat node                          # Start local Hardhat node
npx hardhat deploy-payroll --network localhost   # Deploy contracts + mock FHE infra
```

This deploys:
- TaskManager (injected at fixed address)
- ACL
- MockZkVerifier
- MockQueryDecrypter
- MockPayoutToken (mints 1,000,000 mUSD to deployer)
- ConfidentialPayroll

### CLI Scripts

All scripts accept `--key value` arguments or environment variables:

```bash
# Create a round
npx hardhat run scripts/create-round.ts --network localhost -- --name "Q1 Payroll" --deadline 0

# Set allocations (single)
npx hardhat run scripts/set-allocation.ts --network localhost -- --round-id 0 --recipient 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --amount 5000

# Set allocations (batch CSV)
npx hardhat run scripts/set-allocation.ts --network localhost -- --round-id 0 --csv allocations.csv

# Fund round
npx hardhat run scripts/fund-round.ts --network localhost -- --round-id 0 --amount 10000

# Open round
npx hardhat run scripts/open-round.ts --network localhost -- --round-id 0

# Claim (as recipient, signer-index selects Hardhat account)
npx hardhat run scripts/claim-round.ts --network localhost -- --round-id 0 --signer-index 1

# Check round status
npx hardhat run scripts/round-summary.ts --network localhost -- --round-id 0

# Read encrypted allocation
npx hardhat run scripts/read-my-allocation.ts --network localhost -- --round-id 0 --signer-index 1

# Close round
npx hardhat run scripts/close-round.ts --network localhost -- --round-id 0

# Reclaim unclaimed funds
npx hardhat run scripts/reclaim-round.ts --network localhost -- --round-id 0
```

### Frontend

```bash
cd app
npm install
npm run sync:contracts    # Copy ABIs from contracts/artifacts/ to src/lib/generated/
```

Set environment:
```bash
# .env.local
NEXT_PUBLIC_PAYROLL_NETWORK=localhost
NEXT_PUBLIC_ENABLE_LOCALHOST=true
```

```bash
npm run dev               # Starts on http://localhost:3000
```

For production build:
```bash
npm run build
npm start
```

### Running Tests

```bash
cd contracts
npx hardhat test          # 11 tests covering full lifecycle, access control, edge cases
```

## Deployment

### Localhost

Addresses stored in `contracts/deployments/localhost.json`:

| Contract | Address |
|----------|---------|
| ConfidentialPayroll | `0x36C02dA8a0983159322a80FFE9F24b1acfF8B570` |
| MockPayoutToken | `0x9d4454B023096f34B160D6B654540c56A1F81688` |
| MockQueryDecrypter | `0x0E801D84Fa97b50751Dbf25036d067dCf18858bF` |
| MockZkVerifier | `0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf` |

### Arbitrum Sepolia

Addresses stored in `contracts/deployments/arb-sepolia.json`:

| Contract | Address |
|----------|---------|
| ConfidentialPayroll | `0x7f931Ad76C0a802D8bfEeC5A472855c56a7ACf49` |
| MockPayoutToken | `0x1511F877f6d6551d1B2DcF619666a2111aA0542e` |

To deploy to Arbitrum Sepolia:
```bash
cd contracts
PRIVATE_KEY=0x... npx hardhat deploy-payroll --network arb-sepolia
```

Frontend syncs addresses from `contracts/deployments/` to `app/src/lib/generated/deployments.json` via `npm run sync:contracts`.

## Hardhat Configuration

| Network | Chain ID | RPC |
|---------|----------|-----|
| hardhat | 31337 | In-memory |
| localhost | 31337 | http://127.0.0.1:8545 |
| eth-sepolia | 11155111 | `$SEPOLIA_RPC_URL` or public node |
| arb-sepolia | 421614 | `$ARBITRUM_SEPOLIA_RPC_URL` or public node |

## Risks and Limitations

1. **Mock FHE on localhost** — Local development uses `MockZkVerifier` and `MockQueryDecrypter` which simulate FHE without actual encryption. Values are stored in plaintext mappings. This is intentional for developer experience but means localhost provides no real confidentiality.

2. **Plaintext `payoutAmount`** — The contract stores both an encrypted allocation (`euint128`) and a plaintext `payoutAmount` (`uint128`). The plaintext is used for actual token transfers in `claim()`. This means the payout amount is visible in the `setAllocation` transaction calldata. True confidentiality of the transfer amount would require FHE-native token transfers, which is outside the scope of this protocol.

3. **Single owner** — All admin operations require the contract deployer's address (Ownable). No multi-sig or role-based access control.

4. **No upgrade path** — The contract is not upgradeable. Deploying a fix requires a new contract and migrating state.

5. **No deadline extension** — Once a round is created, the claim deadline cannot be changed.

6. **No allocation removal** — Once set, an allocation cannot be deleted — only overwritten with a new amount. The recipient count only increases.

7. **Exact funding requirement** — `openRound` requires `fundedAmount == totalAllocated`. Overfunding or underfunding blocks opening. This is a safety feature but requires precise coordination between allocation setup and funding.

8. **MetaMask only** — The frontend only supports MetaMask. Other wallets (WalletConnect, Coinbase, etc.) are not configured.

9. **No event indexing** — The frontend reads all rounds sequentially via `nextRoundId` counter. At scale, this would need a subgraph or indexer.

## Future Improvements

- Multi-sig or role-based admin access
- Subgraph for event indexing and faster queries
- WalletConnect and other wallet support
- Round deadline extension
- Batch claim for recipients with allocations across multiple rounds
- FHE-native token transfers for true amount confidentiality
- Contract upgradeability (proxy pattern)
- Allocation removal / round cancellation in Draft status
