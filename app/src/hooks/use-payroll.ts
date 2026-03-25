"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { TARGET_NETWORK } from "@/config/app";
import { fetchMyRounds, fetchPersonalStatus, fetchContractOwner } from "@/services/payroll-service";
import { useHydrated } from "./use-hydrated";

export function useMyRounds() {
  const isHydrated = useHydrated();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });

  return useQuery({
    queryKey: ["my-rounds", TARGET_NETWORK.key, address],
    enabled: isHydrated && Boolean(address && publicClient),
    queryFn: () => fetchMyRounds(publicClient!, TARGET_NETWORK.key, address!),
    staleTime: 15_000,
  });
}

export function usePersonalStatus(roundId: number) {
  const isHydrated = useHydrated();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });

  return useQuery({
    queryKey: ["personal-status", TARGET_NETWORK.key, roundId, address],
    enabled: isHydrated && Boolean(address && publicClient),
    queryFn: () => fetchPersonalStatus(publicClient!, TARGET_NETWORK.key, roundId, address!),
  });
}

export function useIsAdmin() {
  const isHydrated = useHydrated();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });

  return useQuery({
    queryKey: ["is-admin", TARGET_NETWORK.key, address],
    enabled: isHydrated && Boolean(address && publicClient),
    queryFn: async () => {
      const owner = await fetchContractOwner(publicClient!, TARGET_NETWORK.key);
      return owner.toLowerCase() === address!.toLowerCase();
    },
    staleTime: 60_000,
  });
}
