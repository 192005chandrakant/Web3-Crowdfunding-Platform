
# Response to Reviewer Comments

## Scope and Evidence Policy

We thank the reviewers for identifying a gap between the motivation of the platform and the strength of the evidence currently reported. This response distinguishes three things:

- **Implemented:** behavior present in the current source code and covered by an existing test.
- **Partially implemented:** a design element exists, but an important enforcement, measurement, or reproducibility piece is missing.
- **Future scope:** a change that is not claimed as a result of the current prototype.

The current implementation has been inspected in the repository, including [Campaign.sol](../blockchain/contracts/Campaign.sol), [Campaign.js](../blockchain/test/Campaign.js), [quadraticVotingService.js](../backend/src/services/quadraticVotingService.js), and the backend access-control routes. We will revise the manuscript so that it reports only evidence that can be reproduced from source, test output, transaction receipts, or public deployment records.

## Reviewer 1

### Evaluation size and reproducibility

The reviewers are correct that eight campaigns and thirty transactions are not sufficient to support broad performance or security claims. The current repository contains a five-test contract suite covering factory deployment, contribution/QV calculation, proof submission, vote/tranche release, and cancellation/refunds. The suite does not itself establish eight campaigns or thirty transactions, and the service benchmark prints timings without persisting a result file.

The revised evaluation will therefore report the eight-campaign/thirty-transaction numbers only if they can be reconstructed from transaction receipts, database records, or an archived run manifest. Otherwise, those numbers will be removed or explicitly labeled as an informal development run. The reproducibility package will contain:

1. commit hash, Node/npm versions, Solidity compiler version, Hardhat version, and operating system;
2. Ganache startup command, RPC URL, chain ID, account-role map, and deployment output;
3. implementation and factory addresses, ABI/artifact hashes, and all campaign addresses;
4. per-transaction hash, block number, status, gas used, gas price, fee, wall-clock submission time, confirmation time, and action label;
5. test output and machine-readable JSON/CSV results;
6. exact commands for contract tests, backend smoke tests, integration benchmarks, and adversarial tests.

The existing [benchmark-services.js](../backend/benchmark-services.js) is useful for backend/IPFS/service latency, but it currently writes only to stdout. It should be extended with a timestamped JSON result file and a run identifier. Its network-service measurements must be reported separately from blockchain confirmation latency.

### Security claims

The current code supports narrower claims than the original manuscript:

- `nonReentrant` is applied to contribution, tranche execution, and refund paths.
- The payout path marks milestone and balance state before the external value transfer.
- Refunds are pull-based and calculated pro rata.
- Solidity 0.8 arithmetic checks and custom errors are used.
- A caller can vote once per milestone, and a minimum cumulative contribution is required.

These are implementation observations, not proof of complete security. The current test suite does **not** contain dedicated reentrancy, flash-loan, gas-exhaustion, malicious-recipient, fuzz, invariant, or property-based tests. We will replace broad wording such as “resistant to reentrancy, flash loans, and gas exhaustion” with “contains the following mitigations” until those tests and an independent audit exist.

The flash-loan claim requires particular correction. The contract records `contributionCheckpointBlock`, but `submitMilestoneProof` does not store a proof block and `voteOnMilestone` does not compare the checkpoint with a stored snapshot block. `snapshotTotalQVWeight` is currently `sqrt(totalFundsRaised)`, an approximation, not a per-wallet snapshot. A future security revision must store a snapshot block (or a snapshot contribution mapping) and enforce it on-chain. A same-block or funded-then-voted test should be included before claiming flash-loan resistance.

### Quadratic voting and address splitting

The reviewers correctly identify a Sybil weakness. The contract uses cumulative per-address voting power:

`floor(sqrt(contribution[wallet]))`

This reduces the marginal influence of a single large contribution, but it does not make a person the unit of account. If a donor divides the same total across `n` wallets, the aggregate influence can approach:

`n * sqrt(total / n) = sqrt(n * total)`

