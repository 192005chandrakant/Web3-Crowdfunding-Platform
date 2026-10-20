# System Implementation Analysis

## Purpose

This document records what the repository actually implements as of the current code state. It is intentionally based on source and executable checks rather than design documents. It is also the working plan for recreating the missing evidence before the paper is revised.

## Current Architecture

The system has three active layers:

1. **Solidity/Hardhat:** `CampaignFactory` deploys campaign clones; `Campaign` holds native-token funds, stores milestones and IPFS CIDs, records votes, releases tranches, cancels campaigns, and pays pro-rata refunds.
2. **Express/MongoDB services:** the backend caches campaign metadata and donation/event information, exposes authenticated role workflows, calculates display QV statistics, uploads proof files through Pinata, and integrates optional identity/service providers.
3. **React/wagmi frontend:** wallet transactions are sent to the configured chain; voting UI reads backend eligibility/stats and falls back to contract voter status; proof links are opened through IPFS gateways.

The backend and frontend improve usability and indexing, but the contract is the authority for balances, contribution totals, vote tallies, tranche release, cancellation, and refunds. Backend records must not be presented as canonical financial state.

## What Is Implemented

### Escrow and milestone release

- Contributions accumulate in `contributions`, `totalFundsRaised`, and `totalFundsRemaining`.
- `executeTranche` requires an active milestone and approval QV weight strictly greater than rejection QV weight.
- State and balances are updated before the external transfer, and fund-moving paths use `nonReentrant`.
- A successful campaign is reached only after every milestone is paid.

### Evidence storage

- A creator can submit a string CID to the current milestone.
- The backend can pin proof files through Pinata.
- The frontend exposes the CID through an IPFS gateway link.

This provides content-addressed evidence linkage, but not permanent availability, authenticity of the real-world claim, or an independent oracle decision.

### Voting

- A voter needs cumulative contributions of at least `0.001 POL`.
- A wallet can vote once per milestone.
- Weight is `floor(sqrt(total contribution in wei))`.
- The current release decision is a strict majority of cast approval versus rejection QV weight.
- The frontend/backend show QV power and eligibility information.

The five existing contract tests pass on Hardhat's in-process network. The same configured Ganache command currently cannot run when Ganache is absent: `npm test` targets `127.0.0.1:7545` and failed with `0 passing, 5 failing` due to `ECONNREFUSED`. This is an environment failure, not evidence that the assertions failed. The backend smoke checks passed.

### Refunds

Creator cancellation changes the campaign to `Cancelled` and sets `refundPool` to remaining funds. Contributors claim refunds themselves, and the amount is proportional to their recorded contribution. Existing tests verify the complete cancellation/refund path for two donors.

### Backend identity and roles

- SIWE authentication and database roles protect the main backend creator workflow.
- Creator and moderator roles require the configured admin workflow.
- Verification metadata includes status/provider and optional World ID/Gitcoin fields.
- Notifications and audit records are created for administrative verification actions.

These controls protect the application workflow, not arbitrary direct contract calls.

## Partial or Misleadingly Named Features

### Snapshot voting

`submitMilestoneProof` stores `sqrt(totalFundsRaised)` as `snapshotTotalQVWeight`. It does not calculate the sum of eligible wallet weights, store a proof block, or freeze each wallet's contribution at proof time. `contributionCheckpointBlock` is updated on contribution but is not compared against a stored snapshot block in `voteOnMilestone`. A donor can therefore contribute after proof submission and vote with the new cumulative balance, provided the threshold is met.

### Sybil resistance

The backend service has a verification hook, but testnet behavior is intentionally permissive: unknown wallets are allowed, the Gitcoin threshold is zero, unverified wallets are allowed, and errors fail open. The contract has no identity check. Address splitting remains a direct attack on square-root-per-address voting.

### KYC enforcement

KYC status is stored in MongoDB and can be updated through admin routes. The contract initializer has no verifier, attestation, allowlist, or KYC status input. Direct contract callers can therefore bypass backend KYC. The accurate description is “backend onboarding KYC metadata,” not “on-chain KYC enforcement.”

