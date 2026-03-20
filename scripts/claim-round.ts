import hre from 'hardhat'
import { getMockPayoutToken, getPayroll, getSigner, parseArgs, parseRoundId, parseSignerIndex } from './helpers'

async function main() {
	const args = parseArgs()
	const roundId = parseRoundId(args)
	const signerIndex = parseSignerIndex(args)

	const payroll = await getPayroll(hre)
	const payoutToken = await getMockPayoutToken(hre)
	const signer = await getSigner(hre, signerIndex)

	const balanceBefore = await payoutToken.balanceOf(signer.address)
	const tx = await payroll.connect(signer).claim(roundId)
	const receipt = await tx.wait()
	const balanceAfter = await payoutToken.balanceOf(signer.address)

	console.log(`Payout claimed`)
	console.log(`roundId=${roundId.toString()}`)
	console.log(`signerIndex=${signerIndex}`)
	console.log(`recipient=${signer.address}`)
	console.log(`balanceChanged=${balanceAfter > balanceBefore}`)
	console.log(`txHash=${receipt?.hash ?? tx.hash}`)
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
