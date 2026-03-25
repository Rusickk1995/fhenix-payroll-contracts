import type { Abi } from "viem";
import confidentialPayrollAbiJson from "@/lib/generated/confidential-payroll.abi.json";
import deploymentsJson from "@/lib/generated/deployments.json";
import mockQueryDecrypterAbiJson from "@/lib/generated/mock-query-decrypter.abi.json";
import mockZkVerifierAbiJson from "@/lib/generated/mock-zk-verifier.abi.json";
import type { SupportedNetworkKey } from "@/config/app";
import type { Address } from "viem";

type DeploymentRecord = {
  ConfidentialPayroll: Address;
  MockPayoutToken: Address;
  MockQueryDecrypter?: Address;
  MockZkVerifier?: Address;
};

const deployments = deploymentsJson as Record<SupportedNetworkKey, DeploymentRecord>;

export const confidentialPayrollAbi = confidentialPayrollAbiJson as Abi;
export const mockQueryDecrypterAbi = mockQueryDecrypterAbiJson as Abi;
export const mockZkVerifierAbi = mockZkVerifierAbiJson as Abi;

export const erc20Abi = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const satisfies Abi;

export function getDeployment(networkKey: SupportedNetworkKey) {
  return deployments[networkKey];
}
