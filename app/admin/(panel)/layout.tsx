import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, ExternalLink, Package, PlusCircle } from "lucide-react";
import { LogoutButton } from "@/components/admin/logout-button";
import { Logo, LogoMark } from "@/components/brand/logo";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Panel administrativo — ${BRAND.name}`,
};

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/productos/nuevo", label: "Nuevo producto", icon: PlusCircle },
] as const;

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-dark text-brand-bg lg:flex">
        <div className="px-6 py-8">
          <Link
            href="/admin"
            aria-label={`${BRAND.name} — Panel`}
            className="inline-block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-4 focus-visible:ring-offset-brand-dark"
          >
            <Logo surface="dark" className="[&>img]:h-8" />
          </Link>
          <p className="mt-2 text-xs text-brand-bg/50">{BRAND.tagline}</p>
        </div>

        <nav aria-label="Panel" className="flex-1 space-y-1 px-4">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-brand-bg/70 transition-colors hover:bg-white/10 hover:text-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-4 pb-6">
          <div className="mx-4 mb-3 h-px bg-white/10" aria-hidden="true" />
          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-brand-bg/70 transition-colors hover:bg-white/10 hover:text-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            Ver tienda
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Top bar — móvil */}
      <header className="sticky top-0 z-40 bg-brand-dark lg:hidden">
        <div className="flex items-center gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
          <Link
            href="/admin"
            aria-label={`${BRAND.name} — Panel`}
            className="shrink-0"
          >
            <LogoMark className="h-7" />
          </Link>
          <nav aria-label="Panel" className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-brand-bg/70 transition-colors hover:bg-white/10 hover:text-brand-bg"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </Link>
            ))}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-brand-bg/70 transition-colors hover:bg-white/10 hover:text-brand-bg"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Ver tienda
            </Link>
          </nav>
          <LogoutButton className="w-auto shrink-0 gap-1.5 whitespace-nowrap px-3 py-2 text-xs" />
        </div>
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
