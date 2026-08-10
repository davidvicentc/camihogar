import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-dark text-brand-bg",
        accent: "border-transparent bg-ember-gradient text-white shadow-glow-sm",
        soft: "border-brand-accent/15 bg-brand-accent/10 text-brand-accent",
        outline: "border-brand-dark/15 text-brand-dark",
        muted: "border-transparent bg-secondary text-brand-taupe",
        /* Sobre imágenes y fondos oscuros */
        glass: "border-white/20 text-white glass-dark",
        success: "border-transparent bg-emerald-100 text-emerald-800",
        destructive: "border-transparent bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
