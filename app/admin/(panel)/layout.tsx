import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  ExternalLink,
  Package,
  PlusCircle,
  Tags,
  BadgeCheck,
  Settings,
  UserRound,
  CircleHelp,
  Images,
  BedDouble,
  type LucideIcon,
} from "lucide-react";
import { GuidedTutorial } from "@/components/admin/guided-tutorial";
import { LogoutButton } from "@/components/admin/logout-button";
import { Logo, LogoMark } from "@/components/brand/logo";
import { requireAdminPage } from "@/lib/admin-session";
import type { Capacidad } from "@/lib/types/fabricacion";
import type { AdminPermission } from "@/lib/types";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Panel administrativo — ${BRAND.name}`,
};

interface EnlaceNav {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * El enlace se ve si quien mira tiene ALGUNA de estas capacidades.
   * Sin lista, lo ve todo el mundo (la tienda no usa capacidades del taller).
   */
  capacidades?: readonly (Capacidad | AdminPermission)[];
}

interface GrupoNav {
  titulo: string;
  enlaces: readonly EnlaceNav[];
}

const NAV_LINKS: readonly GrupoNav[] = [
  {
    titulo: "Tienda",
    enlaces: [
      { href: "/admin", label: "Dashboard", icon: BarChart3 },
      { href: "/admin/productos", label: "Productos", icon: Package, capacidades: ["products.read"] },
      { href: "/admin/productos/nuevo", label: "Nuevo producto", icon: PlusCircle, capacidades: ["products.write"] },
      { href: "/admin/imagenes", label: "Almacenamiento", icon: Images, capacidades: ["products.read"] },
      { href: "/admin/categorias", label: "Categorías", icon: Tags, capacidades: ["categories.manage"] },
      { href: "/admin/opciones-colchones", label: "Opciones de colchones", icon: BedDouble, capacidades: ["categories.manage"] },
      { href: "/admin/marcas", label: "Marcas", icon: BadgeCheck, capacidades: ["brands.manage"] },
      { href: "/admin/configuracion", label: "Configuración", icon: Settings, capacidades: ["settings.manage"] },
      { href: "/admin/usuarios", label: "Usuarios", icon: UserRound, capacidades: ["users.manage"] },
      { href: "/admin/ayuda/productos", label: "Ayuda de productos", icon: CircleHelp, capacidades: ["products.read"] },
    ],
  },
] as const;

const CLASES_ENLACE_ESCRITORIO =
  "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-brand-bg/70 transition-colors hover:bg-white/10 hover:text-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";

const CLASES_ENLACE_MOVIL =
  "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-brand-bg/70 transition-colors hover:bg-white/10 hover:text-brand-bg";

function puedeVer(enlace: EnlaceNav, sesion: Awaited<ReturnType<typeof requireAdminPage>>): boolean {
  if (!enlace.capacidades) return true;
  if (sesion.master) return true;
  return enlace.capacidades.some((capacidad) => sesion.permissions.includes(capacidad));
}

function gruposVisibles(sesion: Awaited<ReturnType<typeof requireAdminPage>>): GrupoNav[] {
  return NAV_LINKS.map((grupo) => ({
    titulo: grupo.titulo,
    enlaces: grupo.enlaces.filter((enlace) => puedeVer(enlace, sesion)),
  })).filter((grupo) => grupo.enlaces.length > 0);
}

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const sesion = await requireAdminPage();
  const grupos = gruposVisibles(sesion);

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

        <nav aria-label="Panel" className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {grupos.map((grupo, indice) => (
            <div key={grupo.titulo} className={indice === 0 ? "space-y-1" : "space-y-1 pt-4"}>
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-bg/40">
                {grupo.titulo}
              </p>
              {grupo.enlaces.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={CLASES_ENLACE_ESCRITORIO}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-4 pb-6">
          <div className="mx-4 mb-3 h-px bg-white/10" aria-hidden="true" />
          <Link href="/" className={CLASES_ENLACE_ESCRITORIO}>
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
            {grupos.map((grupo, indice) => (
              <div key={grupo.titulo} className="flex items-center gap-1">
                {indice > 0 && (
                  <span className="mx-1 h-6 w-px shrink-0 bg-white/15" aria-hidden="true" />
                )}
                <span className="shrink-0 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-bg/40">
                  {grupo.titulo}
                </span>
                {grupo.enlaces.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className={CLASES_ENLACE_MOVIL}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
            <span className="mx-1 h-6 w-px shrink-0 bg-white/15" aria-hidden="true" />
            <Link href="/" className={CLASES_ENLACE_MOVIL}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Ver tienda
            </Link>
          </nav>
          <LogoutButton className="w-auto shrink-0 gap-1.5 whitespace-nowrap px-3 py-2 text-xs" />
        </div>
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <GuidedTutorial userId={sesion.id ?? "owner"} permissions={sesion.permissions} />
          {children}
        </main>
      </div>
    </div>
  );
}
