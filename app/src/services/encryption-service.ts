import type { Address, PublicClient, WalletClient } from "viem";
import type { SupportedNetworkKey } from "@/config/app";
import { getDeployment, mockZkVerifierAbi } from "@/lib/contracts";

const EUINT128_TFHE = 6;

export type EncryptedInput = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

export async function encryptUint128({
  publicClient,
  walletClient,
  networkKey,
  value,
  account,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  networkKey: SupportedNetworkKey;
  value: bigint;
  account: Address;
}): Promise<EncryptedInput> {
  if (networkKey === "localhost") {
    return encryptUint128Localhost({ publicClient, walletClient, value, account });
  }

  return encryptUint128Testnet({ publicClient, walletClient, value });
}

async function encryptUint128Localhost({
  publicClient,
  walletClient,
  value,
  account,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  value: bigint;
  account: Address;
}): Promise<EncryptedInput> {
  const deployment = getDeployment("localhost");
  const verifierAddress = deployment.MockZkVerifier;
  if (!verifierAddress) {
    throw new Error("MockZkVerifier not deployed on localhost.");
  }

  const chainId = await publicClient.getChainId();

  // First simulate to get the return value
  const { result } = await publicClient.simulateContract({
    address: verifierAddress,
    abi: mockZkVerifierAbi,
    functionName: "zkVerify",
    args: [value, EUINT128_TFHE, account, 0, BigInt(chainId)],
    account,
  });

  // Then execute the actual transaction (zkVerify is nonpayable, writes state)
  const hash = await walletClient.writeContract({
    address: verifierAddress,
    abi: mockZkVerifierAbi,
    functionName: "zkVerify",
    args: [value, EUINT128_TFHE, account, 0, BigInt(chainId)],
    account,
    chain: publicClient.chain,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  const [ctHash, securityZone, utype, signature] = result as [bigint, number, number, `0x${string}`];

  return { ctHash, securityZone, utype, signature };
}

async function encryptUint128Testnet({
  publicClient,
  walletClient,
  value,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  value: bigint;
}): Promise<EncryptedInput> {
  const { cofhejs, Encryptable } = await import("cofhejs/web");

  const initResult = await cofhejs.initializeWithViem({
    viemClient: publicClient,
    viemWalletClient: walletClient,
    environment: "TESTNET",
    generatePermit: true,
  });

  if (!initResult.success) {
    throw new Error(initResult.error?.message || "Failed to initialize CoFHE for encryption.");
  }

  const encResult = await cofhejs.encrypt([Encryptable.uint128(value)]);
  if (!encResult.success) {
    throw new Error(encResult.error?.message || "Failed to encrypt amount.");
  }

  const [encrypted] = encResult.data;
  return encrypted as EncryptedInput;
}
