import { CatalogOptionsManager } from "@/components/admin/catalog-options-manager";
import { getBrands } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export default async function AdminMarcasPage() {
  const brands = await getBrands(true);
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-brand-dark">Marcas</h1>
        <p className="mt-1 text-sm text-brand-taupe">Crea y administra las marcas disponibles para tus productos.</p>
      </header>
      <CatalogOptionsManager kind="marca" initialItems={brands} />
    </div>
  );
}
