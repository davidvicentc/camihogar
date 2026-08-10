"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ImageOff, Pencil, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  updatePrice,
} from "@/lib/actions/products";
import type { ActionResult } from "@/lib/actions/products";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";

const numberFormat = new Intl.NumberFormat("es-VE");

export function ProductsTable({ products }: { products: ProductDTO[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductDTO | null>(null);

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

  function savePrice(product: ProductDTO) {
    if (!editing || editing.id !== product._id) return;
    const price = Number(editing.value);
    if (!Number.isFinite(price) || price <= 0) {
      setError("El precio debe ser un número mayor a cero.");
      return;
    }
    setEditing(null);
    run(product._id, () => updatePrice(product._id, price));
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mueble</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead className="text-right">Vistas</TableHead>
            <TableHead className="text-right">Clics WA</TableHead>
            <TableHead>En stock</TableHead>
            <TableHead>Destacado</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
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

              <TableCell>
                {editing?.id === product._id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      autoFocus
                      value={editing.value}
                      onChange={(e) => setEditing({ id: product._id, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePrice(product);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      aria-label={`Nuevo precio de ${product.title}`}
                      className="h-8 w-24 rounded-lg px-2"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Guardar precio"
                      disabled={busy(product._id)}
                      onClick={() => savePrice(product)}
                    >
                      <Check aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Cancelar edición de precio"
                      onClick={() => setEditing(null)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing({ id: product._id, value: String(product.basePrice) })}
                    className="group flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 font-semibold text-brand-dark transition-colors hover:bg-brand-accent/10 hover:text-brand-accent"
                    aria-label={`Editar precio de ${product.title}`}
                  >
                    {formatPrice(product.basePrice)}
                    <Pencil
                      className="h-3 w-3 text-brand-taupe/50 transition-colors group-hover:text-brand-accent"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </TableCell>

              <TableCell className="text-right tabular-nums text-brand-taupe">
                {numberFormat.format(product.metrics.viewsCount)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-brand-taupe">
                {numberFormat.format(product.metrics.whatsappClicksCount)}
              </TableCell>

              <TableCell>
                <Switch
                  checked={product.inStock}
                  disabled={busy(product._id)}
                  onCheckedChange={(checked) =>
                    run(product._id, () => toggleStock(product._id, checked))
                  }
                  aria-label={`En stock: ${product.title}`}
                />
              </TableCell>

              <TableCell>
                <Button
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
                </Button>
              </TableCell>

              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-brand-taupe hover:text-red-600"
                  disabled={busy(product._id)}
                  aria-label={`Eliminar ${product.title}`}
                  onClick={() => setDeleteTarget(product)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
