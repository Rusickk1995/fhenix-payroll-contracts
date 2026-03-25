import { cn } from "@/lib/cn";
import { LoaderCircle } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <LoaderCircle
      className={cn("animate-spin text-[var(--accent)]", sizes[size], className)}
    />
  );
}
