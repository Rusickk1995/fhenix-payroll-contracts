"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Play, Square, RotateCcw, AlertCircle, UserPlus,
  Banknote, ChevronRight, Clock, Users, Coins, CheckCircle2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { RoundCard } from "./round-card";
import { CreateRoundForm } from "./create-round-form";
import { SetAllocationForm } from "./set-allocation-form";
import { FundRoundForm } from "./fund-round-form";
import { useRounds } from "@/hooks/use-rounds";
import { useIsAdmin } from "@/hooks/use-payroll";
import { useHydrated } from "@/hooks/use-hydrated";
import { TARGET_NETWORK } from "@/config/app";
import { confidentialPayrollAbi, getDeployment } from "@/lib/contracts";
import { formatAmountCompact, formatDeadline, extractErrorMessage } from "@/lib/utils";
import type { RoundView } from "@/types/round";

type DetailTab = "overview" | "allocate" | "fund";

export function RoundManagement() {
  const isHydrated = useHydrated();
  const { isConnected, address } = useAccount();
  const isAdmin = useIsAdmin();
  const rounds = useRounds();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });
  const { data: walletClient } = useWalletClient({ chainId: TARGET_NETWORK.chain.id });

  const [selected, setSelected] = useState<RoundView | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const payrollAddress = getDeployment(TARGET_NETWORK.key).ConfidentialPayroll;

  const actionMutation = useMutation({
    mutationFn: async ({ action, roundId }: { action: "open" | "close" | "reclaim"; roundId: number }) => {
      if (!walletClient || !address) throw new Error("Wallet not connected.");
      const fnName = action === "open" ? "openRound" : action === "close" ? "closeRound" : "reclaimRoundBalance";
      const hash = await walletClient.writeContract({
        address: payrollAddress,
        abi: confidentialPayrollAbi,
        functionName: fnName,
        args: [BigInt(roundId)],
        chain: TARGET_NETWORK.chain,
        account: address,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rounds"] });
      void queryClient.invalidateQueries({ queryKey: ["protocol-snapshot"] });
    },
  });

  // Refresh selected round data from rounds list
  const selectedRound = selected
    ? rounds.data?.find((r) => r.id === selected.id) ?? selected
    : null;

  function handleSelect(round: RoundView) {
    setSelected(round);
    setDetailTab("overview");
    actionMutation.reset();
  }

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Card className="text-center py-16">
        <AlertCircle className="h-10 w-10 text-[var(--text-tertiary)] mx-auto mb-4" />
        <h3 className="heading-section text-lg text-[var(--text-primary)] mb-2">
          Connect Wallet
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Connect the contract owner wallet to manage payroll rounds.
        </p>
      </Card>
    );
  }

  if (isAdmin.data === false) {
    return (
      <Card className="text-center py-16">
        <AlertCircle className="h-10 w-10 text-[var(--warning)] mx-auto mb-4" />
        <h3 className="heading-section text-lg text-[var(--text-primary)] mb-2">
          Not Authorized
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          This wallet is not the contract owner. Admin operations require the deployer wallet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-display text-2xl sm:text-3xl text-[var(--text-primary)]">
            Payroll Rounds
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {rounds.data?.length ?? 0} round{(rounds.data?.length ?? 0) !== 1 ? "s" : ""} indexed
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? "secondary" : "primary"} size="sm">
          {showCreate ? "Cancel" : "New Round"}
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CreateRoundForm onCreated={() => setShowCreate(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round grid */}
      {rounds.isPending ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : rounds.data?.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-sm text-[var(--text-secondary)]">
            No rounds created yet. Create the first payroll round.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rounds.data?.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              onSelect={handleSelect}
              isSelected={selectedRound?.id === round.id}
            />
          ))}
        </div>
      )}

      {/* Selected round detail panel */}
      <AnimatePresence>
        {selectedRound && (
          <motion.div
            key={selectedRound.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-4"
          >
            {/* Tab navigation */}
            <div className="glass-surface-strong p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant={selectedRound.status === 0 ? "warning" : selectedRound.status === 1 ? "success" : "default"} dot={selectedRound.status === 1}>
                    {selectedRound.status === 0 ? "Draft" : selectedRound.status === 1 ? "Open" : "Closed"}
                  </Badge>
                  <h3 className="heading-section text-xl text-[var(--text-primary)] mt-3">
                    {selectedRound.name || `Round #${selectedRound.id}`}
                  </h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Tabs (only show allocate/fund for Draft rounds) */}
              <div className="flex gap-1 p-1 rounded-full bg-[var(--surface)]">
                {(
                  [
                    { key: "overview" as DetailTab, label: "Overview", icon: ChevronRight },
                    ...(selectedRound.status === 0
                      ? [
                          { key: "allocate" as DetailTab, label: "Allocations", icon: UserPlus },
                          { key: "fund" as DetailTab, label: "Funding", icon: Banknote },
                        ]
                      : []),
                  ]
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setDetailTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      detailTab === key
                        ? "bg-[var(--surface-strong)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {detailTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <RoundOverviewPanel
                    round={selectedRound}
                    onAction={(action) => actionMutation.mutate({ action, roundId: selectedRound.id })}
                    actionPending={actionMutation.isPending}
                    actionError={actionMutation.error}
                  />
                </motion.div>
              )}
              {detailTab === "allocate" && (
                <motion.div
                  key="allocate"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SetAllocationForm
                    roundId={selectedRound.id}
                    roundName={selectedRound.name || `Round #${selectedRound.id}`}
                    onDone={() => setDetailTab("overview")}
                  />
                </motion.div>
              )}
              {detailTab === "fund" && (
                <motion.div
                  key="fund"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <FundRoundForm
                    round={selectedRound}
                    onDone={() => setDetailTab("overview")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Overview sub-panel ── */

function RoundOverviewPanel({
  round,
  onAction,
  actionPending,
  actionError,
}: {
  round: RoundView;
  onAction: (action: "open" | "close" | "reclaim") => void;
  actionPending: boolean;
  actionError: Error | null;
}) {
  const isFullyFunded = round.isExactFunding || round.fundingShortfall === 0n;
  const hasAllocations = round.recipientCount > 0;
  const deadlinePassed = round.claimDeadline > 0n && Number(round.claimDeadline) * 1000 < Date.now();

  // Determine why round can't be opened
  const openBlockers: string[] = [];
  if (round.status === 0) {
    if (!hasAllocations) openBlockers.push("No allocations set");
    if (!isFullyFunded) openBlockers.push(`Funding shortfall: ${formatAmountCompact(round.fundingShortfall)}`);
    if (deadlinePassed) openBlockers.push("Claim deadline has already passed");
  }

  return (
    <Card className="p-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Recipients", value: String(round.recipientCount), icon: Users },
          { label: "Claimed", value: `${round.claimedCount}/${round.recipientCount}`, icon: CheckCircle2 },
          { label: "Funded", value: formatAmountCompact(round.fundedAmount), icon: Coins },
          { label: "Allocated", value: formatAmountCompact(round.totalAllocated), icon: Banknote },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[var(--radius-md)] bg-[var(--surface)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3 w-3 text-[var(--text-tertiary)]" />
              <p className="text-[0.625rem] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">{label}</p>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      {/* Additional info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <InfoRow label="Deadline" value={formatDeadline(round.claimDeadline)} />
        <InfoRow label="Funding Status" value={isFullyFunded ? "Fully funded" : `Shortfall: ${formatAmountCompact(round.fundingShortfall)}`} />
        <InfoRow label="Claim Active" value={round.claimActive ? "Yes" : "No"} />
        <InfoRow label="Openable" value={round.openable ? "Yes" : "No"} />
        <InfoRow label="Total Claimed" value={formatAmountCompact(round.totalClaimed)} />
        <InfoRow label="Reclaimable" value={formatAmountCompact(round.reclaimableAmount)} />
      </div>

      {/* Open blockers (only in Draft) */}
      {round.status === 0 && openBlockers.length > 0 && (
        <div className="rounded-[var(--radius-md)] bg-[var(--warning-dim)] border border-[rgba(245,200,66,0.18)] p-3 mb-6">
          <p className="text-xs font-semibold text-[var(--warning)] mb-1.5">Cannot open round yet:</p>
          <ul className="space-y-1">
            {openBlockers.map((b) => (
              <li key={b} className="text-xs text-[var(--warning)] flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[var(--warning)]" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {round.status === 0 && round.openable && (
          <Button
            size="sm"
            icon={<Play className="h-3.5 w-3.5" />}
            loading={actionPending}
            onClick={() => onAction("open")}
          >
            Open Round
          </Button>
        )}
        {round.status === 1 && (
          <Button
            size="sm"
            variant="secondary"
            icon={<Square className="h-3.5 w-3.5" />}
            loading={actionPending}
            onClick={() => onAction("close")}
          >
            Close Round
          </Button>
        )}
        {round.status === 2 && round.reclaimableAmount > 0n && (
          <Button
            size="sm"
            variant="secondary"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            loading={actionPending}
            onClick={() => onAction("reclaim")}
          >
            Reclaim {formatAmountCompact(round.reclaimableAmount)}
          </Button>
        )}
      </div>

      {actionError && (
        <p className="text-sm text-[var(--danger)] mt-4">
          {extractErrorMessage(actionError)}
        </p>
      )}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface)] p-3">
      <p className="text-[0.625rem] text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-xs font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
