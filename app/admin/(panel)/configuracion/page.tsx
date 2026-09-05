import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { getWhatsAppNumber } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracionPage() {
  return <div className="space-y-6"><header><h1 className="font-display text-3xl font-semibold text-brand-dark">Configuración</h1><p className="mt-1 text-sm text-brand-taupe">Gestiona los datos que usa el catálogo para contactar clientes.</p></header><SiteSettingsForm initialNumber={await getWhatsAppNumber()} /></div>;
}
