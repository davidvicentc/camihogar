import { ShieldCheck, Truck } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { BRAND } from "@/lib/constants";

const BADGES = [
  {
    icon: ShieldCheck,
    title: "Compra tranquila",
    text: BRAND.warranty,
  },
  {
    icon: Truck,
    title: "Hasta tu puerta",
    text: BRAND.delivery,
  },
  {
    icon: SiWhatsapp,
    title: "Atención cercana",
    text: "Pide y coordina por WhatsApp",
  },
] as const;

export function TrustBadges() {
  return (
    <section
      aria-label="Beneficios de comprar en CamiHogar"
      className="mx-auto w-full max-w-6xl px-4 md:px-6"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-5">
        {BADGES.map((badge) => (
          <div
            key={badge.title}
            className="group relative flex items-center gap-4 overflow-hidden rounded-[1.5rem] border border-brand-dark/[0.06] bg-brand-card p-4 shadow-warm-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-accent/20 hover:shadow-warm md:p-5"
          >
            {/* Halo naranja que aparece al pasar el cursor */}
            <span
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-accent/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              aria-hidden="true"
            />
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-accent/10 text-brand-accent ring-1 ring-inset ring-brand-accent/15 transition-colors duration-300 group-hover:bg-ember-gradient group-hover:text-white group-hover:ring-transparent">
              <badge.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="relative">
              <p className="text-sm font-semibold tracking-tight text-brand-dark">
                {badge.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed tracking-tight text-brand-taupe">
                {badge.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
