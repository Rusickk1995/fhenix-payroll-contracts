import fs from 'fs'
import path from 'path'
import { isAddress } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getDeployment, saveDeployment } from '../tasks/utils'

export const TASK_MANAGER_ADDRESS = '0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9'
export const EUINT128_TFHE = 6

type CliArgs = Record<string, string | boolean>

type AllocationRow = {
	recipient: string
	amount: bigint
}

export const parseArgs = (argv: string[] = process.argv.slice(2)): CliArgs => {
	const args: CliArgs = {}

	for (let i = 0; i < argv.length; i += 1) {
		const token = argv[i]
		if (!token.startsWith('--')) {
			continue
		}

		const key = token.slice(2)
		const next = argv[i + 1]
		if (!next || next.startsWith('--')) {
			args[key] = true
			continue
		}

		args[key] = next
		i += 1
	}

	return args
}

export const requireArg = (args: CliArgs, key: string): string => {
	const value = args[key]
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`Missing required argument --${key}`)
	}

	return value
}

export const getOptionalArg = (args: CliArgs, key: string): string | undefined => {
	const value = args[key]
	return typeof value === 'string' ? value : undefined
}

export const requireInput = (args: CliArgs, key: string, envKey: string): string => {
	const value = getOptionalArg(args, key) ?? process.env[envKey]
	if (!value) {
		throw new Error(`Missing required input. Provide --${key} or set $env:${envKey}.`)
	}

	return value
}

export const getOptionalInput = (args: CliArgs, key: string, envKey: string): string | undefined => {
	return getOptionalArg(args, key) ?? process.env[envKey]
}

export const parseRoundId = (args: CliArgs): bigint => {
	return BigInt(requireInput(args, 'round-id', 'ROUND_ID'))
}

export const parseSignerIndex = (args: CliArgs): number => {
	const rawIndex = getOptionalInput(args, 'signer-index', 'SIGNER_INDEX') ?? '0'
	if (!/^\d+$/.test(rawIndex)) {
		throw new Error(`Invalid signer index "${rawIndex}". Use a zero-based integer.`)
	}

	return Number(rawIndex)
}

export const parseAmount = (rawAmount: string): bigint => {
	const normalized = rawAmount.trim()
	if (!/^\d+$/.test(normalized)) {
		throw new Error(`Invalid amount "${rawAmount}". Use an integer base-unit amount.`)
	}

	return BigInt(normalized)
}

export const getPayroll = async (runtime: HardhatRuntimeEnvironment) => {
	const payrollAddress = getDeployment(runtime.network.name, 'ConfidentialPayroll')
	if (!payrollAddress) {
		throw new Error(`Missing ConfidentialPayroll deployment for network ${runtime.network.name}. Run deploy-payroll first.`)
	}

	return runtime.ethers.getContractAt('ConfidentialPayroll', payrollAddress)
}

export const getMockPayoutToken = async (runtime: HardhatRuntimeEnvironment) => {
	const payoutTokenAddress = getDeployment(runtime.network.name, 'MockPayoutToken')
	if (!payoutTokenAddress) {
		throw new Error(`Missing MockPayoutToken deployment for network ${runtime.network.name}. Run deploy-payroll first.`)
	}

	return runtime.ethers.getContractAt('MockPayoutToken', payoutTokenAddress)
}

export const getSigner = async (runtime: HardhatRuntimeEnvironment, signerIndex: number) => {
	const signers = await runtime.ethers.getSigners()
	const signer = signers[signerIndex]
	if (!signer) {
		throw new Error(`Missing signer at index ${signerIndex}.`)
	}

	return signer
}

export const getMockZkVerifier = async (runtime: HardhatRuntimeEnvironment) => {
	const verifierAddress = getDeployment(runtime.network.name, 'MockZkVerifier')
	if (!verifierAddress) {
		throw new Error(`Missing MockZkVerifier deployment for network ${runtime.network.name}. Run deploy-payroll first.`)
	}

	return runtime.ethers.getContractAt('MockZkVerifier', verifierAddress)
}

