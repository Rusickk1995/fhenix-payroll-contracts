// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {FHE, InEuint128, euint128} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract ConfidentialPayroll is Ownable {
    using SafeERC20 for IERC20;

    enum RoundStatus {
        Draft,
        Open,
        Closed
    }

    struct RoundSummary {
        string name;
        uint64 claimDeadline;
        RoundStatus status;
        uint32 recipientCount;
        uint32 claimedCount;
        uint256 fundedAmount;
        uint256 totalAllocated;
        uint256 totalClaimed;
        uint256 totalReclaimed;
    }

    error RoundNotFound(uint256 roundId);
    error RoundNotDraft(uint256 roundId);
    error RoundNotOpen(uint256 roundId);
    error RoundNotClosed(uint256 roundId);
    error NoAllocationsConfigured(uint256 roundId);
    error RoundFundingMismatch(uint256 roundId, uint256 fundedAmount, uint256 totalAllocated);
    error InvalidPayoutAsset(address payoutAsset);
    error InvalidRecipient(address recipient);
    error InvalidAllocationAmount(uint256 roundId, address recipient, uint256 amount);
    error InvalidFundingAmount(uint256 roundId, uint256 amount);
    error AllocationMissing(uint256 roundId, address recipient);
    error AllocationAlreadyClaimed(uint256 roundId, address recipient);
    error ClaimWindowClosed(uint256 roundId, uint64 claimDeadline);
    error NoReclaimableBalance(uint256 roundId);

    uint256 public nextRoundId;
    IERC20 public immutable payoutAsset;

    mapping(uint256 roundId => RoundSummary summary) private _rounds;
    mapping(uint256 roundId => mapping(address recipient => AllocationRecord allocation)) private _allocations;

    event RoundCreated(uint256 indexed roundId, string name, uint64 claimDeadline);
    event RoundFunded(uint256 indexed roundId, uint256 amount, uint256 fundedAmount);
    event RoundOpened(uint256 indexed roundId);
    event RoundClosed(uint256 indexed roundId);
    event RoundSettled(uint256 indexed roundId, uint256 amount, uint256 totalReclaimed);
    event AllocationConfigured(uint256 indexed roundId, address indexed recipient, bool isUpdate);
    event PayoutClaimed(uint256 indexed roundId, address indexed recipient);

    struct AllocationRecord {
        euint128 amount;
        uint128 payoutAmount;
        bool isConfigured;
        bool isClaimed;
    }

    constructor(address initialOwner, IERC20 payoutAsset_) Ownable(initialOwner) {
        if (address(payoutAsset_) == address(0)) {
            revert InvalidPayoutAsset(address(0));
        }

        payoutAsset = payoutAsset_;
    }

    function createRound(string calldata name, uint64 claimDeadline) external onlyOwner returns (uint256 roundId) {
        roundId = nextRoundId;
        nextRoundId = roundId + 1;

        _rounds[roundId] = RoundSummary({
            name: name,
            claimDeadline: claimDeadline,
            status: RoundStatus.Draft,
            recipientCount: 0,
            claimedCount: 0,
            fundedAmount: 0,
            totalAllocated: 0,
            totalClaimed: 0,
            totalReclaimed: 0
        });

        emit RoundCreated(roundId, name, claimDeadline);
    }

    function openRound(uint256 roundId) external onlyOwner {
        RoundSummary storage round = _requireRound(roundId);
        if (round.status != RoundStatus.Draft) {
            revert RoundNotDraft(roundId);
        }
        if (round.recipientCount == 0) {
            revert NoAllocationsConfigured(roundId);
        }
        if (round.fundedAmount != round.totalAllocated) {
            revert RoundFundingMismatch(roundId, round.fundedAmount, round.totalAllocated);
        }

        round.status = RoundStatus.Open;
        emit RoundOpened(roundId);
    }

    function closeRound(uint256 roundId) external onlyOwner {
        RoundSummary storage round = _requireRound(roundId);
        if (round.status != RoundStatus.Open) {
            revert RoundNotOpen(roundId);
        }

        round.status = RoundStatus.Closed;
        emit RoundClosed(roundId);
    }

    function fundRound(uint256 roundId, uint256 amount) external onlyOwner {
        RoundSummary storage round = _requireRound(roundId);
        if (round.status != RoundStatus.Draft) {
            revert RoundNotDraft(roundId);
        }
        if (amount == 0) {
            revert InvalidFundingAmount(roundId, amount);
        }

        payoutAsset.safeTransferFrom(msg.sender, address(this), amount);
        round.fundedAmount += amount;

        emit RoundFunded(roundId, amount, round.fundedAmount);
    }

    function setAllocation(
        uint256 roundId,
        address recipient,
        InEuint128 calldata encryptedAmount,
        uint128 payoutAmount
    ) external onlyOwner {
        if (recipient == address(0)) {
            revert InvalidRecipient(recipient);
        }
        if (payoutAmount == 0) {
            revert InvalidAllocationAmount(roundId, recipient, payoutAmount);
        }

        RoundSummary storage round = _requireRound(roundId);
        if (round.status != RoundStatus.Draft) {
            revert RoundNotDraft(roundId);
        }

        AllocationRecord storage record = _allocations[roundId][recipient];
        bool isUpdate = record.isConfigured;
        uint128 previousPayoutAmount = record.payoutAmount;
        uint256 nextTotalAllocated = round.totalAllocated - previousPayoutAmount + payoutAmount;

        record.amount = FHE.asEuint128(encryptedAmount);
        record.payoutAmount = payoutAmount;
        record.isConfigured = true;
        record.isClaimed = false;

        FHE.allowThis(record.amount);
        FHE.allow(record.amount, recipient);

        if (!isUpdate) {
            round.recipientCount += 1;
        }

        round.totalAllocated = nextTotalAllocated;

        emit AllocationConfigured(roundId, recipient, isUpdate);
    }

    function getMyAllocation(uint256 roundId) external view returns (euint128) {
        _requireRound(roundId);

        AllocationRecord storage record = _allocations[roundId][msg.sender];
        if (!record.isConfigured) {
            revert AllocationMissing(roundId, msg.sender);
        }

        return record.amount;
    }

    function hasAllocation(uint256 roundId, address recipient) external view returns (bool) {
        _requireRound(roundId);
        return _allocations[roundId][recipient].isConfigured;
    }

    function isClaimed(uint256 roundId, address recipient) external view returns (bool) {
        _requireRound(roundId);
        return _allocations[roundId][recipient].isClaimed;
    }

    function claim(uint256 roundId) external {
        RoundSummary storage round = _requireRound(roundId);
        if (round.status != RoundStatus.Open) {
            revert RoundNotOpen(roundId);
        }
        if (!_isBeforeClaimDeadline(round)) {
            revert ClaimWindowClosed(roundId, round.claimDeadline);
        }

        AllocationRecord storage record = _allocations[roundId][msg.sender];
        if (!record.isConfigured) {
            revert AllocationMissing(roundId, msg.sender);
        }
        if (record.isClaimed) {
            revert AllocationAlreadyClaimed(roundId, msg.sender);
        }

        uint256 payoutAmount = record.payoutAmount;

        record.isClaimed = true;
        round.claimedCount += 1;
        round.totalClaimed += payoutAmount;

        payoutAsset.safeTransfer(msg.sender, payoutAmount);

        emit PayoutClaimed(roundId, msg.sender);
    }

    function reclaimRoundBalance(uint256 roundId) external onlyOwner returns (uint256 amount) {
        RoundSummary storage round = _requireRound(roundId);
        if (round.status != RoundStatus.Closed) {
            revert RoundNotClosed(roundId);
        }

        amount = _getReclaimableAmount(round);
        if (amount == 0) {
            revert NoReclaimableBalance(roundId);
        }

        round.totalReclaimed += amount;
        payoutAsset.safeTransfer(owner(), amount);

        emit RoundSettled(roundId, amount, round.totalReclaimed);
    }

    function getRoundSummary(uint256 roundId) external view returns (RoundSummary memory summary) {
        _requireRound(roundId);
        return _rounds[roundId];
    }

    function getRoundFundingStatus(
        uint256 roundId
    ) external view returns (uint256 fundedAmount, uint256 totalAllocated, uint256 fundingShortfall, bool isExactFunding) {
        RoundSummary storage round = _requireRound(roundId);
        fundedAmount = round.fundedAmount;
        totalAllocated = round.totalAllocated;
        fundingShortfall = fundedAmount >= totalAllocated ? 0 : totalAllocated - fundedAmount;
        isExactFunding = round.recipientCount != 0 && fundedAmount == totalAllocated;
    }

    function isRoundOpenable(uint256 roundId) external view returns (bool) {
        RoundSummary storage round = _requireRound(roundId);
        return round.status == RoundStatus.Draft && round.recipientCount != 0 && round.fundedAmount == round.totalAllocated;
    }

    function isClaimActive(uint256 roundId) external view returns (bool) {
        RoundSummary storage round = _requireRound(roundId);
        return round.status == RoundStatus.Open && _isBeforeClaimDeadline(round);
    }

    function canClaim(uint256 roundId, address recipient) external view returns (bool) {
        RoundSummary storage round = _requireRound(roundId);
        AllocationRecord storage record = _allocations[roundId][recipient];
        return round.status == RoundStatus.Open && _isBeforeClaimDeadline(round) && record.isConfigured && !record.isClaimed;
    }

    function getReclaimableAmount(uint256 roundId) external view returns (uint256) {
        RoundSummary storage round = _requireRound(roundId);
        return round.status == RoundStatus.Closed ? _getReclaimableAmount(round) : 0;
    }

    function _requireRound(uint256 roundId) internal view returns (RoundSummary storage round) {
        if (roundId >= nextRoundId) {
            revert RoundNotFound(roundId);
        }

        return _rounds[roundId];
    }

    function _isBeforeClaimDeadline(RoundSummary storage round) internal view returns (bool) {
        return round.claimDeadline == 0 || block.timestamp <= round.claimDeadline;
    }

    function _getReclaimableAmount(RoundSummary storage round) internal view returns (uint256) {
        return round.fundedAmount - round.totalClaimed - round.totalReclaimed;
    }
}
