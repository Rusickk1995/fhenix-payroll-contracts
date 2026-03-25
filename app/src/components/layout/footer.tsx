import { Shield } from "lucide-react";
import { REPOSITORY_URL } from "@/config/app";
import { SITE_NAME } from "@/config/constants";

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs">{SITE_NAME}</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              GitHub
            </a>
            <span className="text-xs text-[var(--text-tertiary)]">
              Built on Fhenix CoFHE
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
