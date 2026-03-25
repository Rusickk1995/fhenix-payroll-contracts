"use client";

import { useAccount } from "wagmi";
import { AlertCircle, ShieldCheck, Clock, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ClaimPanel } from "./claim-panel";
import { useMyRounds } from "@/hooks/use-payroll";
import { useHydrated } from "@/hooks/use-hydrated";
import { FadeIn } from "@/components/motion/fade-in";
import { formatDeadline, getClaimStateLabel, getRoundCompletion } from "@/lib/utils";
import type { RoundView } from "@/types/round";

function statusVariant(status: number): "warning" | "success" | "default" {
  if (status === 0) return "warning";
  if (status === 1) return "success";
  return "default";
}

export function AllocationCheck() {
  const isHydrated = useHydrated();
  const { isConnected } = useAccount();
  const myRounds = useMyRounds();

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
        <ShieldCheck className="h-10 w-10 text-[var(--text-tertiary)] mx-auto mb-4" />
        <h3 className="heading-section text-lg text-[var(--text-primary)] mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          Connect the recipient wallet to discover your payroll allocations and claim payouts.
        </p>
      </Card>
    );
  }

  if (myRounds.isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!myRounds.data?.length) {
    return (
      <Card className="text-center py-16">
        <AlertCircle className="h-10 w-10 text-[var(--text-tertiary)] mx-auto mb-4" />
        <h3 className="heading-section text-lg text-[var(--text-primary)] mb-2">
          No Allocations Found
        </h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          This wallet has no configured allocations in any payroll round.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="heading-display text-2xl sm:text-3xl text-[var(--text-primary)]">
              My Payouts
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {myRounds.data.length} round{myRounds.data.length !== 1 ? "s" : ""} with allocations
            </p>
          </div>
        </div>
      </FadeIn>

      <AnimatePresence mode="popLayout">
        {myRounds.data.map((round, i) => (
          <motion.div
            key={round.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <RecipientRoundCard round={round} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function RecipientRoundCard({ round }: { round: RoundView }) {
  return (
    <div className="glass-surface-strong overflow-hidden">
      {/* Round header */}
      <div className="p-5 border-b border-[var(--line)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="heading-section text-lg text-[var(--text-primary)]">
              {round.name || `Round #${round.id}`}
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{formatDeadline(round.claimDeadline)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                <Users className="h-3 w-3" />
                <span className="text-xs">{round.claimedCount}/{round.recipientCount} claimed</span>
              </div>
            </div>
          </div>
          <Badge variant={statusVariant(round.status)} dot={round.status === 1}>
            {getClaimStateLabel(round)}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${getRoundCompletion(round)}%` }} />
          </div>
        </div>
      </div>

      {/* Claim panel */}
      <div className="p-5">
        <ClaimPanel round={round} />
      </div>
    </div>
  );
}
