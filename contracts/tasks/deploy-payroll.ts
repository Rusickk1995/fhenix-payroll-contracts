import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'
import { bootstrapLocalCofheIfNeeded } from '../scripts/helpers'

task('deploy-payroll', 'Deploy the ConfidentialPayroll contract to the selected network').setAction(
	async (_, hre: HardhatRuntimeEnvironment) => {
		const { ethers, network } = hre

		console.log(`Deploying ConfidentialPayroll to ${network.name}...`)

		const [deployer] = await ethers.getSigners()
		console.log(`Deploying with account: ${deployer.address}`)

		await bootstrapLocalCofheIfNeeded(hre)

		const MockPayoutToken = await ethers.getContractFactory('MockPayoutToken')
		const payoutToken = await MockPayoutToken.deploy()
		await payoutToken.waitForDeployment()

		const payoutTokenAddress = await payoutToken.getAddress()
		console.log(`MockPayoutToken deployed to: ${payoutTokenAddress}`)
		await (await payoutToken.mint(deployer.address, 1_000_000n)).wait()
		console.log(`Minted demo payout supply to deployer: ${deployer.address}`)

		const ConfidentialPayroll = await ethers.getContractFactory('ConfidentialPayroll')
		const payroll = await ConfidentialPayroll.deploy(deployer.address, payoutTokenAddress)
		await payroll.waitForDeployment()

		const payrollAddress = await payroll.getAddress()
		console.log(`ConfidentialPayroll deployed to: ${payrollAddress}`)

		saveDeployment(network.name, 'MockPayoutToken', payoutTokenAddress)
		saveDeployment(network.name, 'ConfidentialPayroll', payrollAddress)

		return payrollAddress
	},
)
