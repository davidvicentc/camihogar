"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ChevronDown, Menu } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { cn } from "@/lib/utils";
import { useWhatsAppNumber } from "@/components/layout/whatsapp-settings-provider";
import { buildWhatsAppLinkForNumber } from "@/lib/whatsapp";
import { trackWhatsAppLead } from "@/lib/gtag";
import type { CatalogOptionDTO } from "@/lib/data/catalog";

const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
] as const;

const WHATSAPP_HREF = `https://wa.me/${
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584120000000"
}`;

export function Navbar({ categories }: { categories: Pick<CatalogOptionDTO, "name" | "slug">[] }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const whatsappNumber = useWhatsAppNumber();

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
                    link.href === "/" ? "order-1" : "order-3",
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
            <div className="group relative order-2" onMouseEnter={() => setCategoriesOpen(true)} onMouseLeave={() => setCategoriesOpen(false)} onFocus={() => setCategoriesOpen(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setCategoriesOpen(false); }}>
              <button type="button" aria-expanded={categoriesOpen} aria-haspopup="menu" onClick={() => setCategoriesOpen(true)} className="flex min-h-10 items-center gap-1 rounded-full px-4 py-2 text-[0.9rem] font-medium tracking-tight text-brand-taupe transition-colors hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
                Catálogo <ChevronDown className={cn("h-4 w-4 transition-transform", categoriesOpen && "rotate-180")} />
              </button>
              {categoriesOpen && <div className="absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-2"><div role="menu" className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-card shadow-warm-lg"><div className="p-2">{categories.slice(0, 5).map((category) => <Link key={category.slug} role="menuitem" href={`/catalogo/${category.slug}`} onClick={() => setCategoriesOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-accent/10 hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{category.name}</Link>)}</div><div className="border-t border-brand-dark/10 p-2"><Link href="/catalogo/categorias" role="menuitem" onClick={() => setCategoriesOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold text-brand-accent hover:bg-brand-accent/10">Ver todas las categorías</Link></div></div></div>}
            </div>
          </nav>

          <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}>
            <Button asChild variant="whatsapp" size="sm" className="rounded-full">
              <a
                href={whatsappNumber ? buildWhatsAppLinkForNumber("¡Hola CamiHogar! Quiero más información sobre sus muebles.", whatsappNumber) : WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escríbenos por WhatsApp"
                onClick={() => trackWhatsAppLead(null, { placement: "navbar" })}
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

      <MobileDrawer categories={categories} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
