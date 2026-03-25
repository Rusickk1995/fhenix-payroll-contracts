"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { useProtocolSnapshot } from "@/hooks/use-rounds";
import { formatAmountCompact } from "@/lib/utils";

export function ProtocolStats() {
  const snapshot = useProtocolSnapshot();

  const stats = [
    {
      label: "Total Rounds",
      value: snapshot.data ? String(snapshot.data.totalRounds) : "--",
    },
    {
      label: "Open Rounds",
      value: snapshot.data ? String(snapshot.data.openRounds) : "--",
    },
    {
      label: "Total Funded",
      value: snapshot.data ? formatAmountCompact(snapshot.data.totalFunded) : "--",
    },
    {
      label: "Total Claimed",
      value: snapshot.data ? formatAmountCompact(snapshot.data.totalClaimed) : "--",
    },
  ];

  return (
    <section className="py-[var(--space-section)] border-t border-[var(--line)]">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <span className="text-label text-[var(--accent)]">Live Protocol</span>
            <h2 className="heading-display text-3xl sm:text-5xl text-[var(--text-primary)] mt-4">
              On-chain state
            </h2>
          </div>
        </FadeIn>

        <Stagger staggerDelay={0.1} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ label, value }) => (
            <StaggerItem key={label}>
              <div className="glass-surface p-6 text-center">
                <p className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                  {value}
                </p>
                <p className="text-label mt-3">{label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
