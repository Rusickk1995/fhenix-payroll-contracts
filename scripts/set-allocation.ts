import hre from 'hardhat'
import {
	encryptUint128,
	getMockZkVerifier,
	getOptionalInput,
	getPayroll,
	loadAllocationsFromCsv,
	parseAmount,
	parseArgs,
	parseRoundId,
	requireInput,
} from './helpers'

async function main() {
	const args = parseArgs()
	const roundId = parseRoundId(args)
	const payroll = await getPayroll(hre)
	const verifier = await getMockZkVerifier(hre)
	const [signer] = await hre.ethers.getSigners()

	const csvPath = getOptionalInput(args, 'csv', 'ALLOCATIONS_CSV')
	const recipient = getOptionalInput(args, 'recipient', 'RECIPIENT')
	const amount = getOptionalInput(args, 'amount', 'AMOUNT')

	const rows =
		csvPath !== undefined
			? loadAllocationsFromCsv(csvPath)
			: [
					{
						recipient: requireInput(args, 'recipient', 'RECIPIENT'),
						amount: parseAmount(requireInput(args, 'amount', 'AMOUNT')),
					},
			  ]

	for (const row of rows) {
		if (!hre.ethers.isAddress(row.recipient)) {
			throw new Error(`Invalid recipient address: ${row.recipient}`)
		}

		const encryptedAmount = await encryptUint128(hre, verifier, row.amount, signer.address)
		const tx = await payroll.setAllocation(roundId, row.recipient, encryptedAmount, row.amount)
		const receipt = await tx.wait()

		console.log(`Allocation set`)
		console.log(`roundId=${roundId.toString()}`)
		console.log(`recipient=${row.recipient}`)
		console.log(`amount=${row.amount.toString()}`)
		console.log(`txHash=${receipt?.hash ?? tx.hash}`)
	}

	if (csvPath !== undefined) {
		console.log(`Imported ${rows.length} allocation(s) from ${csvPath}`)
	} else {
		console.log(`Single allocation complete for ${recipient} amount ${amount}`)
	}
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
