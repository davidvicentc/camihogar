import { ProductEditor } from "@/components/admin/product-editor";
import { getBrands, getCategories } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const [brands, categories] = await Promise.all([getBrands(), getCategories()]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-brand-dark">Nuevo producto</h1>
        <p className="mt-1 text-sm text-brand-taupe">Registra solo la información necesaria para venderlo en el catálogo.</p>
      </header>
      {brands.length === 0 || categories.length === 0 ? (
        <div className="max-w-3xl rounded-2xl border border-brand-accent/20 bg-brand-accent/5 p-5 text-sm text-brand-dark">
          Antes de crear un producto necesitas registrar al menos una marca y una categoría desde el panel.
        </div>
      ) : <ProductEditor brands={brands} categories={categories} />}
    </div>
  );
}
