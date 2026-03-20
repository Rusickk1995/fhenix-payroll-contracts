import hre from 'hardhat'
import { decryptUint128, getPayroll, getSigner, parseArgs, parseRoundId, parseSignerIndex } from './helpers'

async function main() {
	const args = parseArgs()
	const roundId = parseRoundId(args)
	const signerIndex = parseSignerIndex(args)

	const payroll = await getPayroll(hre)
	const signer = await getSigner(hre, signerIndex)

	const [summary, hasAllocation, claimed, canClaim] = await Promise.all([
		payroll.getRoundSummary(roundId),
		payroll.hasAllocation(roundId, signer.address),
		payroll.isClaimed(roundId, signer.address),
		payroll.canClaim(roundId, signer.address),
	])

	if (!hasAllocation) {
		throw new Error(`Signer ${signer.address} has no allocation in round ${roundId.toString()}.`)
	}

	const allocationHandle = await payroll.connect(signer).getMyAllocation(roundId)
	const amount = await decryptUint128(hre, signer, allocationHandle)

	console.log(`Private allocation read`)
	console.log(`roundId=${roundId.toString()}`)
	console.log(`signerIndex=${signerIndex}`)
	console.log(`recipient=${signer.address}`)
	console.log(`roundStatus=${summary.status.toString()}`)
	console.log(`claimed=${claimed}`)
	console.log(`canClaim=${canClaim}`)
	console.log(`amount=${amount.toString()}`)
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
