import { requireAdminPage } from "@/lib/admin-session";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { getSiteSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracionPage() {
  await requireAdminPage("settings.manage");
  return <div className="space-y-6"><header><h1 className="font-display text-3xl font-semibold text-brand-dark">Configuración</h1><p className="mt-1 text-sm text-brand-taupe">Gestiona los datos públicos del catálogo, redes y footer.</p></header><SiteSettingsForm initialSettings={await getSiteSettings()} /></div>;
}
