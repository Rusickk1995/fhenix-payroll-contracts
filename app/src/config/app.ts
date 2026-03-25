import type { Address } from "viem";
import deploymentsJson from "@/lib/generated/deployments.json";
import {
  ARBITRUM_SEPOLIA_CHAIN,
  HARDHAT_LOCALHOST_CHAIN,
} from "@/lib/chains";

export type SupportedNetworkKey = "arb-sepolia" | "localhost";

type DeploymentRecord = {
  ConfidentialPayroll: Address;
  MockPayoutToken: Address;
  MockQueryDecrypter?: Address;
  MockZkVerifier?: Address;
};

type DeploymentMap = Record<SupportedNetworkKey, DeploymentRecord>;

const deployments = deploymentsJson as DeploymentMap;

export const REPOSITORY_URL =
  "https://github.com/Rusickk1995/fhenix-payroll-contracts";

export const DEFAULT_NETWORK_KEY: SupportedNetworkKey =
  process.env.NEXT_PUBLIC_PAYROLL_NETWORK === "localhost"
    ? "localhost"
    : "arb-sepolia";

const enableLocalhost =
  process.env.NEXT_PUBLIC_ENABLE_LOCALHOST === "true" ||
  DEFAULT_NETWORK_KEY === "localhost";

export const NETWORK_CONFIGS = {
  "arb-sepolia": {
    key: "arb-sepolia" as const,
    chain: ARBITRUM_SEPOLIA_CHAIN,
    deployment: deployments["arb-sepolia"],
    badge: "Testnet",
    displayName: "Arbitrum Sepolia",
  },
  localhost: {
    key: "localhost" as const,
    chain: HARDHAT_LOCALHOST_CHAIN,
    deployment: deployments.localhost,
    badge: "Dev",
    displayName: "Hardhat Localhost",
  },
} as const;

export const TARGET_NETWORK = NETWORK_CONFIGS[DEFAULT_NETWORK_KEY];

export const SUPPORTED_NETWORKS = [
  NETWORK_CONFIGS["arb-sepolia"],
  ...(enableLocalhost ? [NETWORK_CONFIGS.localhost] : []),
];

export function getNetworkConfigByChainId(chainId?: number | null) {
  if (chainId === ARBITRUM_SEPOLIA_CHAIN.id) return NETWORK_CONFIGS["arb-sepolia"];
  if (chainId === HARDHAT_LOCALHOST_CHAIN.id) return NETWORK_CONFIGS.localhost;
  return TARGET_NETWORK;
}

export function isSupportedChainId(chainId?: number | null) {
  return SUPPORTED_NETWORKS.some((n) => n.chain.id === chainId);
}
