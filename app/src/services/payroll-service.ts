import type { Address, PublicClient } from "viem";
import type { SupportedNetworkKey } from "@/config/app";
import { confidentialPayrollAbi, getDeployment } from "@/lib/contracts";
import type { RoundView, ProtocolSnapshot } from "@/types/round";

type RawRoundSummary = {
  name: string;
  claimDeadline: bigint;
  status: number;
  recipientCount: number;
  claimedCount: number;
  fundedAmount: bigint;
  totalAllocated: bigint;
  totalClaimed: bigint;
  totalReclaimed: bigint;
};

function payrollAddress(networkKey: SupportedNetworkKey) {
  return getDeployment(networkKey).ConfidentialPayroll;
}

export async function fetchRounds(
  client: PublicClient,
  networkKey: SupportedNetworkKey,
): Promise<RoundView[]> {
  const address = payrollAddress(networkKey);
  const nextId = (await client.readContract({
    address,
    abi: confidentialPayrollAbi,
    functionName: "nextRoundId",
  })) as bigint;

  const ids = Array.from({ length: Number(nextId) }, (_, i) => i);
  const rounds = await Promise.all(
    ids.map((id) => fetchRoundById(client, networkKey, id)),
  );
  return rounds.reverse();
}

export async function fetchRoundById(
  client: PublicClient,
  networkKey: SupportedNetworkKey,
  roundId: number,
): Promise<RoundView> {
  const address = payrollAddress(networkKey);
  const rid = BigInt(roundId);

  const [summary, fundingStatus, openable, claimActive, reclaimableAmount] =
    await Promise.all([
      client.readContract({ address, abi: confidentialPayrollAbi, functionName: "getRoundSummary", args: [rid] }) as Promise<RawRoundSummary>,
      client.readContract({ address, abi: confidentialPayrollAbi, functionName: "getRoundFundingStatus", args: [rid] }) as Promise<readonly [bigint, bigint, bigint, boolean]>,
      client.readContract({ address, abi: confidentialPayrollAbi, functionName: "isRoundOpenable", args: [rid] }) as Promise<boolean>,
      client.readContract({ address, abi: confidentialPayrollAbi, functionName: "isClaimActive", args: [rid] }) as Promise<boolean>,
      client.readContract({ address, abi: confidentialPayrollAbi, functionName: "getReclaimableAmount", args: [rid] }) as Promise<bigint>,
    ]);

  return {
    id: roundId,
    name: summary.name,
    claimDeadline: BigInt(summary.claimDeadline),
    status: Number(summary.status) as 0 | 1 | 2,
    recipientCount: Number(summary.recipientCount),
    claimedCount: Number(summary.claimedCount),
    fundedAmount: BigInt(summary.fundedAmount),
    totalAllocated: BigInt(summary.totalAllocated),
    totalClaimed: BigInt(summary.totalClaimed),
    totalReclaimed: BigInt(summary.totalReclaimed),
    fundingShortfall: fundingStatus[2],
    isExactFunding: fundingStatus[3],
    openable,
    claimActive,
    reclaimableAmount,
  };
}

export async function fetchMyRounds(
  client: PublicClient,
  networkKey: SupportedNetworkKey,
  account: Address,
): Promise<RoundView[]> {
  const address = payrollAddress(networkKey);
  const rounds = await fetchRounds(client, networkKey);

  const matches = await Promise.all(
    rounds.map(async (round) => {
      const has = (await client.readContract({
        address,
        abi: confidentialPayrollAbi,
        functionName: "hasAllocation",
        args: [BigInt(round.id), account],
      })) as boolean;
      return has ? round : null;
    }),
  );

  return matches.filter((r): r is RoundView => Boolean(r));
}

export async function fetchProtocolSnapshot(
  client: PublicClient,
  networkKey: SupportedNetworkKey,
): Promise<ProtocolSnapshot> {
  const rounds = await fetchRounds(client, networkKey);
  return {
    rounds,
    totalRounds: rounds.length,
    openRounds: rounds.filter((r) => r.status === 1).length,
    totalFunded: rounds.reduce((s, r) => s + r.fundedAmount, 0n),
    totalClaimed: rounds.reduce((s, r) => s + r.totalClaimed, 0n),
  };
}

export async function fetchPersonalStatus(
  client: PublicClient,
  networkKey: SupportedNetworkKey,
  roundId: number,
  account: Address,
) {
  const address = payrollAddress(networkKey);
  const rid = BigInt(roundId);

  const [hasAllocation, claimed, canClaim] = await Promise.all([
    client.readContract({ address, abi: confidentialPayrollAbi, functionName: "hasAllocation", args: [rid, account] }) as Promise<boolean>,
    client.readContract({ address, abi: confidentialPayrollAbi, functionName: "isClaimed", args: [rid, account] }) as Promise<boolean>,
    client.readContract({ address, abi: confidentialPayrollAbi, functionName: "canClaim", args: [rid, account] }) as Promise<boolean>,
  ]);

  return { hasAllocation, claimed, canClaim };
}

export async function fetchContractOwner(
  client: PublicClient,
  networkKey: SupportedNetworkKey,
): Promise<Address> {
  const address = payrollAddress(networkKey);
  return (await client.readContract({
    address,
    abi: confidentialPayrollAbi,
    functionName: "owner",
  })) as Address;
}
