import { defineChain } from "viem";
import { arbitrumSepolia } from "viem/chains";

export const ARBITRUM_SEPOLIA_CHAIN = arbitrumSepolia;

export const HARDHAT_LOCALHOST_CHAIN = defineChain({
  id: 31337,
  name: "Hardhat Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    default: { name: "Localhost", url: "http://127.0.0.1:8545" },
  },
  testnet: true,
});
