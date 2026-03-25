"use client";

import { motion } from "framer-motion";
import { Clock, Users, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RoundView } from "@/types/round";
import { formatDeadline, formatAmountCompact, getRoundCompletion, getClaimStateLabel } from "@/lib/utils";

function statusVariant(status: number): "warning" | "success" | "default" {
  if (status === 0) return "warning";
  if (status === 1) return "success";
  return "default";
}

interface RoundCardProps {
  round: RoundView;
  onSelect?: (round: RoundView) => void;
  isSelected?: boolean;
}

export function RoundCard({ round, onSelect, isSelected }: RoundCardProps) {
  const completion = getRoundCompletion(round);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect?.(round)}
      className={`glass-surface glow-ring p-5 cursor-pointer ${isSelected ? "border-[var(--accent)] shadow-[var(--shadow-glow)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h4 className="heading-section text-base text-[var(--text-primary)]">
            {round.name || `Round #${round.id}`}
          </h4>
          <div className="flex items-center gap-1.5 mt-1.5 text-[var(--text-tertiary)]">
            <Clock className="h-3 w-3" />
            <span className="text-xs">{formatDeadline(round.claimDeadline)}</span>
          </div>
        </div>
        <Badge variant={statusVariant(round.status)} dot={round.status === 1}>
          {getClaimStateLabel(round)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="h-3 w-3 text-[var(--text-tertiary)]" />
            <span className="text-[0.625rem] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Recipients</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {round.claimedCount}/{round.recipientCount}
          </span>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3 w-3 text-[var(--text-tertiary)]" />
            <span className="text-[0.625rem] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Funded</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {formatAmountCompact(round.fundedAmount)}
          </span>
        </div>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${completion}%` }} />
      </div>
      <p className="text-[0.625rem] text-[var(--text-tertiary)] mt-1.5">
        {Math.round(completion)}% claimed
      </p>
    </motion.div>
  );
}
