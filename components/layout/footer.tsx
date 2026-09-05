import Link from "next/link";
import { Facebook, Instagram, ShieldCheck, Truck } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { LogoLockup } from "@/components/brand/logo";
import { VicentStudiosCredit } from "@/components/brand/vicent-studios";
import { BRAND } from "@/lib/constants";
import { getCategories } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/data/settings";
import { buildWhatsAppLinkForNumber } from "@/lib/whatsapp";

const HELP_LINKS = [
  { label: "Garantía", href: "#" },
  { label: "Entregas", href: "#" },
  { label: "Contacto", href: "#" },
] as const;

export async function Footer() {
  const year = new Date().getFullYear();
  const [categories, settings] = await Promise.all([getCategories(), getSiteSettings()]);
  const whatsappHref = buildWhatsAppLinkForNumber(
    "¡Hola CamiHogar! Quiero más información sobre sus muebles."
    , settings.whatsappNumber
  );

  return (
    /* El fondo es el marrón exacto del logo, así el lockup se integra sin caja */
    <footer className="relative mb-[calc(4.25rem+env(safe-area-inset-bottom))] overflow-hidden bg-brand-dark text-brand-bg md:mb-0">
      <div
        className="pointer-events-none absolute inset-0 logo-grid opacity-30 [mask-image:radial-gradient(ellipse_60%_70%_at_20%_0%,black,transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-accent/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          {/* Marca — lockup oficial completo */}
          <div>
            <Link
              href="/"
              aria-label="CamiHogar — Ir al inicio"
              className="inline-block rounded-2xl transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-4 focus-visible:ring-offset-brand-dark"
            >
              <LogoLockup surface="dark" className="w-44 md:w-52" />
            </Link>
            <p className="mt-5 max-w-xs text-pretty text-[0.95rem] leading-relaxed tracking-tight text-brand-bg/60">
              {settings.tagline}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de CamiHogar"
                className="rounded-full border border-brand-bg/15 p-2.5 transition-all hover:border-brand-accent hover:bg-brand-accent hover:text-white hover:shadow-glow-sm"
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escríbenos por WhatsApp"
                className="rounded-full border border-brand-bg/15 p-2.5 transition-colors hover:border-[#25D366] hover:bg-[#25D366] hover:text-white"
              >
                <SiWhatsapp className="h-5 w-5" aria-hidden="true" />
              </a>
              {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook de CamiHogar" className="rounded-full border border-brand-bg/15 p-2.5 transition-all hover:border-brand-accent hover:bg-brand-accent hover:text-white"><Facebook className="h-5 w-5" aria-hidden="true" /></a>}
            </div>
          </div>

          {/* Categorías */}
          <nav aria-label="Categorías">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-accent">
              Categorías
            </h3>
            <ul className="mt-5 flex flex-col gap-2.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/catalogo?categoria=${category.slug}`}
                    className="text-sm tracking-tight text-brand-bg/60 transition-colors hover:text-brand-accent"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Ayuda */}
          <nav aria-label="Ayuda">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-accent">
              Ayuda
            </h3>
            <ul className="mt-5 flex flex-col gap-2.5">
              {HELP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm tracking-tight text-brand-bg/60 transition-colors hover:text-brand-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Sellos de confianza */}
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          {[
            { icon: ShieldCheck, text: settings.warrantyText },
            { icon: Truck, text: settings.deliveryText },
          ].map((badge) => (
            <div
              key={badge.text}
              className="flex flex-1 items-center gap-3 rounded-2xl border border-brand-bg/10 bg-brand-bg/[0.04] px-5 py-4"
            >
              <badge.icon
                className="h-6 w-6 shrink-0 text-brand-accent"
                aria-hidden="true"
              />
              <p className="text-sm font-medium tracking-tight text-brand-bg/85">
                {badge.text}
              </p>
            </div>
          ))}
        </div>

        {/* Línea final, rematada con la regla naranja del logo */}
        <div className="mt-12">
          <div
            className="h-px w-full bg-gradient-to-r from-transparent via-brand-accent/45 to-transparent"
            aria-hidden="true"
          />
          <div className="flex flex-col items-center justify-between gap-2 pt-6 text-sm text-brand-bg/45 sm:flex-row">
            <p>
              © {year} {BRAND.name}. Todos los derechos reservados.
            </p>
            <VicentStudiosCredit />
          </div>
        </div>
      </div>
    </footer>
  );
}