### Failure handling

The contract supports creator cancellation and proportional refunds. It does not implement consecutive-failure counters, deadline-triggered resolution, graduated escalation, an oracle, or an arbitration panel. Milestone deadlines are stored but are not used by the current state machine.

### Quorum

The stored snapshot field is not used to require voter turnout. A single eligible voter can approve a milestone if its approval weight exceeds zero and there is no rejection weight. This is cast-vote majority, not quorum-based governance.

### Asset model

Only the native chain currency is supported. There is no ERC-20 transfer/allowance path and no multi-token accounting.

## Security and Scalability Assessment

### Present controls

- Solidity checked arithmetic.
- Custom errors for many failure paths.
- Reentrancy guard on contribution, tranche execution, and refunds.
- Checks-effects-interactions ordering on payouts/refunds.
- Pull-based refunds instead of a loop over all donors.
- Factory clone pattern for campaign deployment.

### Evidence still missing

- malicious recipient reentrancy test;
- same-block/funded-then-voted snapshot test;
- address-splitting comparison against linear voting;
- fuzz/invariant tests for accounting and refunds;
- gas measurements across milestone and donor counts;
- large-array and deadline boundary tests;
- static analysis, symbolic analysis, and independent audit report.

`submitMilestoneProof` loops over all milestones to deactivate them, so milestone count can affect gas. Accurate donor-wide QV snapshots would introduce a donor loop unless redesigned around an indexer or Merkle/attestation model. Capacity claims must therefore be experimentally bounded.

## Current Evidence Inventory

| Evidence source | What it demonstrates | What it does not demonstrate |
|---|---|---|
| `blockchain/test/Campaign.js` | Five basic contract scenarios | Security, load, gas, quorum, Sybil, or flash-loan resistance |
| `backend/scripts/smoke.js` | Backend syntax/import and one campaign update invariant | Live database, IPFS, identity, or blockchain behavior |
| `backend/test-services.js` | Optional live service integration checks | Persisted reproducible timing dataset; results are console output |
| `backend/benchmark-services.js` | One-run service latency measurements | Blockchain gas/confirmation, statistical performance, or capacity |
| Ganache workflow | Local end-to-end environment when running | Polygon/Amoy/mainnet behavior or public deployment proof |
| Existing docs | Intended architecture and runbook | Proof that every stated feature is implemented |

The repository search found no committed benchmark CSV/JSON, transaction manifest, or test log outside dependency/build metadata. Existing commands print useful output, but the output is not currently archived by the project.

## Evidence Recreation Plan

### Phase 1: Freeze the environment

Record:

- Git commit hash and dirty-tree status;
- OS, Node, npm, Hardhat, Solidity compiler, and package-lock versions;
- Ganache version, startup command, RPC port, chain ID, and deterministic seed/accounts;
- backend/frontend environment variable names with secrets redacted;
- contract bytecode and ABI hashes.

Use one documented local profile. The repository supports standard Ganache (`1337`, port `7545`) and a local chain using Amoy's ID (`80002`, port `8545`). The latter has the same numeric chain ID as Amoy but is still a private local chain. It is not Polygon Amoy and it is not Polygon mainnet.

### Phase 2: Deploy and capture

Run compile, deploy the implementation and factory, and save deployment output as JSON containing network name, chain ID, deployer, implementation address, factory address, block numbers, transaction hashes, and gas receipts. Create campaigns with one, three, ten, and a deliberately larger milestone count. Record all addresses and initialization inputs.

### Phase 3: Recreate functional scenarios

For each scenario, record a row in `evidence/transactions.csv` and a structured scenario result in `evidence/scenarios.json`:

1. create campaign;
2. one donor contributes;
3. multiple donations by one wallet verify cumulative QV;
4. proof submission and IPFS CID retrieval;
5. approve/reject vote combinations and exact QV weights;
6. successful tranche release to creator and hospital recipient;
7. creator cancellation and every donor's refund;
8. duplicate vote, below-threshold vote, non-creator proof/cancel, invalid milestone, and double-refund failures.

