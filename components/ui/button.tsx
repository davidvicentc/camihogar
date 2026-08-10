import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-dark text-brand-bg shadow-warm-sm hover:bg-brand-espresso hover:shadow-warm",
        /* Naranja del logo con degradado y luz interna */
        accent:
          "bg-ember-gradient text-white shadow-ember hover:brightness-[1.06] hover:shadow-glow-sm",
        whatsapp: "bg-[#25D366] text-white shadow-warm-sm hover:bg-[#1fb958]",
        outline:
          "border border-brand-dark/15 bg-transparent text-brand-dark hover:border-brand-accent/40 hover:bg-brand-accent/[0.06] hover:text-brand-accent",
        /* Para colocar sobre fondos oscuros (hero, banners) */
        glass:
          "border border-white/25 bg-white/10 text-brand-bg backdrop-blur-md hover:border-white/40 hover:bg-white/[0.18] hover:text-white",
        secondary: "bg-secondary text-secondary-foreground hover:bg-brand-sand",
        ghost: "text-brand-dark hover:bg-brand-dark/5",
        link: "text-brand-accent underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-13 rounded-2xl px-8 py-3 text-[0.95rem]",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
