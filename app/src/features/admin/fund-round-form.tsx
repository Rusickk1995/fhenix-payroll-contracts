"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Coins } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TARGET_NETWORK } from "@/config/app";
import {
  approveAndFundRound,
  fetchTokenBalance,
  mintTokens,
} from "@/services/payroll-write-service";
import { extractErrorMessage, formatAmountCompact } from "@/lib/utils";
import type { RoundView } from "@/types/round";

interface FundRoundFormProps {
  round: RoundView;
  onDone?: () => void;
}

export function FundRoundForm({ round, onDone }: FundRoundFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });
  const { data: walletClient } = useWalletClient({ chainId: TARGET_NETWORK.chain.id });
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [mintAmount, setMintAmount] = useState("");

  const balance = useQuery({
    queryKey: ["token-balance", TARGET_NETWORK.key, address],
    enabled: Boolean(address && publicClient),
    queryFn: () =>
      fetchTokenBalance({
        publicClient: publicClient!,
        networkKey: TARGET_NETWORK.key,
        account: address!,
      }),
    refetchInterval: 10_000,
  });

  // Pre-fill with shortfall
  useEffect(() => {
    if (round.fundingShortfall > 0n && !amount) {
      setAmount(round.fundingShortfall.toString());
    }
  }, [round.fundingShortfall]);

  const fundMutation = useMutation({
    mutationFn: async () => {
      if (!publicClient || !walletClient || !address) {
        throw new Error("Wallet not connected.");
      }
      const parsedAmount = BigInt(amount);
      if (parsedAmount <= 0n) throw new Error("Amount must be greater than 0.");

      await approveAndFundRound({
        publicClient,
        walletClient,
        networkKey: TARGET_NETWORK.key,
        roundId: BigInt(round.id),
        amount: parsedAmount,
        account: address,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rounds"] });
      void queryClient.invalidateQueries({ queryKey: ["token-balance"] });
      setAmount("");
    },
  });

  const mintMutation = useMutation({
    mutationFn: async () => {
      if (!publicClient || !walletClient || !address) {
        throw new Error("Wallet not connected.");
      }
      const parsedAmount = BigInt(mintAmount);
      if (parsedAmount <= 0n) throw new Error("Amount must be greater than 0.");

      await mintTokens({
        publicClient,
        walletClient,
        networkKey: TARGET_NETWORK.key,
        to: address,
        amount: parsedAmount,
        account: address,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["token-balance"] });
      setMintAmount("");
    },
  });

  const shortfall = round.fundingShortfall;
  const isFullyFunded = round.isExactFunding || shortfall === 0n;
  const parsedAmount = /^\d+$/.test(amount) ? BigInt(amount) : 0n;
  const insufficientBalance = balance.data !== undefined && parsedAmount > balance.data;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="heading-section text-lg text-[var(--text-primary)]">
            Fund Round
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Round #{round.id} &mdash; {round.name || "Untitled"}
          </p>
        </div>
        {isFullyFunded ? (
          <Badge variant="success" dot>Fully Funded</Badge>
        ) : (
          <Badge variant="warning">Shortfall: {formatAmountCompact(shortfall)}</Badge>
        )}
      </div>

      {/* Funding status */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Funded", value: formatAmountCompact(round.fundedAmount) },
          { label: "Total Allocated", value: formatAmountCompact(round.totalAllocated) },
          { label: "Shortfall", value: formatAmountCompact(shortfall) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-[var(--radius-md)] bg-[var(--surface)] p-3">
            <p className="text-[0.625rem] text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-1">{label}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      {/* Your balance */}
      <div className="flex items-center gap-2 mb-4 text-xs text-[var(--text-secondary)]">
        <Coins className="h-3.5 w-3.5" />
        Your token balance: {balance.data !== undefined ? formatAmountCompact(balance.data) : "..."}
      </div>

      {/* Fund form */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Fund Amount"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            error={insufficientBalance ? "Insufficient token balance" : undefined}
          />
        </div>
        {shortfall > 0n && (
          <button
            type="button"
            onClick={() => setAmount(shortfall.toString())}
            className="text-xs text-[var(--accent)] hover:underline pb-3 whitespace-nowrap"
          >
            Fill shortfall
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onDone && (
            <Button variant="ghost" size="sm" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
        <Button
          size="sm"
          icon={<Banknote className="h-3.5 w-3.5" />}
          loading={fundMutation.isPending}
          disabled={parsedAmount === 0n || insufficientBalance}
          onClick={() => fundMutation.mutate()}
        >
          Approve &amp; Fund
        </Button>
      </div>

      {fundMutation.error && (
        <p className="text-sm text-[var(--danger)] mt-4">
          {extractErrorMessage(fundMutation.error)}
        </p>
      )}

      <AnimatePresence>
        {fundMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-4 text-sm text-[var(--success)]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Round funded successfully.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mint section (dev/localhost only) */}
      {TARGET_NETWORK.key === "localhost" && (
        <div className="mt-6 pt-5 border-t border-[var(--line)]">
          <p className="text-label mb-3">Dev: Mint Test Tokens</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                placeholder="Amount to mint"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={mintMutation.isPending}
              disabled={!mintAmount || mintAmount === "0"}
              onClick={() => mintMutation.mutate()}
            >
              Mint
            </Button>
          </div>
          {mintMutation.error && (
            <p className="text-sm text-[var(--danger)] mt-2">
              {extractErrorMessage(mintMutation.error)}
            </p>
          )}
          {mintMutation.isSuccess && (
            <p className="text-sm text-[var(--success)] mt-2">Tokens minted.</p>
          )}
        </div>
      )}
    </Card>
  );
}
