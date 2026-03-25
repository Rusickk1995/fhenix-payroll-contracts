"use client";

import { motion } from "framer-motion";
import { Shield, Eye, Clock, RefreshCw, Users, Lock } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

const features = [
  {
    icon: Shield,
    title: "Fully Homomorphic Encryption",
    description: "Allocations are encrypted using Fhenix CoFHE. The contract never sees plaintext amounts during normal operation.",
  },
  {
    icon: Eye,
    title: "Recipient-Only Reveal",
    description: "Only the wallet that owns the allocation can decrypt and view its amount. No admin, no oracle, no third party.",
  },
  {
    icon: Lock,
    title: "On-Chain Escrow",
    description: "Funds are locked in the contract before the round opens. Recipients claim from verified, exact-match escrow.",
  },
  {
    icon: Clock,
    title: "Configurable Deadlines",
    description: "Each round can have an optional claim deadline. After closing, unclaimed funds are reclaimable by the operator.",
  },
  {
    icon: Users,
    title: "Multi-Recipient Rounds",
    description: "Configure allocations for any number of recipients in a single round. Batch operations via admin tooling.",
  },
  {
    icon: RefreshCw,
    title: "Lifecycle Management",
    description: "Strict state machine: Draft, Open, Closed. Each transition is validated on-chain with clear invariants.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-[var(--space-section)] border-t border-[var(--line)]">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="text-label text-[var(--accent)]">Why Fhenix Payroll</span>
            <h2 className="heading-display text-3xl sm:text-5xl text-[var(--text-primary)] mt-4">
              Privacy without compromise
            </h2>
          </div>
        </FadeIn>

        <Stagger staggerDelay={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="glass-surface p-6 h-full"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-dim)] mb-4">
                  <Icon className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <h3 className="heading-section text-base text-[var(--text-primary)] mb-2">
                  {title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {description}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
