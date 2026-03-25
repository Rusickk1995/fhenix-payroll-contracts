"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Sparkles, CheckCircle2, LoaderCircle, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { TARGET_NETWORK } from "@/config/app";
import { confidentialPayrollAbi, getDeployment } from "@/lib/contracts";
import { readPrivateAllocation } from "@/services/fhenix-service";
import { usePersonalStatus } from "@/hooks/use-payroll";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatAmount, extractErrorMessage, getExplorerLink } from "@/lib/utils";
import type { RoundView } from "@/types/round";

export function ClaimPanel({ round }: { round: RoundView }) {
  const isHydrated = useHydrated();
  const queryClient = useQueryClient();
  const account = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });
  const { data: walletClient } = useWalletClient({ chainId: TARGET_NETWORK.chain.id });
  const personalStatus = usePersonalStatus(round.id);

  const payrollAddress = getDeployment(TARGET_NETWORK.key).ConfidentialPayroll;

  const {
    writeContractAsync,
    data: claimHash,
    error: claimError,
    isPending: isClaimPending,
  } = useWriteContract();

  const claimReceipt = useWaitForTransactionReceipt({
    chainId: TARGET_NETWORK.chain.id,
    hash: claimHash,
    query: { enabled: isHydrated && Boolean(claimHash) },
  });

  const allocationReveal = useMutation({
    mutationKey: ["reveal", TARGET_NETWORK.key, round.id, account.address],
    mutationFn: async () => {
      if (!publicClient || !account.address) throw new Error("Wallet required.");
      return readPrivateAllocation({
        publicClient,
        walletClient,
        networkKey: TARGET_NETWORK.key,
        roundId: BigInt(round.id),
        account: account.address,
      });
    },
  });

  useEffect(() => {
    if (!claimReceipt.isSuccess) return;
    void queryClient.invalidateQueries({ queryKey: ["rounds"] });
    void queryClient.invalidateQueries({ queryKey: ["my-rounds"] });
    void queryClient.invalidateQueries({ queryKey: ["personal-status", TARGET_NETWORK.key, round.id] });
    void queryClient.invalidateQueries({ queryKey: ["protocol-snapshot"] });
  }, [claimReceipt.isSuccess, queryClient, round.id]);

  useEffect(() => {
    allocationReveal.reset();
  }, [account.address, round.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasAllocation = Boolean(personalStatus.data?.hasAllocation);
  const hasClaimed = Boolean(personalStatus.data?.claimed || claimReceipt.isSuccess);
  const canClaim = Boolean(personalStatus.data?.canClaim);
  const isClaimBusy = Boolean(claimHash && (isClaimPending || claimReceipt.fetchStatus === "fetching"));

  const claimTxLink =
    claimHash && TARGET_NETWORK.chain.blockExplorers?.default.url
      ? getExplorerLink(TARGET_NETWORK.chain.blockExplorers.default.url, "tx", claimHash)
      : undefined;

  async function handleClaim() {
    if (!account.address) return;
    await writeContractAsync({
      address: payrollAddress,
      abi: confidentialPayrollAbi,
      functionName: "claim",
      args: [BigInt(round.id)],
      chainId: TARGET_NETWORK.chain.id,
      account: account.address,
    });
  }

  if (!hasAllocation && !personalStatus.isPending) {
    return (
      <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
        <ShieldCheck className="h-4 w-4 text-[var(--text-tertiary)]" />
        Checking membership...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Already claimed banner */}
      {hasClaimed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--success-dim)] border border-[rgba(102,226,172,0.18)] p-4"
        >
          <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
          <span className="text-sm text-[var(--success)]">
            Payout claimed successfully.
          </span>
        </motion.div>
      )}

      {/* Reveal section */}
      {hasAllocation && !hasClaimed && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Private Allocation
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Only your wallet can decrypt this amount via FHE.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => allocationReveal.mutate()}
              loading={allocationReveal.isPending}
              icon={<Eye className="h-3.5 w-3.5" />}
            >
              {allocationReveal.data ? "Reveal again" : "Reveal"}
            </Button>
          </div>

          <AnimatePresence>
            {allocationReveal.data && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-[var(--radius-md)] bg-[var(--cyan-dim)] border border-[rgba(112,221,255,0.18)] px-4 py-3"
              >
                <p className="text-label text-[var(--cyan)]">Decrypted amount</p>
                <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
                  {formatAmount(allocationReveal.data.amount)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {allocationReveal.error && (
            <p className="text-xs text-[var(--danger)] mt-3">
              {extractErrorMessage(allocationReveal.error)}
            </p>
          )}
        </div>
      )}

      {/* Claim button */}
      {hasAllocation && !hasClaimed && (
        <Button
          className="w-full"
          onClick={() => void handleClaim()}
          disabled={!canClaim || isClaimBusy}
          loading={isClaimBusy}
          icon={<Sparkles className="h-4 w-4" />}
        >
          {isClaimBusy
            ? "Confirming..."
            : canClaim
              ? "Claim Payout"
              : round.status === 0
                ? "Round Not Open"
                : round.status === 2
                  ? "Round Closed"
                  : "Claim Inactive"}
        </Button>
      )}

      {/* Transaction status */}
      <AnimatePresence>
        {claimHash && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[var(--radius-md)] bg-[var(--surface)] p-3"
          >
            <p className="text-xs text-[var(--text-secondary)]">
              {claimReceipt.isSuccess
                ? "Confirmed on-chain."
                : isClaimBusy
                  ? "Waiting for confirmation..."
                  : "Transaction submitted."}
            </p>
            {claimTxLink && (
              <a
                href={claimTxLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline mt-1"
              >
                View transaction <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {claimError && (
        <p className="text-xs text-[var(--danger)]">
          {extractErrorMessage(claimError)}
        </p>
      )}
    </div>
  );
}
