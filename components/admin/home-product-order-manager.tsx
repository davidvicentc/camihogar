"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveHomeProductOrder } from "@/lib/actions/admin";
import { formatPrice } from "@/lib/utils";
import type { HomeProductSort, HomeSectionOrder, ProductDTO } from "@/lib/types";

type SectionKey = "bestsellers" | "featured";
type OrderState = Record<SectionKey, HomeSectionOrder>;

const SORTS: { value: HomeProductSort; label: string; detail: string }[] = [
  { value: "price-asc", label: "Menor a mayor precio", detail: "La opción recomendada para mostrar primero lo más accesible." },
  { value: "price-desc", label: "Mayor a menor precio", detail: "Muestra primero los productos de precio más alto." },
  { value: "popular", label: "Más populares", detail: "Usa clics de WhatsApp y visitas reales." },
  { value: "recent", label: "Más recientes", detail: "Los últimos productos creados aparecen primero." },
  { value: "manual", label: "Orden manual", detail: "Tú decides la posición exacta con las flechas." },
];

function withMissing(savedIds: string[], products: ProductDTO[]) {
  const valid = savedIds.filter((id) => products.some((product) => product._id === id));
  return [...valid, ...products.map((product) => product._id).filter((id) => !valid.includes(id))];
}

export function HomeProductOrderManager({ initialOrder, bestsellers, featured }: { initialOrder: OrderState; bestsellers: ProductDTO[]; featured: ProductDTO[] }) {
  const [order, setOrder] = useState<OrderState>({ bestsellers: { ...initialOrder.bestsellers, productIds: withMissing(initialOrder.bestsellers.productIds, bestsellers) }, featured: { ...initialOrder.featured, productIds: withMissing(initialOrder.featured.productIds, featured) } });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const productsBySection = useMemo(() => ({ bestsellers, featured }), [bestsellers, featured]);

  function setSort(section: SectionKey, sort: HomeProductSort) { setOrder((current) => ({ ...current, [section]: { ...current[section], sort } })); }
  function move(section: SectionKey, index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order[section].productIds.length) return;
    setOrder((current) => { const ids = [...current[section].productIds]; [ids[index], ids[target]] = [ids[target], ids[index]]; return { ...current, [section]: { ...current[section], productIds: ids } }; });
  }
  function save() { setMessage(""); setError(""); startTransition(async () => { const result = await saveHomeProductOrder(order); if (result.ok) setMessage("El orden del home quedó actualizado."); else setError(result.error ?? "No se pudo guardar."); }); }

  return <section className="space-y-5"><div><h2 className="font-display text-2xl font-semibold text-brand-dark">Orden de productos en el home</h2><p className="mt-1 text-sm text-brand-taupe">Configura cada vitrina por separado. El catálogo general mantiene sus propios filtros.</p></div><div className="grid gap-5 xl:grid-cols-2">{(["bestsellers", "featured"] as const).map((section) => { const products = productsBySection[section]; const selectedSort = SORTS.find((item) => item.value === order[section].sort)!; return <article key={section} className="space-y-5 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-6"><div><p className="text-xs font-semibold text-brand-accent">Sección del home</p><h3 className="mt-1 font-display text-xl font-semibold text-brand-dark">{section === "bestsellers" ? "Los más pedidos" : "Destacados de la casa"}</h3><p className="mt-1 text-sm text-brand-taupe">{section === "bestsellers" ? `Hasta 8 productos disponibles` : `Hasta 6 productos marcados como destacados`}</p></div><div className="space-y-2"><Label htmlFor={`sort-${section}`}>Cómo ordenar</Label><select id={`sort-${section}`} value={order[section].sort} onChange={(event) => setSort(section, event.target.value as HomeProductSort)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-brand-dark"><option value="price-asc">Menor a mayor precio</option><option value="price-desc">Mayor a menor precio</option><option value="popular">Más populares</option><option value="recent">Más recientes</option><option value="manual">Orden manual</option></select><p className="text-xs leading-relaxed text-brand-taupe">{selectedSort.detail}</p></div>{order[section].sort === "manual" && <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">Orden visible</p>{products.length ? <ol className="max-h-[420px] space-y-2 overflow-y-auto pr-1">{order[section].productIds.map((id, index) => { const product = products.find((item) => item._id === id); if (!product) return null; return <li key={id} className="flex items-center gap-2 rounded-xl border border-brand-dark/10 bg-secondary/30 p-2"><GripVertical className="h-4 w-4 shrink-0 text-brand-taupe/50" aria-hidden="true"/><span className="w-6 text-center text-xs tabular-nums text-brand-taupe">{index + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-brand-dark">{product.title}</strong><span className="text-xs text-brand-taupe">{formatPrice(product.basePrice)}</span></span><button type="button" onClick={() => move(section, index, -1)} disabled={index === 0} aria-label={`Subir ${product.title}`} className="rounded-lg p-2 text-brand-taupe hover:bg-white disabled:opacity-25"><ArrowUp className="h-4 w-4"/></button><button type="button" onClick={() => move(section, index, 1)} disabled={index === order[section].productIds.length - 1} aria-label={`Bajar ${product.title}`} className="rounded-lg p-2 text-brand-taupe hover:bg-white disabled:opacity-25"><ArrowDown className="h-4 w-4"/></button></li>; })}</ol> : <p className="rounded-xl border border-dashed border-brand-dark/15 p-4 text-sm text-brand-taupe">No hay productos disponibles en esta sección.</p>}</div>}</article>; })}</div>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700"><Check className="h-4 w-4"/>{message}</p>}<Button type="button" variant="accent" onClick={save} disabled={pending}>{pending ? <Loader2 className="animate-spin"/> : <Save/>}{pending ? "Guardando..." : "Guardar orden del home"}</Button></section>;
}
