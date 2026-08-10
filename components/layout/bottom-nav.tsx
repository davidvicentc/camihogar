"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Home, Sofa, Wand2 } from "lucide-react";
import { useFavoritesStore } from "@/store/favorites-store";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 300, damping: 24 } as const;

const NAV_ITEMS = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Catálogo", href: "/catalogo", icon: Sofa },
  { label: "Personalizar", href: "/personalizar", icon: Wand2 },
  { label: "Favoritos", href: "/favoritos", icon: Heart },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const favoritesCount = useFavoritesStore((state) => state.items.length);

  // Evita desajustes de hidratación con el store persistido en localStorage.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const showBadge = mounted && favoritesCount > 0;

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-dark/[0.07] pb-safe shadow-warm glass-light md:hidden"
    >
      {/* Filo naranja del logo como remate superior de la barra */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent"
        aria-hidden="true"
      />
      <div className="grid h-[4.25rem] grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const isFavorites = item.href === "/favoritos";

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-brand-accent" : "text-brand-taupe"
              )}
            >
              <motion.span
                whileTap={{ scale: 0.88 }}
                transition={SPRING}
                className="relative flex h-8 w-14 items-center justify-center"
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 rounded-full bg-brand-accent/10 ring-1 ring-inset ring-brand-accent/15"
                    transition={SPRING}
                  />
                )}
                <Icon className="relative z-10 h-5 w-5" aria-hidden="true" />
                {isFavorites && (
                  <AnimatePresence>
                    {showBadge && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={SPRING}
                        aria-label={`${favoritesCount} favoritos guardados`}
                        className="absolute -right-0.5 -top-1 z-20 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-ember-gradient px-1 text-[10px] font-bold leading-none text-white shadow-glow-sm"
                      >
                        {favoritesCount > 9 ? "9+" : favoritesCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                )}
              </motion.span>
              <span className="text-[11px] font-medium leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
