import { requireAdminPage } from "@/lib/admin-session";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { getSiteSettings } from "@/lib/data/settings";
import { HomeCardStyleEditor } from "@/components/admin/home-card-style-editor";
import { getProducts } from "@/lib/data/products";
import { HomeProductOrderManager } from "@/components/admin/home-product-order-manager";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracionPage() {
  await requireAdminPage("settings.manage");
  const [settings, products] = await Promise.all([getSiteSettings(), getProducts({ inStock: true })]);
  return <div className="space-y-10"><header><h1 className="font-display text-3xl font-semibold text-brand-dark">Configuración</h1><p className="mt-1 text-sm text-brand-taupe">Gestiona los datos públicos, las vitrinas del home, redes y footer.</p></header><SiteSettingsForm initialSettings={settings} /><HomeCardStyleEditor initialStyles={settings.categoryCardStyles} /><HomeProductOrderManager initialOrder={settings.homeProductOrder} bestsellers={products} featured={products.filter((product) => product.isFeatured)} /></div>;
}
