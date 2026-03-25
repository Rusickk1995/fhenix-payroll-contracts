"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { TARGET_NETWORK } from "@/config/app";
import { fetchRounds, fetchProtocolSnapshot } from "@/services/payroll-service";
import { useHydrated } from "./use-hydrated";

export function useRounds() {
  const isHydrated = useHydrated();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });

  return useQuery({
    queryKey: ["rounds", TARGET_NETWORK.key],
    enabled: isHydrated && Boolean(publicClient),
    queryFn: () => fetchRounds(publicClient!, TARGET_NETWORK.key),
    staleTime: 15_000,
  });
}

export function useProtocolSnapshot() {
  const isHydrated = useHydrated();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });

  return useQuery({
    queryKey: ["protocol-snapshot", TARGET_NETWORK.key],
    enabled: isHydrated && Boolean(publicClient),
    queryFn: () => fetchProtocolSnapshot(publicClient!, TARGET_NETWORK.key),
    staleTime: 15_000,
  });
}
