"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAddress } from "viem";
import { Plus, Upload, UserPlus, CheckCircle2, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TARGET_NETWORK } from "@/config/app";
import { setAllocation } from "@/services/payroll-write-service";
import { extractErrorMessage, formatAmountCompact } from "@/lib/utils";

type AllocationRow = { recipient: string; amount: string };

interface SetAllocationFormProps {
  roundId: number;
  roundName: string;
  onDone?: () => void;
}

export function SetAllocationForm({ roundId, roundName, onDone }: SetAllocationFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_NETWORK.chain.id });
  const { data: walletClient } = useWalletClient({ chainId: TARGET_NETWORK.chain.id });
  const queryClient = useQueryClient();

  const [rows, setRows] = useState<AllocationRow[]>([{ recipient: "", amount: "" }]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [completed, setCompleted] = useState<number[]>([]);

  function addRow() {
    setRows((prev) => [...prev, { recipient: "", amount: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof AllocationRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const dataLines = lines[0]?.toLowerCase().startsWith("recipient") ? lines.slice(1) : lines;

      const parsed: AllocationRow[] = dataLines
        .map((line) => {
          const [recipient, amount] = line.split(",").map((v) => v.trim());
          return { recipient: recipient || "", amount: amount || "" };
        })
        .filter((r) => r.recipient && r.amount);

      if (parsed.length > 0) {
        setRows(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const validRows = rows.filter(
    (r) => isAddress(r.recipient) && /^\d+$/.test(r.amount) && BigInt(r.amount) > 0n,
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!publicClient || !walletClient || !address) {
        throw new Error("Wallet not connected.");
      }

      setCompleted([]);
      setProgress({ current: 0, total: validRows.length });

      for (let i = 0; i < validRows.length; i++) {
        setProgress({ current: i + 1, total: validRows.length });
        const row = validRows[i];
        await setAllocation({
          publicClient,
          walletClient,
          networkKey: TARGET_NETWORK.key,
          roundId: BigInt(roundId),
          recipient: row.recipient as `0x${string}`,
          amount: BigInt(row.amount),
          account: address,
        });
        setCompleted((prev) => [...prev, i]);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rounds"] });
      setProgress(null);
    },
    onError: () => {
      setProgress(null);
    },
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="heading-section text-lg text-[var(--text-primary)]">
            Set Allocations
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Round #{roundId} &mdash; {roundName}
          </p>
        </div>
        <label className="cursor-pointer">
          <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--surface-strong)] border border-[var(--line-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors">
            <Upload className="h-3 w-3" />
            Import CSV
          </span>
        </label>
      </div>

      <div className="space-y-3 mb-4">
        {rows.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Input
                label={i === 0 ? "Recipient Address" : undefined}
                placeholder="0x..."
                value={row.recipient}
                onChange={(e) => updateRow(i, "recipient", e.target.value)}
                error={row.recipient && !isAddress(row.recipient) ? "Invalid address" : undefined}
              />
            </div>
            <div className="w-36">
              <Input
                label={i === 0 ? "Amount" : undefined}
                placeholder="1000"
                value={row.amount}
                onChange={(e) => updateRow(i, "amount", e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              className="p-2.5 text-[var(--text-tertiary)] hover:text-[var(--danger)] disabled:opacity-30 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {completed.includes(i) && (
              <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={addRow}
        >
          Add Row
        </Button>
      </div>

      <div className="mt-5 pt-5 border-t border-[var(--line)] flex items-center justify-between">
        <p className="text-xs text-[var(--text-secondary)]">
          {validRows.length} valid allocation{validRows.length !== 1 ? "s" : ""} &bull;{" "}
          Total: {formatAmountCompact(validRows.reduce((s, r) => s + BigInt(r.amount), 0n))}
        </p>
        <div className="flex items-center gap-3">
          {onDone && (
            <Button variant="ghost" size="sm" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            icon={<UserPlus className="h-3.5 w-3.5" />}
            loading={mutation.isPending}
            disabled={validRows.length === 0}
            onClick={() => mutation.mutate()}
          >
            {progress
              ? `Encrypting ${progress.current}/${progress.total}...`
              : `Set ${validRows.length} Allocation${validRows.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>

      {mutation.error && (
        <p className="text-sm text-[var(--danger)] mt-4">
          {extractErrorMessage(mutation.error)}
        </p>
      )}

      <AnimatePresence>
        {mutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-4 text-sm text-[var(--success)]"
          >
            <CheckCircle2 className="h-4 w-4" />
            All allocations set successfully.
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