which is greater than `sqrt(total)` for `n > 1`. The minimum contribution only limits very small addresses; it does not solve address splitting. The backend `verifySybilResistance` is permissive on testnet, accepts unknown wallets, sets the Gitcoin minimum score to zero, and fails open on check errors. Therefore the current system must not claim Sybil resistance or trustless identity enforcement.

The revised paper will:

- define the voting unit as a wallet/address, not a verified person;
- compare linear voting, one-wallet-one-vote, and square-root weighting;
- include a controlled address-splitting experiment with equal total capital;
- report the trade-off between whale suppression and Sybil exposure;
- describe World ID/Gitcoin Passport as optional backend signals in the current prototype;
- reserve person-bound voting, identity attestations, or a non-transferable identity credential for future work.

### Threshold and quorum definition

The current contract has a `0.001 POL` minimum cumulative contribution. Approval is determined by `approvalQVWeight > rejectionQVWeight`; there is no quorum requirement based on all eligible voting power, and the stored snapshot total is not used in release authorization. Thus the protocol is a majority of cast QV weight, not “50% approval of total snapshot weight.”

The manuscript will state this precisely. A future protocol revision may add a quorum such as `castQV / eligibleSnapshotQV >= q`, but the value of `q` must be justified with sensitivity tests. We will vary the minimum contribution and quorum candidates in the evaluation rather than presenting 50% as a validated universal threshold.

### Graduated failure resolution and oracle dependence

The current contract implements creator-triggered cancellation and proportional refunds. It does not implement three consecutive failed votes, an escalation ladder, a graduated resolution mechanism, or an oracle/arbitration panel. The `deadline` field is stored but is not used by the current release or cancellation logic.

The revised manuscript will align the protocol description with this implementation: evidence is submitted to IPFS, donors vote on the active milestone, a successful majority permits the tranche, and creator cancellation enables pull-based pro-rata refunds. Any oracle, moderator panel, dispute escalation, or graduated failure policy will be described as future scope unless it is implemented and tested.

### KYC, off-chain metadata, and the trustless claim

Creator campaign creation through the backend requires SIWE authentication, a database creator role, and matching creator address. Admin routes can update verification state. However, `Campaign.initialize` accepts a creator address and does not query or verify a KYC registry, and direct smart-contract interaction can bypass the backend. Donor Sybil checks are also backend-only and permissive on testnet. IPFS proof availability depends on Pinata/gateway infrastructure, while campaign metadata is cached in MongoDB.

Accordingly, the platform is best described as **non-custodial escrow with on-chain fund accounting and off-chain identity/metadata services**, not fully trustless crowdfunding. Future work should bind creator eligibility to an auditable on-chain attestation or allowlisted registry, define revocation and expiry, and make the trust assumptions explicit.

## Reviewer 2

### Why 50% approval and three failures?

The current code does not implement “three consecutive failures.” It also does not use a 50% quorum over the snapshot population. It requires approval QV weight to be strictly greater than rejection QV weight among votes cast. The manuscript and tables will be corrected to avoid attributing an absent rule to the implementation.

For the next evaluation, the protocol configuration should be parameterized and tested across minimum contribution values, majority/quorum thresholds, voter turnout, donor concentration, and numbers of consecutive rejected milestones. If deadline-based failure handling is added, the test matrix should include zero, one, two, and three failures and verify cancellation/refund behavior.

### Performance and capacity

No gas-cost table or statistically reported end-to-end latency is currently committed in the repository. The contract tests can be extended to record `receipt.gasUsed` for deployment, campaign creation, contribution, proof submission, voting, tranche execution, cancellation, and refund. The application benchmark should record p50/p95 latency over repeated runs for API, MongoDB, Redis, IPFS, and blockchain RPC operations.

