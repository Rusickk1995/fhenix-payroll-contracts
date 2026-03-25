import hre from 'hardhat'
import { getMockPayoutToken, getPayroll, parseAmount, parseArgs, parseRoundId, requireInput } from './helpers'

async function main() {
	const args = parseArgs()
	const roundId = parseRoundId(args)
	const amount = parseAmount(requireInput(args, 'amount', 'AMOUNT'))

	const payroll = await getPayroll(hre)
	const payoutToken = await getMockPayoutToken(hre)

	await (await payoutToken.approve(await payroll.getAddress(), amount)).wait()
	const tx = await payroll.fundRound(roundId, amount)
	const receipt = await tx.wait()
	const [fundingStatus, isRoundOpenable] = await Promise.all([
		payroll.getRoundFundingStatus(roundId),
		payroll.isRoundOpenable(roundId),
	])
	const excessFunding = fundingStatus[0] > fundingStatus[1] ? fundingStatus[0] - fundingStatus[1] : 0n

	console.log(`Round funded`)
	console.log(`roundId=${roundId.toString()}`)
	console.log(`amount=${amount.toString()}`)
	console.log(`fundedAmount=${fundingStatus[0].toString()}`)
	console.log(`totalAllocated=${fundingStatus[1].toString()}`)
	console.log(`fundingShortfall=${fundingStatus[2].toString()}`)
	console.log(`excessFunding=${excessFunding.toString()}`)
	console.log(`isExactFunding=${fundingStatus[3]}`)
	console.log(`isRoundOpenable=${isRoundOpenable}`)
	console.log(`txHash=${receipt?.hash ?? tx.hash}`)
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
