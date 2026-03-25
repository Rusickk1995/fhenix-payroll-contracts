import { FheTypes, cofhejs } from "cofhejs/web";
import type { SupportedNetworkKey } from "@/config/app";
import type { Address, PublicClient, WalletClient } from "viem";
import {
  confidentialPayrollAbi,
  getDeployment,
  mockQueryDecrypterAbi,
} from "@/lib/contracts";

export async function readPrivateAllocation({
  publicClient,
  walletClient,
  networkKey,
  roundId,
  account,
}: {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  networkKey: SupportedNetworkKey;
  roundId: bigint;
  account: Address;
}) {
  const { ConfidentialPayroll: payrollAddress, MockQueryDecrypter: mockAddress } =
    getDeployment(networkKey);

  const handle = (await publicClient.readContract({
    address: payrollAddress,
    abi: confidentialPayrollAbi,
    functionName: "getMyAllocation",
    args: [roundId],
    account,
  })) as bigint;

  if (networkKey === "localhost") {
    if (!mockAddress) {
      throw new Error("Missing mock query decrypter deployment for localhost.");
    }

    const [allowed, error, amount] = (await publicClient.readContract({
      address: mockAddress,
      abi: mockQueryDecrypterAbi,
      functionName: "mockQueryDecrypt",
      args: [handle, 0n, account],
    })) as readonly [boolean, string, bigint];

    if (!allowed) {
      throw new Error(error || "Private allocation decryption failed.");
    }

    return { handle, amount };
  }

  if (!walletClient) {
    throw new Error("Wallet connection is required to reveal the allocation.");
  }

  const initResult = await cofhejs.initializeWithViem({
    viemClient: publicClient,
    viemWalletClient: walletClient,
    environment: "TESTNET",
    generatePermit: true,
  });

  if (!initResult.success) {
    throw new Error(
      initResult.error?.message || "Unable to initialize the private reveal flow.",
    );
  }

  const revealResult = await cofhejs.unseal(handle, FheTypes.Uint128, account);
  if (!revealResult.success) {
    throw new Error(
      revealResult.error?.message || "Unable to decrypt the private allocation.",
    );
  }

  return { handle, amount: revealResult.data };
}