Capacity should be reported as tested capacity, not an architectural promise. We will vary donors per campaign and milestone count, observe transaction success and gas growth, and report the tested range. In particular, the current `submitMilestoneProof` loops over every milestone, and the design cannot claim unbounded milestone scalability. The current contract does not loop over all donors for snapshot calculation, but accurate per-donor snapshot aggregation is not stored on-chain.

### KYC centralization and identity roadmap

KYC is currently a database/admin workflow represented by `verificationStatus`, `verificationProvider`, and optional World ID/Gitcoin fields. It is not a smart-contract gate. This creates provider dependence, admin trust, privacy exposure, account recovery questions, and an availability single point of failure. The revised limitations section will state these risks.

The roadmap is to issue a revocable, non-transferable identity/eligibility attestation after an external provider or World ID verification, have the contract check the attestation issuer and expiry, and support revocation without placing personal data on-chain. This remains future work and will not be presented as an existing soulbound-token implementation.

### Tables

Duplicate Table III sections will be merged. The revised table should have one row per mechanism with consistent columns: mechanism, on-chain enforcement, off-chain dependency, current test evidence, limitation, and status. In particular, “snapshot voting,” “Sybil resistance,” “KYC,” “failure resolution,” and “security testing” must not be marked as complete when the repository only contains partial support.

### Single-token restriction

The current contract accepts native currency through `contribute()` and does not implement ERC-20 token selection, token decimals, exchange-rate normalization, or multi-token accounting. The paper will state that the prototype is single-asset/native-token only. Multi-token support requires an explicit token registry, `SafeERC20`, per-token accounting and refund pools, decimal normalization, approval/allowance flows, and a policy for voting power across assets.

## Reviewer 3

### Experimental evidence consistency

The repository currently provides a five-case contract test suite and backend integration/benchmark scripts, but no committed run manifest proving eight campaigns and thirty transactions. The revised paper will separate source-level tests, informal manual runs, and systematic experiments. Amoy results will be reported only when transaction hashes and logs are archived; otherwise they will be labeled as unlogged exploratory testing.

### Security evidence

The revised security section will report the implemented controls and the missing adversarial evidence. Reentrancy protection is present on fund-moving functions, but no malicious callback test is present. Flash-loan resistance is not enforced by the current snapshot code. Gas-exhaustion behavior has not been systematically measured. These items become explicit test and audit work, not claims of demonstrated resistance.

### Failure resolution alignment

The implementation currently supports creator cancellation followed by proportional, pull-based refunds. It does not implement the described graduated mechanism. The paper, diagrams, supplementary material, and UI terminology must be changed to match this behavior until a graduated policy is actually added.

### Direct-contract KYC bypass

The reviewer is correct: backend KYC and role checks do not constrain direct calls to the deployed contracts. Current wording will say that backend onboarding gates the primary application flow, while the contract remains permissionless with respect to creator initialization and contributions. A future KYC-gated factory or attestation verifier is required for enforceable on-chain creator eligibility.

### Final protocol statement

The corrected protocol claim is:

> The prototype provides native-token escrow, IPFS-linked milestone evidence, cumulative square-root voting per wallet, majority-by-cast-QV tranche approval, creator cancellation, and pro-rata pull refunds. Identity, metadata, indexing, and current Sybil checks include off-chain dependencies; the prototype does not yet provide person-level Sybil resistance, a quorum snapshot, graduated failure arbitration, multi-token accounting, or an independent security audit.

This narrower statement is faithful to the source and gives the evaluation a defensible boundary.

## Revision and Evidence Commitments

Before resubmission, we will:

1. correct all protocol descriptions and merge duplicate tables;
2. add gas, latency, capacity, threshold-sensitivity, linear-vs-QV, and address-splitting results;
3. add explicit adversarial and boundary tests, or mark the item as unverified;
4. archive a clean Ganache run with deployment and transaction manifests;
5. document the difference between local Ganache, Polygon Amoy, and Polygon mainnet;
6. treat PolygonScan verification and a public contract address as deployment evidence, not as a substitute for testing or audit evidence.
