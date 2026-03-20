import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'

const TASK_MANAGER_ADDRESS = '0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9'
const EUINT128_TFHE = 6

describe('ConfidentialPayroll', function () {
	async function deployPayrollFixture() {
		const [owner, alice, bob, carol] = await hre.ethers.getSigners()

		const taskManagerArtifact = await hre.artifacts.readArtifact('TaskManager')
		await hre.network.provider.send('hardhat_setCode', [TASK_MANAGER_ADDRESS, taskManagerArtifact.deployedBytecode])

		const taskManager = await hre.ethers.getContractAt('TaskManager', TASK_MANAGER_ADDRESS)
		await (await taskManager.initialize(owner.address)).wait()
		await (await taskManager.setLogOps(false)).wait()

		const ACL = await hre.ethers.getContractFactory('ACL')
		const acl = await ACL.deploy(owner.address)
		await acl.waitForDeployment()
		await (await taskManager.setACLContract(await acl.getAddress())).wait()

		const MockZkVerifier = await hre.ethers.getContractFactory('MockZkVerifier')
		const zkVerifier = await MockZkVerifier.deploy()
		await zkVerifier.waitForDeployment()

		const MockQueryDecrypter = await hre.ethers.getContractFactory('MockQueryDecrypter')
		const queryDecrypter = await MockQueryDecrypter.deploy()
		await queryDecrypter.waitForDeployment()
		await (await queryDecrypter.initialize(TASK_MANAGER_ADDRESS, await acl.getAddress())).wait()

		const MockPayoutToken = await hre.ethers.getContractFactory('MockPayoutToken')
		const payoutToken = await MockPayoutToken.deploy()
		await payoutToken.waitForDeployment()
		await (await payoutToken.mint(owner.address, 1_000_000n)).wait()

		const ConfidentialPayroll = await hre.ethers.getContractFactory('ConfidentialPayroll')
		const payroll = await ConfidentialPayroll.deploy(owner.address, await payoutToken.getAddress())
		await payroll.waitForDeployment()

		return { payroll, payoutToken, taskManager, zkVerifier, queryDecrypter, owner, alice, bob, carol }
	}

	async function encryptUint128(value: bigint, issuer: string, zkVerifier: any) {
		const encryptedInput = await zkVerifier.zkVerify.staticCall(value, EUINT128_TFHE, issuer, 0, 31337)
		await (await zkVerifier.zkVerify(value, EUINT128_TFHE, issuer, 0, 31337)).wait()
		return {
			ctHash: encryptedInput.ctHash,
			securityZone: encryptedInput.securityZone,
			utype: encryptedInput.utype,
			signature: encryptedInput.signature,
		}
	}

	it('restricts admin actions to the contract owner', async function () {
		const { payroll, payoutToken, owner, alice, bob, zkVerifier } = await loadFixture(deployPayrollFixture)
		const encryptedAmount = await encryptUint128(250n, owner.address, zkVerifier)

		await expect(payroll.connect(alice).createRound('Unauthorized Round', 1_800_000_000))
			.to.be.revertedWithCustomError(payroll, 'OwnableUnauthorizedAccount')
			.withArgs(alice.address)

		await payroll.connect(owner).createRound('Protected Round', 1_800_000_000)

		await expect(payroll.connect(alice).setAllocation(0, bob.address, encryptedAmount, 250n))
			.to.be.revertedWithCustomError(payroll, 'OwnableUnauthorizedAccount')
			.withArgs(alice.address)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 250n)).wait()
		await payroll.connect(owner).setAllocation(0, bob.address, encryptedAmount, 250n)

		await expect(payroll.connect(alice).fundRound(0, 250n))
			.to.be.revertedWithCustomError(payroll, 'OwnableUnauthorizedAccount')
			.withArgs(alice.address)

		await payroll.connect(owner).fundRound(0, 250n)

		await expect(payroll.connect(alice).openRound(0))
			.to.be.revertedWithCustomError(payroll, 'OwnableUnauthorizedAccount')
			.withArgs(alice.address)

		await payroll.connect(owner).openRound(0)

		await expect(payroll.connect(alice).closeRound(0))
			.to.be.revertedWithCustomError(payroll, 'OwnableUnauthorizedAccount')
			.withArgs(alice.address)

		await payroll.connect(owner).closeRound(0)

		await expect(payroll.connect(alice).reclaimRoundBalance(0))
			.to.be.revertedWithCustomError(payroll, 'OwnableUnauthorizedAccount')
			.withArgs(alice.address)
	})

	it('enforces strict draft-open-closed lifecycle rules and exposes operator round state views', async function () {
		const { payroll, payoutToken, owner, alice, zkVerifier } = await loadFixture(deployPayrollFixture)
		const claimDeadline = 1_800_000_000

		await expect(payroll.connect(owner).createRound('Hackathon Round 1', claimDeadline))
			.to.emit(payroll, 'RoundCreated')
			.withArgs(0n, 'Hackathon Round 1', claimDeadline)

		await expect(payroll.connect(owner).openRound(0))
			.to.be.revertedWithCustomError(payroll, 'NoAllocationsConfigured')
			.withArgs(0n)

		const encryptedAmount = await encryptUint128(250n, owner.address, zkVerifier)
		await expect(payroll.connect(owner).setAllocation(0, alice.address, encryptedAmount, 250n))
			.to.emit(payroll, 'AllocationConfigured')
			.withArgs(0n, alice.address, false)

		let round = await payroll.getRoundSummary(0)
		expect(round.status).to.equal(0n)
		expect(round.recipientCount).to.equal(1n)
		expect(round.claimedCount).to.equal(0n)
		expect(round.totalAllocated).to.equal(250n)
		expect(round.fundedAmount).to.equal(0n)
		expect(round.totalClaimed).to.equal(0n)
		expect(round.totalReclaimed).to.equal(0n)
		expect(await payroll.isRoundOpenable(0)).to.equal(false)
		expect(await payroll.isClaimActive(0)).to.equal(false)
		expect(await payroll.canClaim(0, alice.address)).to.equal(false)
		expect(await payroll.getRoundFundingStatus(0)).to.deep.equal([0n, 250n, 250n, false])
		expect(await payroll.getReclaimableAmount(0)).to.equal(0n)

		await expect(payroll.connect(owner).openRound(0))
			.to.be.revertedWithCustomError(payroll, 'RoundFundingMismatch')
			.withArgs(0n, 0n, 250n)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 250n)).wait()
		await expect(payroll.connect(owner).fundRound(0, 250n))
			.to.emit(payroll, 'RoundFunded')
			.withArgs(0n, 250n, 250n)

		expect(await payoutToken.balanceOf(await payroll.getAddress())).to.equal(250n)
		expect(await payroll.isRoundOpenable(0)).to.equal(true)
		expect(await payroll.getRoundFundingStatus(0)).to.deep.equal([250n, 250n, 0n, true])

		await expect(payroll.connect(owner).openRound(0)).to.emit(payroll, 'RoundOpened').withArgs(0n)
		expect(await payroll.isRoundOpenable(0)).to.equal(false)
		expect(await payroll.isClaimActive(0)).to.equal(true)
		expect(await payroll.canClaim(0, alice.address)).to.equal(true)

		await expect(payroll.connect(owner).setAllocation(0, alice.address, encryptedAmount, 250n))
			.to.be.revertedWithCustomError(payroll, 'RoundNotDraft')
			.withArgs(0n)
		await expect(payroll.connect(owner).fundRound(0, 1n))
			.to.be.revertedWithCustomError(payroll, 'RoundNotDraft')
			.withArgs(0n)

		await expect(payroll.connect(owner).closeRound(0)).to.emit(payroll, 'RoundClosed').withArgs(0n)
		await expect(payroll.connect(owner).closeRound(0))
			.to.be.revertedWithCustomError(payroll, 'RoundNotOpen')
			.withArgs(0n)
		await expect(payroll.connect(owner).openRound(0))
			.to.be.revertedWithCustomError(payroll, 'RoundNotDraft')
			.withArgs(0n)

		round = await payroll.getRoundSummary(0)
		expect(round.status).to.equal(2n)
		expect(round.fundedAmount).to.equal(250n)
		expect(round.totalAllocated).to.equal(250n)
		expect(round.totalClaimed).to.equal(0n)
		expect(round.totalReclaimed).to.equal(0n)
		expect(await payroll.isClaimActive(0)).to.equal(false)
		expect(await payroll.canClaim(0, alice.address)).to.equal(false)
		expect(await payroll.nextRoundId()).to.equal(1n)
	})

	it('stores confidential allocations while updating aggregate accounting for the round', async function () {
		const { payroll, taskManager, queryDecrypter, owner, alice, bob, zkVerifier } =
			await loadFixture(deployPayrollFixture)

		await payroll.connect(owner).createRound('Round A', 1_800_000_000)

		const firstAllocation = await encryptUint128(100n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, alice.address, firstAllocation, 100n)

		const updatedAllocation = await encryptUint128(125n, owner.address, zkVerifier)
		await expect(payroll.connect(owner).setAllocation(0, alice.address, updatedAllocation, 125n))
			.to.emit(payroll, 'AllocationConfigured')
			.withArgs(0n, alice.address, true)

		const allocationHandle = await payroll.connect(alice).getMyAllocation(0)

		expect(await payroll.hasAllocation(0, alice.address)).to.equal(true)
		expect(await payroll.hasAllocation(0, bob.address)).to.equal(false)
		expect(await taskManager.isAllowed(allocationHandle, await payroll.getAddress())).to.equal(true)
		expect(await taskManager.isAllowed(allocationHandle, alice.address)).to.equal(true)
		expect(await taskManager.isAllowed(allocationHandle, bob.address)).to.equal(false)

		const aliceResult = await queryDecrypter.mockQueryDecrypt(allocationHandle, 0, alice.address)
		expect(aliceResult[0]).to.equal(true)
		expect(aliceResult[1]).to.equal('')
		expect(aliceResult[2]).to.equal(125n)

		const bobResult = await queryDecrypter.mockQueryDecrypt(allocationHandle, 0, bob.address)
		expect(bobResult[0]).to.equal(false)
		expect(bobResult[1]).to.equal('NotAllowed')
		expect(bobResult[2]).to.equal(0n)

		await expect(payroll.connect(bob).getMyAllocation(0))
			.to.be.revertedWithCustomError(payroll, 'AllocationMissing')
			.withArgs(0n, bob.address)

		const round = await payroll.getRoundSummary(0)
		expect(round.recipientCount).to.equal(1n)
		expect(round.totalAllocated).to.equal(125n)
		expect(round.totalClaimed).to.equal(0n)
		expect(round.totalReclaimed).to.equal(0n)
	})

	it('rejects invalid allocation and funding paths during the draft phase', async function () {
		const { payroll, payoutToken, owner, alice, zkVerifier } = await loadFixture(deployPayrollFixture)

		await payroll.connect(owner).createRound('Guardrail Round', 1_800_000_000)

		const encryptedAmount = await encryptUint128(100n, owner.address, zkVerifier)

		await expect(payroll.connect(owner).setAllocation(0, hre.ethers.ZeroAddress, encryptedAmount, 100n))
			.to.be.revertedWithCustomError(payroll, 'InvalidRecipient')
			.withArgs(hre.ethers.ZeroAddress)

		await expect(payroll.connect(owner).setAllocation(0, alice.address, encryptedAmount, 0n))
			.to.be.revertedWithCustomError(payroll, 'InvalidAllocationAmount')
			.withArgs(0n, alice.address, 0n)

		await expect(payroll.connect(owner).fundRound(0, 0n))
			.to.be.revertedWithCustomError(payroll, 'InvalidFundingAmount')
			.withArgs(0n, 0n)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 200n)).wait()
		await payroll.connect(owner).fundRound(0, 100n)
		await payroll.connect(owner).setAllocation(0, alice.address, encryptedAmount, 100n)

		await expect(payroll.connect(owner).fundRound(0, 1n)).to.emit(payroll, 'RoundFunded').withArgs(0n, 1n, 101n)
		expect(await payroll.isRoundOpenable(0)).to.equal(false)
		expect(await payroll.getRoundFundingStatus(0)).to.deep.equal([101n, 100n, 0n, false])

		await expect(payroll.connect(owner).openRound(0))
			.to.be.revertedWithCustomError(payroll, 'RoundFundingMismatch')
			.withArgs(0n, 101n, 100n)
	})

	it('allows claims only while the round is open and before the deadline', async function () {
		const { payroll, payoutToken, owner, alice, zkVerifier } = await loadFixture(deployPayrollFixture)
		const claimDeadline = (await time.latest()) + 60

		await payroll.connect(owner).createRound('Deadline Round', claimDeadline)

		const allocation = await encryptUint128(180n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, alice.address, allocation, 180n)
		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 180n)).wait()
		await payroll.connect(owner).fundRound(0, 180n)

		await expect(payroll.connect(alice).claim(0))
			.to.be.revertedWithCustomError(payroll, 'RoundNotOpen')
			.withArgs(0n)

		await payroll.connect(owner).openRound(0)
		expect(await payroll.isClaimActive(0)).to.equal(true)
		expect(await payroll.canClaim(0, alice.address)).to.equal(true)

		await time.increaseTo(claimDeadline + 1)

		expect(await payroll.isClaimActive(0)).to.equal(false)
		expect(await payroll.canClaim(0, alice.address)).to.equal(false)

		await expect(payroll.connect(alice).claim(0))
			.to.be.revertedWithCustomError(payroll, 'ClaimWindowClosed')
			.withArgs(0n, claimDeadline)

		await expect(payroll.connect(owner).closeRound(0)).to.emit(payroll, 'RoundClosed').withArgs(0n)
	})

	it('funds the contract and transfers the payout asset on a one-time claim', async function () {
		const { payroll, payoutToken, owner, alice, bob, carol, zkVerifier } = await loadFixture(deployPayrollFixture)

		await payroll.connect(owner).createRound('Round B', 1_800_000_000)

		const aliceAllocation = await encryptUint128(300n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, alice.address, aliceAllocation, 300n)

		const bobAllocation = await encryptUint128(75n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, bob.address, bobAllocation, 75n)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 375n)).wait()
		await payroll.connect(owner).fundRound(0, 375n)
		await payroll.connect(owner).openRound(0)

		expect(await payoutToken.balanceOf(await payroll.getAddress())).to.equal(375n)
		expect(await payoutToken.balanceOf(alice.address)).to.equal(0n)

		await expect(payroll.connect(alice).claim(0))
			.to.emit(payroll, 'PayoutClaimed')
			.withArgs(0n, alice.address)

		expect(await payroll.isClaimed(0, alice.address)).to.equal(true)
		expect(await payoutToken.balanceOf(alice.address)).to.equal(300n)
		expect(await payoutToken.balanceOf(await payroll.getAddress())).to.equal(75n)

		let round = await payroll.getRoundSummary(0)
		expect(round.claimedCount).to.equal(1n)
		expect(round.totalAllocated).to.equal(375n)
		expect(round.totalClaimed).to.equal(300n)
		expect(round.fundedAmount).to.equal(375n)
		expect(round.totalReclaimed).to.equal(0n)

		await expect(payroll.connect(alice).claim(0))
			.to.be.revertedWithCustomError(payroll, 'AllocationAlreadyClaimed')
			.withArgs(0n, alice.address)

		await expect(payroll.connect(carol).claim(0))
			.to.be.revertedWithCustomError(payroll, 'AllocationMissing')
			.withArgs(0n, carol.address)

		await expect(payroll.connect(bob).claim(0))
			.to.emit(payroll, 'PayoutClaimed')
			.withArgs(0n, bob.address)

		round = await payroll.getRoundSummary(0)
		expect(round.claimedCount).to.equal(2n)
		expect(round.totalClaimed).to.equal(375n)
		expect(round.totalReclaimed).to.equal(0n)
		expect(await payoutToken.balanceOf(bob.address)).to.equal(75n)
		expect(await payoutToken.balanceOf(await payroll.getAddress())).to.equal(0n)
	})

	it('reclaims the unclaimed balance after close when no recipients claimed', async function () {
		const { payroll, payoutToken, owner, alice, zkVerifier } = await loadFixture(deployPayrollFixture)

		await payroll.connect(owner).createRound('Zero Claim Round', 1_800_000_000)

		const allocation = await encryptUint128(220n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, alice.address, allocation, 220n)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 220n)).wait()
		await payroll.connect(owner).fundRound(0, 220n)
		await payroll.connect(owner).openRound(0)
		await payroll.connect(owner).closeRound(0)

		expect(await payroll.getReclaimableAmount(0)).to.equal(220n)

		await expect(payroll.connect(owner).reclaimRoundBalance(0))
			.to.emit(payroll, 'RoundSettled')
			.withArgs(0n, 220n, 220n)

		const round = await payroll.getRoundSummary(0)
		expect(round.totalClaimed).to.equal(0n)
		expect(round.totalReclaimed).to.equal(220n)
		expect(await payroll.getReclaimableAmount(0)).to.equal(0n)
		expect(await payoutToken.balanceOf(await payroll.getAddress())).to.equal(0n)

		await expect(payroll.connect(owner).reclaimRoundBalance(0))
			.to.be.revertedWithCustomError(payroll, 'NoReclaimableBalance')
			.withArgs(0n)
	})

	it('reclaims only the remaining unclaimed balance after a partial-claim round closes', async function () {
		const { payroll, payoutToken, owner, alice, bob, zkVerifier } = await loadFixture(deployPayrollFixture)

		await payroll.connect(owner).createRound('Partial Claim Round', 1_800_000_000)

		const aliceAllocation = await encryptUint128(300n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, alice.address, aliceAllocation, 300n)

		const bobAllocation = await encryptUint128(75n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, bob.address, bobAllocation, 75n)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 375n)).wait()
		await payroll.connect(owner).fundRound(0, 375n)
		await payroll.connect(owner).openRound(0)

		await payroll.connect(alice).claim(0)
		await payroll.connect(owner).closeRound(0)

		expect(await payroll.getReclaimableAmount(0)).to.equal(75n)

		await expect(payroll.connect(owner).reclaimRoundBalance(0))
			.to.emit(payroll, 'RoundSettled')
			.withArgs(0n, 75n, 75n)

		const round = await payroll.getRoundSummary(0)
		expect(round.totalClaimed).to.equal(300n)
		expect(round.totalReclaimed).to.equal(75n)
		expect(await payroll.getReclaimableAmount(0)).to.equal(0n)
		expect(await payoutToken.balanceOf(await payroll.getAddress())).to.equal(0n)
	})

	it('does not allow settlement before close or after a fully claimed round has no remainder', async function () {
		const { payroll, payoutToken, owner, alice, zkVerifier } = await loadFixture(deployPayrollFixture)

		await payroll.connect(owner).createRound('Full Claim Round', 1_800_000_000)

		const allocation = await encryptUint128(150n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, alice.address, allocation, 150n)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 150n)).wait()
		await payroll.connect(owner).fundRound(0, 150n)

		await expect(payroll.connect(owner).reclaimRoundBalance(0))
			.to.be.revertedWithCustomError(payroll, 'RoundNotClosed')
			.withArgs(0n)

		await payroll.connect(owner).openRound(0)
		await payroll.connect(alice).claim(0)
		await payroll.connect(owner).closeRound(0)

		expect(await payroll.getReclaimableAmount(0)).to.equal(0n)

		await expect(payroll.connect(owner).reclaimRoundBalance(0))
			.to.be.revertedWithCustomError(payroll, 'NoReclaimableBalance')
			.withArgs(0n)
	})

	it('rejects protected failure cases across round, claim, and settlement paths', async function () {
		const { payroll, payoutToken, owner, alice, bob, zkVerifier } = await loadFixture(deployPayrollFixture)

		await expect(payroll.getRoundSummary(99))
			.to.be.revertedWithCustomError(payroll, 'RoundNotFound')
			.withArgs(99n)
		await expect(payroll.hasAllocation(99, alice.address))
			.to.be.revertedWithCustomError(payroll, 'RoundNotFound')
			.withArgs(99n)
		await expect(payroll.claim(99))
			.to.be.revertedWithCustomError(payroll, 'RoundNotFound')
			.withArgs(99n)

		await payroll.connect(owner).createRound('Failure Round', 1_800_000_000)

		const aliceAllocation = await encryptUint128(120n, owner.address, zkVerifier)
		const bobAllocation = await encryptUint128(80n, owner.address, zkVerifier)
		await payroll.connect(owner).setAllocation(0, alice.address, aliceAllocation, 120n)
		await payroll.connect(owner).setAllocation(0, bob.address, bobAllocation, 80n)

		await expect(payroll.connect(owner).closeRound(0))
			.to.be.revertedWithCustomError(payroll, 'RoundNotOpen')
			.withArgs(0n)
		await expect(payroll.connect(owner).reclaimRoundBalance(0))
			.to.be.revertedWithCustomError(payroll, 'RoundNotClosed')
			.withArgs(0n)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 200n)).wait()
		await payroll.connect(owner).fundRound(0, 200n)
		await payroll.connect(owner).openRound(0)

		await expect(payroll.connect(owner).fundRound(0, 1n))
			.to.be.revertedWithCustomError(payroll, 'RoundNotDraft')
			.withArgs(0n)
		await expect(payroll.connect(owner).setAllocation(0, alice.address, aliceAllocation, 120n))
			.to.be.revertedWithCustomError(payroll, 'RoundNotDraft')
			.withArgs(0n)
		await expect(payroll.connect(owner).openRound(0))
			.to.be.revertedWithCustomError(payroll, 'RoundNotDraft')
			.withArgs(0n)

		await expect(payroll.connect(bob).claim(0))
			.to.emit(payroll, 'PayoutClaimed')
			.withArgs(0n, bob.address)

		await expect(payroll.connect(bob).claim(0))
			.to.be.revertedWithCustomError(payroll, 'AllocationAlreadyClaimed')
			.withArgs(0n, bob.address)

		await payroll.connect(owner).closeRound(0)

		await expect(payroll.connect(alice).claim(0))
			.to.be.revertedWithCustomError(payroll, 'RoundNotOpen')
			.withArgs(0n)
	})

	it('executes the full contract-only MVP flow from deploy to final reclaim', async function () {
		const { payroll, payoutToken, queryDecrypter, owner, alice, bob, zkVerifier } =
			await loadFixture(deployPayrollFixture)

		await expect(payroll.connect(owner).createRound('End To End Round', 1_800_000_000))
			.to.emit(payroll, 'RoundCreated')
			.withArgs(0n, 'End To End Round', 1_800_000_000)

		await (await payoutToken.connect(owner).approve(await payroll.getAddress(), 400n)).wait()
		await expect(payroll.connect(owner).fundRound(0, 400n))
			.to.emit(payroll, 'RoundFunded')
			.withArgs(0n, 400n, 400n)
		expect(await payroll.getReclaimableAmount(0)).to.equal(0n)

		const aliceAllocation = await encryptUint128(250n, owner.address, zkVerifier)
		const bobAllocation = await encryptUint128(150n, owner.address, zkVerifier)

		expect(await payroll.isRoundOpenable(0)).to.equal(false)
		await expect(payroll.connect(owner).openRound(0))
			.to.be.revertedWithCustomError(payroll, 'NoAllocationsConfigured')
			.withArgs(0n)

		await payroll.connect(owner).setAllocation(0, alice.address, aliceAllocation, 250n)
		expect(await payroll.isRoundOpenable(0)).to.equal(false)
		await expect(payroll.connect(owner).openRound(0))
			.to.be.revertedWithCustomError(payroll, 'RoundFundingMismatch')
			.withArgs(0n, 400n, 250n)

		await payroll.connect(owner).setAllocation(0, bob.address, bobAllocation, 150n)

		await expect(payroll.connect(owner).openRound(0)).to.emit(payroll, 'RoundOpened').withArgs(0n)
		expect(await payroll.getReclaimableAmount(0)).to.equal(0n)

		const aliceHandle = await payroll.connect(alice).getMyAllocation(0)
		const aliceReveal = await queryDecrypter.mockQueryDecrypt(aliceHandle, 0, alice.address)
		expect(aliceReveal[0]).to.equal(true)
		expect(aliceReveal[2]).to.equal(250n)

		await expect(payroll.connect(alice).claim(0))
			.to.emit(payroll, 'PayoutClaimed')
			.withArgs(0n, alice.address)
		expect(await payoutToken.balanceOf(alice.address)).to.equal(250n)

		await expect(payroll.connect(owner).closeRound(0)).to.emit(payroll, 'RoundClosed').withArgs(0n)

		expect(await payroll.getReclaimableAmount(0)).to.equal(150n)
		await expect(payroll.connect(owner).reclaimRoundBalance(0))
			.to.emit(payroll, 'RoundSettled')
			.withArgs(0n, 150n, 150n)

		const round = await payroll.getRoundSummary(0)
		expect(round.status).to.equal(2n)
		expect(round.recipientCount).to.equal(2n)
		expect(round.claimedCount).to.equal(1n)
		expect(round.fundedAmount).to.equal(400n)
		expect(round.totalAllocated).to.equal(400n)
		expect(round.totalClaimed).to.equal(250n)
		expect(round.totalReclaimed).to.equal(150n)
		expect(await payoutToken.balanceOf(await payroll.getAddress())).to.equal(0n)
	})
})
