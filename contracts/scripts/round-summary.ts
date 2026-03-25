import hre from 'hardhat'
import { getPayroll, getOptionalInput, parseArgs, parseRoundId } from './helpers'

async function main() {
	const args = parseArgs()
	const roundId = parseRoundId(args)
	const recipient = getOptionalInput(args, 'recipient', 'RECIPIENT')

	const payroll = await getPayroll(hre)
	const [summary, fundingStatus, reclaimableAmount, claimActive, isRoundOpenable, payoutAsset] = await Promise.all([
		payroll.getRoundSummary(roundId),
		payroll.getRoundFundingStatus(roundId),
		payroll.getReclaimableAmount(roundId),
		payroll.isClaimActive(roundId),
		payroll.isRoundOpenable(roundId),
		payroll.payoutAsset(),
	])
	const escrowRemainder =
		summary.fundedAmount > summary.totalClaimed + summary.totalReclaimed
			? summary.fundedAmount - summary.totalClaimed - summary.totalReclaimed
			: 0n
	const excessFunding =
		summary.fundedAmount > summary.totalAllocated ? summary.fundedAmount - summary.totalAllocated : 0n

	console.log(`Round summary`)
	console.log(`roundId=${roundId.toString()}`)
	console.log(`name=${summary.name}`)
	console.log(`claimDeadline=${summary.claimDeadline.toString()}`)
	console.log(`status=${summary.status.toString()}`)
	console.log(`recipientCount=${summary.recipientCount.toString()}`)
	console.log(`claimedCount=${summary.claimedCount.toString()}`)
	console.log(`fundedAmount=${summary.fundedAmount.toString()}`)
	console.log(`totalAllocated=${summary.totalAllocated.toString()}`)
	console.log(`totalClaimed=${summary.totalClaimed.toString()}`)
	console.log(`totalReclaimed=${summary.totalReclaimed.toString()}`)
	console.log(`fundingShortfall=${fundingStatus[2].toString()}`)
	console.log(`excessFunding=${excessFunding.toString()}`)
	console.log(`isExactFunding=${fundingStatus[3]}`)
	console.log(`isRoundOpenable=${isRoundOpenable}`)
	console.log(`claimActive=${claimActive}`)
	console.log(`escrowRemainder=${escrowRemainder.toString()}`)
	console.log(`reclaimableAmount=${reclaimableAmount.toString()}`)
	console.log(`payoutAsset=${payoutAsset}`)

	if (recipient) {
		const [hasAllocation, claimed, canClaim] = await Promise.all([
			payroll.hasAllocation(roundId, recipient),
			payroll.isClaimed(roundId, recipient),
			payroll.canClaim(roundId, recipient),
		])

		console.log(`recipient=${recipient}`)
		console.log(`hasAllocation=${hasAllocation}`)
		console.log(`claimed=${claimed}`)
		console.log(`canClaim=${canClaim}`)
	}
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
