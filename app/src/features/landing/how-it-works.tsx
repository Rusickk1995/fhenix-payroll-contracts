"use client";

import { motion } from "framer-motion";
import { FilePlus, DollarSign, ShieldCheck, Unlock } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

const steps = [
  {
    icon: FilePlus,
    title: "Create Round",
    description: "Operator creates a payroll round with a claim deadline and encrypted allocations for each recipient.",
    accent: "#6ea8fe",
  },
  {
    icon: DollarSign,
    title: "Fund & Open",
    description: "Deposit exact funding into the round. Once funded, open it so recipients can begin claiming.",
    accent: "#9b7cfe",
  },
  {
    icon: ShieldCheck,
    title: "Reveal Privately",
    description: "Each recipient connects their wallet and uses FHE to decrypt only their own allocation amount.",
    accent: "#c084fc",
  },
  {
    icon: Unlock,
    title: "Claim Payout",
    description: "One click to claim. Tokens transfer directly to the recipient's wallet from the on-chain escrow.",
    accent: "#66e2ac",
  },
];

export function HowItWorks() {
  return (
    <section className="py-[var(--space-section)]">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="text-label text-[var(--accent)]">Protocol flow</span>
            <h2 className="heading-display text-3xl sm:text-5xl text-[var(--text-primary)] mt-4">
              Four steps to private payroll
            </h2>
            <p className="mt-4 text-[var(--text-secondary)] max-w-xl mx-auto">
              From encrypted configuration to trustless settlement, every step is verifiable on-chain.
            </p>
          </div>
        </FadeIn>

        <Stagger staggerDelay={0.12} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <StaggerItem key={step.title}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="glass-surface glow-ring p-6 h-full flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${step.accent}15`, color: step.accent }}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-tertiary)]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="heading-section text-lg text-[var(--text-primary)] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
