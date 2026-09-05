"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/brand/logo";
import { BRAND, CATEGORY_META } from "@/lib/constants";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { useWhatsAppNumber } from "@/components/layout/whatsapp-settings-provider";
import { buildWhatsAppLinkForNumber } from "@/lib/whatsapp";

const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Favoritos", href: "/favoritos" },
] as const;

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  const pathname = usePathname();
  const whatsappNumber = useWhatsAppNumber();
  const close = () => onOpenChange(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-[86%] max-w-sm flex-col gap-0 overflow-y-auto bg-brand-bg p-0"
      >
        {/* Cabecera oscura, del mismo marrón del logo */}
        <SheetHeader className="relative overflow-hidden bg-brand-dark px-6 pb-6 pt-7 text-left">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-accent/20 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-6 top-1/2 h-24 -translate-y-1/2 opacity-[0.08]"
            aria-hidden="true"
          >
            <LogoMark variant="white" className="h-full" />
          </div>
          <SheetTitle className="relative">
            <Logo surface="dark" className="[&>img]:h-9" />
          </SheetTitle>
          <SheetDescription className="relative text-brand-bg/60">
            {BRAND.tagline}
          </SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-2xl px-4 py-3 font-display text-lg font-semibold tracking-tight transition-colors",
                  active
                    ? "bg-brand-accent/10 text-brand-accent ring-1 ring-inset ring-brand-accent/15"
                    : "text-brand-dark hover:bg-brand-dark/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="mx-6 my-1 bg-brand-dark/10" />

        <div className="px-6 py-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-accent">
            Categorías
          </p>
          <ul className="mt-3 flex flex-col gap-0.5">
            {CATEGORY_META.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/catalogo?categoria=${category.slug}`}
                  onClick={close}
                  className="block rounded-xl px-2 py-2 text-sm tracking-tight text-brand-taupe transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                >
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Separator className="mx-6 my-1 bg-brand-dark/10" />

        <div className="mt-auto flex flex-col gap-4 px-6 pb-8 pt-5">
          <Button asChild variant="accent" className="w-full">
            <a
              href={whatsappNumber ? buildWhatsAppLinkForNumber("¡Hola CamiHogar! Quiero más información sobre sus muebles.", whatsappNumber) : buildWhatsAppLink("¡Hola CamiHogar! Quiero más información sobre sus muebles.")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <SiWhatsapp className="h-4 w-4" />
              Escríbenos por WhatsApp
            </a>
          </Button>
          <a
            href={BRAND.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium tracking-tight text-brand-taupe transition-colors hover:text-brand-accent"
          >
            <Instagram className="h-4 w-4" />
            @camihogar
          </a>
          <p className="text-sm tracking-tight text-brand-taupe/80">
            &ldquo;{BRAND.tagline}&rdquo;
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
