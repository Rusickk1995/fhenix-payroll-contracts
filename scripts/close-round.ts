import hre from 'hardhat'
import { getPayroll, parseArgs, parseRoundId } from './helpers'

async function main() {
	const args = parseArgs()
	const roundId = parseRoundId(args)

	const payroll = await getPayroll(hre)
	const tx = await payroll.closeRound(roundId)
	const receipt = await tx.wait()

	console.log(`Round closed`)
	console.log(`roundId=${roundId.toString()}`)
	console.log(`txHash=${receipt?.hash ?? tx.hash}`)
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
