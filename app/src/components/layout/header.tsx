"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { cn } from "@/lib/cn";
import { ConnectButton } from "@/components/wallet/connect-button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Operate" },
  { href: "/claim", label: "Claim" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6ea8fe] to-[#c084fc]">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-white transition-colors">
              Fhenix Payroll
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden sm:flex items-center">
            <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-1 py-1 backdrop-blur-md">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                      isActive
                        ? "bg-[var(--surface-strong)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Wallet */}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
