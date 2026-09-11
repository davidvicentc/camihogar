import { requireAdminPage } from "@/lib/admin-session";
import { CatalogOptionsManager } from "@/components/admin/catalog-options-manager";
import { getCategories } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export default async function AdminCategoriasPage() {
  await requireAdminPage("categories.manage");
  const categories = await getCategories(true);
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-brand-dark">Categorías</h1>
        <p className="mt-1 text-sm text-brand-taupe">Crea y administra las categorías que aparecen al crear productos.</p>
      </header>
      <CatalogOptionsManager kind="categoría" initialItems={categories} />
    </div>
  );
}
