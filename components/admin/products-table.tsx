"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, ExternalLink, ImageOff, Pencil, Search, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteProduct,
  toggleFeatured,
  toggleStock,
} from "@/lib/actions/products";
import type { ActionResult } from "@/lib/actions/products";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";

const numberFormat = new Intl.NumberFormat("es-VE");

export function ProductsTable({ products, canWrite = false, canDelete = false }: { products: ProductDTO[]; canWrite?: boolean; canDelete?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductDTO | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort((a, b) => a.localeCompare(b, "es")),
    [products]
  );
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const searchable = `${product.title} ${product.brand} ${product.sku} ${product.category}`.toLocaleLowerCase("es");
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, products, query]);

  const busy = (id: string) => isPending && pendingId === id;

  function run(id: string, action: () => Promise<ActionResult>) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Algo salió mal. Inténtalo de nuevo.");
      }
      setPendingId(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    setDeleteTarget(null);
    run(id, () => deleteProduct(id));
  }

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-dark/15 bg-brand-card p-10 text-center shadow-warm-sm">
        <p className="font-display text-lg font-semibold text-brand-dark">
          Tu inventario está vacío
        </p>
        <p className="mt-1 text-sm text-brand-taupe">
          Publica tu primer mueble y empieza a llenar hogares de calidez.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setError(null)}
            className="rounded-full p-1 transition-colors hover:bg-red-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-brand-dark/10 bg-brand-card p-3 shadow-warm-sm sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar productos</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-taupe" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, marca, SKU o categoría" className="pl-9" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm text-brand-dark">
          <option value="all">Todas las categorías</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <p className="shrink-0 text-xs tabular-nums text-brand-taupe">{visibleProducts.length} de {products.length}</p>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-dark/15 bg-brand-card p-8 text-center">
          <p className="font-semibold text-brand-dark">No encontramos productos</p>
          <p className="mt-1 text-sm text-brand-taupe">Prueba otra búsqueda o categoría.</p>
        </div>
      ) : <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mueble</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead className="text-right">Vistas</TableHead>
            <TableHead className="text-right">Clics WA</TableHead>
            <TableHead>En stock</TableHead>
            <TableHead>Destacado</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleProducts.map((product) => (
            <TableRow key={product._id} className={cn(busy(product._id) && "opacity-60")}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-brand-taupe/50">
                        <ImageOff className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="max-w-[220px] truncate font-medium text-brand-dark">
                      {product.title}
                    </p>
                    <p className="text-xs text-brand-taupe">{product.category}</p>
                  </div>
                </div>
              </TableCell>

              <TableCell><span className="font-semibold text-brand-dark">{formatPrice(product.basePrice)}</span>{product.variants && product.variants.length > 1 && <span className="ml-2 text-xs text-brand-taupe">{product.variants.length} variantes</span>}</TableCell>

              <TableCell className="text-right tabular-nums text-brand-taupe">
                {numberFormat.format(product.metrics.viewsCount)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-brand-taupe">
                {numberFormat.format(product.metrics.whatsappClicksCount)}
              </TableCell>

              <TableCell>
                <Switch
                  checked={product.inStock}
                  disabled={!canWrite || busy(product._id)}
                  onCheckedChange={(checked) =>
                    run(product._id, () => toggleStock(product._id, checked))
                  }
                  aria-label={`En stock: ${product.title}`}
                />
              </TableCell>

              <TableCell>
                {canWrite && <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={busy(product._id)}
                  aria-label={
                    product.isFeatured
                      ? `Quitar ${product.title} de destacados`
                      : `Destacar ${product.title}`
                  }
                  onClick={() =>
                    run(product._id, () => toggleFeatured(product._id, !product.isFeatured))
                  }
                >
                  <Star
                    className={cn(
                      product.isFeatured
                        ? "fill-brand-accent text-brand-accent"
                        : "text-brand-taupe"
                    )}
                    aria-hidden="true"
                  />
                </Button>}
              </TableCell>

              <TableCell>
                <div className="flex justify-end gap-1">
                <Button asChild type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label={`Ver ${product.title} en la tienda`}><Link href={`/producto/${product.slug}`} target="_blank"><ExternalLink aria-hidden="true" /></Link></Button>
                {canWrite && <Button asChild type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label={`Editar ${product.title}`}><Link href={`/admin/productos/${product._id}/editar`}><Pencil aria-hidden="true" /></Link></Button>}
                {canDelete && <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-brand-taupe hover:text-red-600"
                  disabled={busy(product._id)}
                  aria-label={`Eliminar ${product.title}`}
                  onClick={() => setDeleteTarget(product)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar {deleteTarget?.title}?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El mueble desaparecerá de la tienda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={confirmDelete}
            >
              <Trash2 aria-hidden="true" />
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
