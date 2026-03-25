"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Wallet, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TARGET_NETWORK, isSupportedChainId } from "@/config/app";
import { shortenAddress } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

export function ConnectButton() {
  const isHydrated = useHydrated();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  if (!isHydrated) {
    return (
      <div className="h-9 w-32 rounded-full bg-[var(--surface)] animate-pulse" />
    );
  }

  if (!isConnected) {
    return (
      <Button
        size="sm"
        onClick={() => connect({ connector: connectors[0] })}
        loading={isConnecting}
        icon={<Wallet className="h-3.5 w-3.5" />}
      >
        Connect
      </Button>
    );
  }

  const wrongChain = !isSupportedChainId(chainId);

  if (wrongChain) {
    return (
      <Button
        size="sm"
        variant="danger"
        onClick={() => switchChain({ chainId: TARGET_NETWORK.chain.id })}
        loading={isSwitching}
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
      >
        Switch Network
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
        <span className="text-xs font-medium text-[var(--text-primary)]">
          {shortenAddress(address)}
        </span>
      </div>
      <button
        onClick={() => disconnect()}
        className="rounded-full p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
