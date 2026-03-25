import type { Address, PublicClient, WalletClient } from "viem";
import type { SupportedNetworkKey } from "@/config/app";
import { confidentialPayrollAbi, erc20Abi, getDeployment } from "@/lib/contracts";
import { encryptUint128, type EncryptedInput } from "./encryption-service";

function addresses(networkKey: SupportedNetworkKey) {
  const d = getDeployment(networkKey);
  return {
    payroll: d.ConfidentialPayroll,
    token: d.MockPayoutToken,
  };
}

/** Encrypt and set a single allocation for a recipient in a draft round. */
export async function setAllocation({
  publicClient,
  walletClient,
  networkKey,
  roundId,
  recipient,
  amount,
  account,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  networkKey: SupportedNetworkKey;
  roundId: bigint;
  recipient: Address;
  amount: bigint;
  account: Address;
}) {
  const { payroll } = addresses(networkKey);

  const encrypted = await encryptUint128({
    publicClient,
    walletClient,
    networkKey,
    value: amount,
    account,
  });

  const encryptedTuple = {
    ctHash: encrypted.ctHash,
    securityZone: encrypted.securityZone,
    utype: encrypted.utype,
    signature: encrypted.signature,
  };

  const hash = await walletClient.writeContract({
    address: payroll,
    abi: confidentialPayrollAbi,
    functionName: "setAllocation",
    args: [roundId, recipient, encryptedTuple, amount],
    account,
    chain: publicClient.chain,
  });

  return publicClient.waitForTransactionReceipt({ hash });
}

/** Approve token spending + fund a draft round. Returns both tx receipts. */
export async function approveAndFundRound({
  publicClient,
  walletClient,
  networkKey,
  roundId,
  amount,
  account,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  networkKey: SupportedNetworkKey;
  roundId: bigint;
  amount: bigint;
  account: Address;
}) {
  const { payroll, token } = addresses(networkKey);

  // Check current allowance
  const allowance = (await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, payroll],
  })) as bigint;

  // Approve if needed
  if (allowance < amount) {
    const approveHash = await walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [payroll, amount],
      account,
      chain: publicClient.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  // Fund round
  const fundHash = await walletClient.writeContract({
    address: payroll,
    abi: confidentialPayrollAbi,
    functionName: "fundRound",
    args: [roundId, amount],
    account,
    chain: publicClient.chain,
  });

  return publicClient.waitForTransactionReceipt({ hash: fundHash });
}

/** Mint mock payout tokens (only works on localhost with MockPayoutToken). */
export async function mintTokens({
  publicClient,
  walletClient,
  networkKey,
  to,
  amount,
  account,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  networkKey: SupportedNetworkKey;
  to: Address;
  amount: bigint;
  account: Address;
}) {
  const { token } = addresses(networkKey);

  const hash = await walletClient.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: "mint",
    args: [to, amount],
    account,
    chain: publicClient.chain,
  });

  return publicClient.waitForTransactionReceipt({ hash });
}

/** Read the token balance for an account. */
export async function fetchTokenBalance({
  publicClient,
  networkKey,
  account,
}: {
  publicClient: PublicClient;
  networkKey: SupportedNetworkKey;
  account: Address;
}) {
  const { token } = addresses(networkKey);
  return (await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  })) as bigint;
}

/** Read the current allowance for the payroll contract. */
export async function fetchTokenAllowance({
  publicClient,
  networkKey,
  account,
}: {
  publicClient: PublicClient;
  networkKey: SupportedNetworkKey;
  account: Address;
}) {
  const { payroll, token } = addresses(networkKey);
  return (await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, payroll],
  })) as bigint;
}