For each transaction capture `txHash`, `blockNumber`, `status`, `gasUsed`, `effectiveGasPrice`, fee, RPC submission time, receipt time, and expected result. Do not count a transaction as successful solely because the UI displayed success.

### Phase 4: Quantitative evaluation

Run repeated measurements, not one-off values:

- gas: at least 30 repetitions per action where practical, report median and p95;
- latency: separate wallet signing, RPC submission, block inclusion, receipt confirmation, backend API, database, Redis, and IPFS time;
- donors: vary 1, 5, 10, 25, 50, and the maximum affordable test set;
- milestones: vary 1, 3, 10, 25, and the point at which gas approaches the configured block limit;
- thresholds: compare 0.001 POL and candidate production thresholds;
- voting: compare linear weight, square-root weight, one-wallet-one-vote, turnout/quorum candidates, and donor concentration;
- Sybil: hold total capital constant while dividing it across 1, 2, 5, 10, and 20 wallets.

Save raw rows, not only aggregate tables, so the manuscript can be regenerated.

### Phase 5: Security evidence

Add a dedicated test file for:

- a recipient contract attempting reentry during payout/refund;
- contribution immediately before and after proof submission;
- duplicate and cross-milestone voting;
- zero-value and below-threshold contributions;
- refund conservation and repeated claims;
- extreme milestone arrays and gas estimates;
- malicious or unavailable IPFS links as an availability limitation;
- direct contract creation by an unverified address to demonstrate the current KYC boundary.

Run static analyzers and document tool versions, findings, suppressions, and unresolved issues. Do not turn passing unit tests into an audit claim.

## Ganache to Polygon Deployment Path

Ganache is appropriate for deterministic local development and repeatable contract tests. It is not a deployment substitute. The recommended progression is:

1. **Local Ganache:** run the complete functional and adversarial suite; capture all artifacts.
2. **Polygon Amoy:** deploy with the `polygon_amoy` Hardhat profile, verify contracts on Amoy PolygonScan, rerun the same scenario matrix with test POL, and publish addresses/transactions.
3. **Polygon mainnet:** only after review/audit, operational key controls, gas review, monitoring, and a deliberate migration of frontend/backend RPC configuration.

The deploy script writes the factory address and target chain ID to `frontend/.env` for local convenience. For a public default, the application must instead use a committed configuration strategy that selects the verified Polygon deployment by chain ID and keeps local Ganache settings as an explicit development profile. PolygonScan verification makes source code inspectable; it does not prove safety or replace the evidence plan.

## Recommended Near-Term Scope

Given a tight deadline, the highest-value changes are:

1. correct manuscript and supplementary claims to match current behavior;
2. archive a clean Ganache run and create machine-readable evidence files;
3. add gas/latency receipt capture and the address-splitting/linear-voting experiment;
4. add focused regression tests for snapshot timing, refunds, reentrancy, and unauthorized direct calls;
5. add a clear configuration flag that distinguishes local Ganache, Amoy, and mainnet;
6. keep graduated arbitration, person-bound identity, multi-token accounting, and production audit as future scope unless they can be implemented and tested before submission.

## Future Scope

- On-chain identity attestations with issuer, expiry, and revocation checks.
- Person-level Sybil resistance and privacy-preserving credentials.
- True contribution snapshots using a stored block/epoch or an auditable off-chain snapshot proof.
- Explicit quorum and parameter governance with sensitivity evidence.
- Graduated failure resolution with transparent arbitration and appeal rules.
- ERC-20 and multi-token contributions with decimal normalization and per-token refund pools.
- Event indexing with reorg handling and reconciliation against contract state.
- Formal verification, fuzzing, independent audit, monitoring, emergency controls, and multisig ownership.
- Public Polygon deployment with verified addresses and reproducible Amoy/mainnet evidence.
