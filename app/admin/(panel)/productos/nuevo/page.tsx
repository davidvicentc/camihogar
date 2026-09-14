import { requireAdminPage } from "@/lib/admin-session";
import { ProductEditor } from "@/components/admin/product-editor";
import { getBrands, getCategories } from "@/lib/data/catalog";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { getMattressOptionGroups } from "@/lib/data/mattress-options";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  await requireAdminPage("products.write");
  const [brands, categories, mattressOptions] = await Promise.all([getBrands(), getCategories(), getMattressOptionGroups()]);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-display text-3xl font-semibold text-brand-dark">Nuevo producto</h1>
        <p className="mt-1 text-sm text-brand-taupe">Registra solo la información necesaria para venderlo en el catálogo.</p></div>
        <Link href="/admin/ayuda/productos" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-dark/10 bg-brand-card px-4 text-sm font-semibold text-brand-dark hover:border-brand-accent"><CircleHelp className="h-4 w-4" aria-hidden="true"/>Ver guía</Link>
      </header>
      {brands.length === 0 || categories.length === 0 ? (
        <div className="max-w-3xl rounded-2xl border border-brand-accent/20 bg-brand-accent/5 p-5 text-sm text-brand-dark">
          Antes de crear un producto necesitas registrar al menos una marca y una categoría desde el panel.
        </div>
      ) : <ProductEditor brands={brands} categories={categories} mattressOptions={mattressOptions} />}
    </div>
  );
}
