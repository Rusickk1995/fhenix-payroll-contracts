"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Eye, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-radial from-[rgba(110,168,254,0.06)] via-[rgba(155,124,254,0.03)] to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <FadeIn delay={0.1}>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Powered by Fhenix FHE
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="heading-display text-5xl sm:text-7xl lg:text-8xl text-[var(--text-primary)]">
            Private payouts.
            <br />
            <span className="bg-gradient-to-r from-[#6ea8fe] via-[#9b7cfe] to-[#c084fc] bg-clip-text text-transparent">
              On-chain trust.
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.35}>
          <p className="mt-6 text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Distribute salaries and payouts with fully encrypted allocations.
            Only the recipient can see their amount. Built on homomorphic encryption.
          </p>
        </FadeIn>

        <FadeIn delay={0.5}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link href="/admin">
              <Button size="lg" icon={<Zap className="h-4 w-4" />}>
                Create Payroll Round
              </Button>
            </Link>
            <Link href="/claim">
              <Button size="lg" variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>
                Check My Payout
              </Button>
            </Link>
          </div>
        </FadeIn>

        {/* Feature pills */}
        <FadeIn delay={0.65}>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-16">
            {[
              { icon: Lock, label: "Encrypted allocations" },
              { icon: Eye, label: "Recipient-only reveal" },
              { icon: Zap, label: "One-click claim" },
            ].map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                whileHover={{ y: -2 }}
                className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2"
              >
                <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {label}
                </span>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
