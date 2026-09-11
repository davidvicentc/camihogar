import { requireAdminPage } from "@/lib/admin-session";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/data/products";
import { ProductsTable } from "@/components/admin/products-table";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const session = await requireAdminPage("products.read");
  // Sin filtros: trae todo el inventario, incluidos los agotados
  // (inStock indefinido no filtra por disponibilidad).
  const products = await getProducts({});

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tighter text-brand-dark sm:text-3xl">
            Inventario
          </h1>
          <p className="mt-1 text-sm text-brand-taupe">
            {products.length === 1
              ? "1 mueble publicado"
              : `${products.length} muebles publicados`}
          </p>
        </div>
        {session.permissions.includes("products.write") && <Button asChild variant="accent">
          <Link href="/admin/productos/nuevo">
            <PlusCircle aria-hidden="true" />
            Agregar producto
          </Link>
        </Button>}
      </header>

      <ProductsTable products={products} canWrite={session.permissions.includes("products.write")} canDelete={session.permissions.includes("products.delete")} />
    </div>
  );
}
