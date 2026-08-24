"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Personalizador", href: "/personalizar" },
  { label: "Favoritos", href: "/favoritos" },
] as const;

const WHATSAPP_HREF = `https://wa.me/${
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584120000000"
}`;

export function Navbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  // La barra se condensa y gana vidrio al separarse del tope, como en iOS.
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          scrolled
            ? "glass-light border-b border-brand-dark/[0.07] shadow-warm-sm"
            : "border-b border-transparent bg-brand-bg"
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 transition-all duration-300 sm:px-6",
            scrolled ? "h-14" : "h-[4.5rem]"
          )}
        >
          <div className="flex items-center gap-1.5">
            {/* Hamburguesa — abre el drawer lateral en móvil */}
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 md:hidden"
              aria-label="Abrir menú de navegación"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Link
              href="/"
              aria-label="CamiHogar — Ir al inicio"
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-brand-bg"
            >
              <Logo
                priority
                className={cn(
                  "[&>img]:transition-all [&>img]:duration-300 group-hover:[&>img]:scale-[1.06]",
                  scrolled ? "[&>img]:h-7" : "[&>img]:h-9"
                )}
              />
            </Link>
          </div>

          {/* Navegación desktop con pill animada */}
          <nav
            className="hidden items-center gap-0.5 md:flex"
            aria-label="Navegación principal"
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-[0.9rem] font-medium tracking-tight transition-colors",
                    active
                      ? "text-brand-accent"
                      : "text-brand-taupe hover:text-brand-dark"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 rounded-full bg-brand-accent/10 ring-1 ring-inset ring-brand-accent/15"
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}>
            <Button asChild variant="whatsapp" size="sm" className="rounded-full">
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escríbenos por WhatsApp"
              >
                <SiWhatsapp className="h-4 w-4" />
                <span className="hidden sm:inline">Escríbenos</span>
              </a>
            </Button>
          </motion.div>
        </div>

        {/* Filo naranja del logo como remate de la barra */}
        <div
          aria-hidden="true"
          className={cn(
            "h-px w-full bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent transition-opacity duration-300",
            scrolled ? "opacity-100" : "opacity-0"
          )}
        />
      </header>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
