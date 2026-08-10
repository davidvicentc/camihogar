import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
  className?: string;
}

/**
 * Tarjeta compacta de métrica para el dashboard del admin.
 * Server-safe: sin hooks ni interactividad.
 */
export function StatCard({ label, value, icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-3xl font-semibold text-brand-dark">
            {value}
          </p>
          <p className="text-sm text-brand-taupe">{label}</p>
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-brand-taupe/80">{hint}</p>}
    </div>
  );
}
