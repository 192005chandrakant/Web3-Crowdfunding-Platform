// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Campaign is ReentrancyGuard {
    enum CampaignState { Active, Paused, Successful, Cancelled }

    struct Milestone {
        uint256 targetAmount;
        uint256 deadline;
        uint256 approvalVotes;
        uint256 rejectionVotes;
        bool isCurrent;
        bool isPaid;
        string title;
        string ipfsProofHash;
    }

    error AlreadyInitialized();
    error NotCreator();
    error NotContributor();
    error InvalidState();
    error InvalidContribution();
    error InvalidMilestone();
    error MilestoneNotActive();
    error MilestoneAlreadyPaid();
    error AlreadyVoted();
    error SnapshotUnavailable();
    error InsufficientApprovals();
    error NothingToRefund();
    error TransferFailed();
    error ArrayLengthMismatch();

    bool private _initialized;
    
    CampaignState public state;
    address public creator;
    address public hospitalAddress;
    
    uint256 public fundraisingGoal;
    uint256 public totalFundsRaised;
    uint256 public totalFundsRemaining;
    uint256 public refundPool;

    Milestone[] public milestones;
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public contributionCheckpointBlock;
    mapping(address => bool) public voterCheckIns;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => uint256) public milestoneSnapshotBlock;
    mapping(uint256 => uint256) public milestoneSnapshotTotalWeight;

    event CampaignInitialized(address indexed creator, uint256 goal);
    event ContributionReceived(address indexed contributor, uint256 amount);
    event MilestoneProofSubmitted(uint256 indexed milestoneIndex, string cid);
    event MilestoneVoted(uint256 indexed milestoneIndex, address indexed voter, bool support, uint256 weight);
    event TrancheExecuted(uint256 indexed milestoneIndex, address indexed recipient, uint256 amount);
    event RefundClaimed(address indexed contributor, uint256 amount);
    event CampaignStateChanged(CampaignState newState);

    modifier onlyCreator() {
        if (msg.sender != creator) revert NotCreator();
        _;
    }

    modifier inState(CampaignState _state) {
        if (state != _state) revert InvalidState();
        _;
    }

    function initialize(
        address creator_,
        uint256 goal_,
        address hospitalAddress_,
        string[] memory titles,
        uint256[] memory targetAmounts,
        uint256[] memory deadlines
    ) external {
        if (_initialized) revert AlreadyInitialized();
        if (titles.length != targetAmounts.length || titles.length != deadlines.length) {
            revert ArrayLengthMismatch();
        }

        _initialized = true;
        creator = creator_;
        fundraisingGoal = goal_;
        hospitalAddress = hospitalAddress_;
        state = CampaignState.Active;

        for (uint256 i = 0; i < titles.length; i++) {
            milestones.push(
                Milestone({
                    targetAmount: targetAmounts[i],
                    deadline: deadlines[i],
                    approvalVotes: 0,
                    rejectionVotes: 0,
                    isCurrent: false,
                    isPaid: false,
                    title: titles[i],
                    ipfsProofHash: ""
                })
            );
        }

        emit CampaignInitialized(creator_, goal_);
    }

    function contribute() external payable nonReentrant inState(CampaignState.Active) {
        if (msg.value == 0) revert InvalidContribution();

        contributions[msg.sender] += msg.value;
        contributionCheckpointBlock[msg.sender] = block.number;
        totalFundsRaised += msg.value;
        totalFundsRemaining += msg.value;

        emit ContributionReceived(msg.sender, msg.value);
    }

    function submitMilestoneProof(uint256 index, string memory _cid) external onlyCreator inState(CampaignState.Active) {
        if (index >= milestones.length) revert InvalidMilestone();

        for (uint256 i = 0; i < milestones.length; i++) {
            milestones[i].isCurrent = false;
        }

        Milestone storage milestone = milestones[index];
        milestone.ipfsProofHash = _cid;
        milestone.isCurrent = true;
        milestoneSnapshotBlock[index] = block.number;
        milestoneSnapshotTotalWeight[index] = totalFundsRaised;

        emit MilestoneProofSubmitted(index, _cid);
    }

    function voteOnMilestone(uint256 index, bool support) external inState(CampaignState.Active) {
        if (index >= milestones.length) revert InvalidMilestone();

        Milestone storage milestone = milestones[index];
        if (!milestone.isCurrent) revert MilestoneNotActive();
        if (contributions[msg.sender] == 0) revert NotContributor();
        if (hasVoted[index][msg.sender]) revert AlreadyVoted();
        if (contributionCheckpointBlock[msg.sender] > milestoneSnapshotBlock[index]) revert SnapshotUnavailable();

        uint256 weight = contributions[msg.sender];
        hasVoted[index][msg.sender] = true;
        voterCheckIns[msg.sender] = true;

        if (support) {
            milestone.approvalVotes += weight;
        } else {
            milestone.rejectionVotes += weight;
        }

        emit MilestoneVoted(index, msg.sender, support, weight);
    }

    function executeTranche(uint256 index) external nonReentrant inState(CampaignState.Active) {
        if (index >= milestones.length) revert InvalidMilestone();

        Milestone storage milestone = milestones[index];
        if (!milestone.isCurrent) revert MilestoneNotActive();
        if (milestone.isPaid) revert MilestoneAlreadyPaid();

        uint256 snapshotWeight = milestoneSnapshotTotalWeight[index];
        if (snapshotWeight == 0 || milestone.approvalVotes * 2 <= snapshotWeight) revert InsufficientApprovals();

        uint256 payout = milestone.targetAmount;
        if (payout > totalFundsRemaining) {
            payout = totalFundsRemaining;
        }

        if (payout == 0) revert NothingToRefund();

        address recipient = hospitalAddress == address(0) ? creator : hospitalAddress;

        milestone.isPaid = true;
        milestone.isCurrent = false;
        totalFundsRemaining -= payout;

        bool allPaid = true;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].isPaid) {
                allPaid = false;
                break;
            }
        }
        if (allPaid) {
            state = CampaignState.Successful;
            emit CampaignStateChanged(state);
        }

        (bool success, ) = payable(recipient).call{value: payout}("");
        if (!success) revert TransferFailed();

        emit TrancheExecuted(index, recipient, payout);
    }

    function cancelCampaign() external {
        if (msg.sender != creator) revert NotCreator();
        if (state != CampaignState.Active && state != CampaignState.Paused) revert InvalidState();
        
        state = CampaignState.Cancelled;
        refundPool = totalFundsRemaining; 
        emit CampaignStateChanged(state);
    }

    function claimRefund() external nonReentrant inState(CampaignState.Cancelled) {
        uint256 contribution = contributions[msg.sender];
        if (contribution == 0 || totalFundsRaised == 0 || refundPool == 0) revert NothingToRefund();

        uint256 refundAmount = (contribution * refundPool) / totalFundsRaised;
        if (refundAmount == 0) revert NothingToRefund();

        contributions[msg.sender] = 0;
        totalFundsRemaining -= refundAmount;

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!success) revert TransferFailed();

        emit RefundClaimed(msg.sender, refundAmount);
    }

    function milestoneCount() external view returns (uint256) {
        return milestones.length;
    }
}