export const getMockQueryDecrypter = async (runtime: HardhatRuntimeEnvironment) => {
	const decrypterAddress = getDeployment(runtime.network.name, 'MockQueryDecrypter')
	if (!decrypterAddress) {
		throw new Error(
			`Missing MockQueryDecrypter deployment for network ${runtime.network.name}. Run deploy-payroll first.`,
		)
	}

	return runtime.ethers.getContractAt('MockQueryDecrypter', decrypterAddress)
}

export const normalizeEncryptedInput = (encryptedInput: {
	ctHash: bigint
	securityZone: number
	utype: number
	signature: string
}) => {
	return {
		ctHash: encryptedInput.ctHash,
		securityZone: encryptedInput.securityZone,
		utype: encryptedInput.utype,
		signature: encryptedInput.signature,
	}
}

export const encryptUint128 = async (
	runtime: HardhatRuntimeEnvironment,
	verifier: any,
	value: bigint,
	issuer: string,
) => {
	const network = await runtime.ethers.provider.getNetwork()
	const encryptedInput = await verifier.zkVerify.staticCall(value, EUINT128_TFHE, issuer, 0, network.chainId)
	await (await verifier.zkVerify(value, EUINT128_TFHE, issuer, 0, network.chainId)).wait()
	return normalizeEncryptedInput(encryptedInput)
}

export const loadAllocationsFromCsv = (csvPath: string): AllocationRow[] => {
	const absolutePath = path.resolve(process.cwd(), csvPath)
	if (!fs.existsSync(absolutePath)) {
		throw new Error(`Allocation CSV not found: ${absolutePath}`)
	}

	const raw = fs.readFileSync(absolutePath, 'utf8')
	const lines = raw
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(line => line.length > 0)

	if (lines.length === 0) {
		throw new Error(`Allocation CSV is empty: ${absolutePath}`)
	}

	const rows = lines[0].toLowerCase().startsWith('recipient,') ? lines.slice(1) : lines
	return rows.map((line, index) => {
		const [recipientRaw, amountRaw] = line.split(',').map(value => value.trim())
		if (!recipientRaw || !amountRaw) {
			throw new Error(`Invalid CSV row ${index + 1}: "${line}"`)
		}
		if (!isAddress(recipientRaw)) {
			throw new Error(`Invalid recipient address in CSV row ${index + 1}: ${recipientRaw}`)
		}

		return {
			recipient: recipientRaw,
			amount: parseAmount(amountRaw),
		}
	})
}

export const bootstrapLocalCofheIfNeeded = async (runtime: HardhatRuntimeEnvironment) => {
	if (runtime.network.name !== 'localhost' && runtime.network.name !== 'hardhat') {
		return
	}

	console.log('Bootstrapping local CoFHE mocks...')

	const [deployer] = await runtime.ethers.getSigners()
	const taskManagerArtifact = await runtime.artifacts.readArtifact('TaskManager')

	await runtime.network.provider.send('hardhat_setCode', [TASK_MANAGER_ADDRESS, taskManagerArtifact.deployedBytecode])

	const taskManager = await runtime.ethers.getContractAt('TaskManager', TASK_MANAGER_ADDRESS)
	await (await taskManager.initialize(deployer.address)).wait()
	await (await taskManager.setLogOps(false)).wait()

	const ACL = await runtime.ethers.getContractFactory('ACL')
	const acl = await ACL.deploy(deployer.address)
	await acl.waitForDeployment()
	await (await taskManager.setACLContract(await acl.getAddress())).wait()

	const MockZkVerifier = await runtime.ethers.getContractFactory('MockZkVerifier')
	const verifier = await MockZkVerifier.deploy()
	await verifier.waitForDeployment()

	const MockQueryDecrypter = await runtime.ethers.getContractFactory('MockQueryDecrypter')
	const queryDecrypter = await MockQueryDecrypter.deploy()
	await queryDecrypter.waitForDeployment()
	await (await queryDecrypter.initialize(TASK_MANAGER_ADDRESS, await acl.getAddress())).wait()

	saveDeployment(runtime.network.name, 'TaskManager', TASK_MANAGER_ADDRESS)
	saveDeployment(runtime.network.name, 'ACL', await acl.getAddress())
	saveDeployment(runtime.network.name, 'MockZkVerifier', await verifier.getAddress())
	saveDeployment(runtime.network.name, 'MockQueryDecrypter', await queryDecrypter.getAddress())
}
