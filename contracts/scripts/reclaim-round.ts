import hre from 'hardhat'
import { getMockPayoutToken, getPayroll, parseArgs, parseRoundId } from './helpers'

async function main() {
	const args = parseArgs()
	const roundId = parseRoundId(args)

	const payroll = await getPayroll(hre)
	const payoutToken = await getMockPayoutToken(hre)
	const ownerAddress = await payroll.owner()
	const amount = await payroll.getReclaimableAmount(roundId)
	const balanceBefore = await payoutToken.balanceOf(ownerAddress)
	const tx = await payroll.reclaimRoundBalance(roundId)
	const receipt = await tx.wait()
	const balanceAfter = await payoutToken.balanceOf(ownerAddress)

	console.log(`Round reclaimed`)
	console.log(`roundId=${roundId.toString()}`)
	console.log(`owner=${ownerAddress}`)
	console.log(`reclaimedAmount=${amount.toString()}`)
	console.log(`ownerBalanceDelta=${(balanceAfter - balanceBefore).toString()}`)
	console.log(`txHash=${receipt?.hash ?? tx.hash}`)
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
