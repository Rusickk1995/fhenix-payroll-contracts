import { createConfig, http, injected } from "wagmi";
import type { Chain } from "viem";
import { SUPPORTED_NETWORKS } from "@/config/app";

export const wagmiConfig = createConfig({
  chains: SUPPORTED_NETWORKS.map((n) => n.chain) as unknown as [Chain, ...Chain[]],
  connectors: [injected({ target: "metaMask" })],
  transports: Object.fromEntries(
    SUPPORTED_NETWORKS.map((n) => [n.chain.id, http(n.chain.rpcUrls.default.http[0])]),
  ),
  ssr: false,
});
