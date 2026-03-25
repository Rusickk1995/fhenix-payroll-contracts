import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--line)]",
  success: "bg-[var(--success-dim)] text-[var(--success)] border-[rgba(102,226,172,0.18)]",
  warning: "bg-[var(--warning-dim)] text-[var(--warning)] border-[rgba(245,200,66,0.18)]",
  danger: "bg-[var(--danger-dim)] text-[var(--danger)] border-[rgba(255,152,152,0.18)]",
  accent: "bg-[var(--accent-dim)] text-[var(--accent)] border-[rgba(110,168,254,0.18)]",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "default", dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase whitespace-nowrap",
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </span>
  );
}
