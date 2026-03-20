import hre from 'hardhat'
import { getPayroll, parseArgs, requireInput } from './helpers'

async function main() {
	const args = parseArgs()
	const name = requireInput(args, 'name', 'ROUND_NAME')
	const deadline = BigInt(requireInput(args, 'deadline', 'ROUND_DEADLINE'))

	const payroll = await getPayroll(hre)
	const roundId = await payroll.createRound.staticCall(name, deadline)
	const tx = await payroll.createRound(name, deadline)
	const receipt = await tx.wait()

	console.log(`Round created`)
	console.log(`roundId=${roundId.toString()}`)
	console.log(`name=${name}`)
	console.log(`deadline=${deadline.toString()}`)
	console.log(`txHash=${receipt?.hash ?? tx.hash}`)
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
