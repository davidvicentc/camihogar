import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/product-editor";
import { getBrands, getCategories } from "@/lib/data/catalog";
import { getProductById } from "@/lib/data/products";

export const dynamic = "force-dynamic";

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, brands, categories] = await Promise.all([getProductById(id), getBrands(), getCategories()]);
  if (!product) notFound();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-brand-dark">Editar producto</h1>
        <p className="mt-1 text-sm text-brand-taupe">Actualiza nombre, marca, modelo, categoría y variantes.</p>
      </header>
      <ProductEditor product={product} brands={brands} categories={categories} />
    </div>
  );
}
