import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  /** Antetítulo en mayúsculas espaciadas, como el wordmark del logo. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Enlace opcional alineado a la derecha ("Ver todo"). */
  action?: { label: string; href: string };
  /** id para enlazar con el aria-labelledby de la sección. */
  titleId?: string;
  className?: string;
}

/** Encabezado común de las secciones del home: mismo ritmo tipográfico. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  action,
  titleId,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-6 flex items-end justify-between gap-4 md:mb-8",
        className
      )}
    >
      <div>
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-accent">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
          {eyebrow}
        </p>
        <h2
          id={titleId}
          className="mt-2 text-balance font-display text-[1.75rem] font-semibold leading-[1.1] tracking-tighter text-brand-dark md:text-4xl"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed tracking-tight text-brand-taupe md:text-base">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="hidden shrink-0 items-center gap-1 rounded-full border border-brand-dark/10 px-4 py-2 text-sm font-semibold tracking-tight text-brand-dark transition-all hover:border-brand-accent/40 hover:bg-brand-accent/[0.06] hover:text-brand-accent sm:inline-flex"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
