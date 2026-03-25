import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ glow, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "glass-surface p-6",
        glow && "glow-ring",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("heading-section text-xl text-[var(--text-primary)]", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
