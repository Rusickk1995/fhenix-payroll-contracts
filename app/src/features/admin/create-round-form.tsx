"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TARGET_NETWORK } from "@/config/app";
import { confidentialPayrollAbi, getDeployment } from "@/lib/contracts";
import { extractErrorMessage } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

interface CreateRoundFormProps {
  onCreated?: () => void;
}

export function CreateRoundForm({ onCreated }: CreateRoundFormProps) {
  const isHydrated = useHydrated();
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");

  const payrollAddress = getDeployment(TARGET_NETWORK.key).ConfidentialPayroll;

  const {
    writeContractAsync,
    data: txHash,
    error: writeError,
    isPending,
  } = useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    chainId: TARGET_NETWORK.chain.id,
    hash: txHash,
    query: { enabled: isHydrated && Boolean(txHash) },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;

    const deadlineTimestamp = deadline
      ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
      : 0n;

    await writeContractAsync({
      address: payrollAddress,
      abi: confidentialPayrollAbi,
      functionName: "createRound",
      args: [name || "Untitled Round", deadlineTimestamp],
      chainId: TARGET_NETWORK.chain.id,
      account: address,
    });

    void queryClient.invalidateQueries({ queryKey: ["rounds"] });
    void queryClient.invalidateQueries({ queryKey: ["protocol-snapshot"] });
    setName("");
    setDeadline("");
    onCreated?.();
  }

  return (
    <Card className="p-6">
      <h3 className="heading-section text-lg text-[var(--text-primary)] mb-5">
        Create New Round
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Round Name"
          placeholder="Q1 2025 Payroll"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Claim Deadline (optional)"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            loading={isPending || receipt.fetchStatus === "fetching"}
            icon={<Plus className="h-4 w-4" />}
          >
            Create Round
          </Button>
        </div>
      </form>

      {writeError && (
        <p className="text-sm text-[var(--danger)] mt-4">
          {extractErrorMessage(writeError)}
        </p>
      )}

      <AnimatePresence>
        {receipt.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-4 text-sm text-[var(--success)]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Round created successfully.
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
