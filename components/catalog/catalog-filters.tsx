"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { List, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/utils";
const SORT_OPTIONS = [
  { value: "recent", label: "Más recientes" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "popular", label: "Más populares" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

interface CatalogFiltersProps {
  priceRange: { min: number; max: number };
  total: number;
  categories: { name: string; slug: string; image?: string; description?: string; productCount?: number }[];
  colors?: string[];
  sizes?: string[];
}

export function CatalogFilters({ priceRange, total, colors = [], sizes = [] }: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");

  // Rango real del slider (evita un track degenerado si min === max)
  const sliderMin = priceRange.min;
  const sliderMax = Math.max(priceRange.max, priceRange.min + 1);
  const sliderStep = Math.max(1, Math.round((sliderMax - sliderMin) / 100));

  const [open, setOpen] = React.useState(false);
  const [draftPrice, setDraftPrice] = React.useState<[number, number]>([
    sliderMin,
    sliderMax,
  ]);
  const [draftInStock, setDraftInStock] = React.useState(false);
  const [draftColor, setDraftColor] = React.useState("all");
  const [draftSize, setDraftSize] = React.useState("all");
  const activeSort = SORT_OPTIONS.some((option) => option.value === searchParams.get("orden"))
    ? (searchParams.get("orden") as SortValue)
    : "recent";

  const navigate = React.useCallback(
    (params: URLSearchParams) => {
      params.delete("categoria");
      if (pathname === "/catalogo") params.set("ver", "todos");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const clean = query.trim();
    if (clean) params.set("q", clean); else params.delete("q");
    navigate(params);
  }

  function setSort(value: SortValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "recent") params.delete("orden"); else params.set("orden", value);
    navigate(params);
  }

  /** Al abrir el sheet sincronizamos los borradores con la URL actual. */
  function handleOpenChange(next: boolean) {
    if (next) {
      const minParam = Number.parseFloat(searchParams.get("precioMin") ?? "");
      const maxParam = Number.parseFloat(searchParams.get("precioMax") ?? "");
      setDraftPrice([
        Number.isFinite(minParam)
          ? Math.min(Math.max(minParam, sliderMin), sliderMax)
          : sliderMin,
        Number.isFinite(maxParam)
          ? Math.min(Math.max(maxParam, sliderMin), sliderMax)
          : sliderMax,
      ]);
      setDraftInStock(searchParams.get("disponibles") === "1");
      setDraftColor(searchParams.get("color") ?? "all");
      setDraftSize(searchParams.get("medida") ?? "all");
    }
    setOpen(next);
  }

  /** El sheet solo escribe la URL al pulsar "Aplicar". */
  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    if (draftPrice[0] > sliderMin) {
      params.set("precioMin", String(draftPrice[0]));
    } else {
      params.delete("precioMin");
    }
    if (draftPrice[1] < sliderMax) {
      params.set("precioMax", String(draftPrice[1]));
    } else {
      params.delete("precioMax");
    }
    if (draftInStock) {
      params.set("disponibles", "1");
    } else {
      params.delete("disponibles");
    }
    if (draftColor !== "all") params.set("color", draftColor); else params.delete("color");
    if (draftSize !== "all") params.set("medida", draftSize); else params.delete("medida");

    navigate(params);
    setOpen(false);
  }

  function clearFilters() {
    setDraftPrice([sliderMin, sliderMax]);
    setDraftInStock(false);
    setDraftColor("all"); setDraftSize("all");
    const params = new URLSearchParams(searchParams.toString());
    ["precioMin", "precioMax", "disponibles", "color", "medida"].forEach((key) => params.delete(key));
    navigate(params);
    setOpen(false);
  }

  const advancedCount =
    (searchParams.has("precioMin") || searchParams.has("precioMax") ? 1 : 0) +
    (searchParams.get("disponibles") === "1" ? 1 : 0) +
    (searchParams.has("color") ? 1 : 0) +
    (searchParams.has("medida") ? 1 : 0);

  return (
    <div className="rounded-2xl border border-brand-dark/10 bg-brand-card p-2 shadow-warm-sm">
      <h2 className="sr-only">Buscar y filtrar el catálogo</h2>
      <div className="flex flex-col gap-2 lg:flex-row">
        <form onSubmit={submitSearch} role="search" className="flex min-w-0 flex-1 gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar productos</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-taupe" aria-hidden="true" />
            <input name="buscar" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="¿Qué mueble buscas?" className="h-11 w-full rounded-xl border border-brand-dark/15 bg-brand-bg pl-11 pr-10 text-base text-brand-dark outline-none transition-colors placeholder:text-brand-taupe/70 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda" className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-brand-taupe hover:bg-brand-dark/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4" aria-hidden="true" /></button>}
          </label>
          <Button type="submit" variant="accent" className="h-11 shrink-0 px-4">Buscar</Button>
        </form>

        <div className="grid grid-cols-3 gap-2 lg:flex lg:shrink-0">
          <Button asChild variant="outline" className="h-11 min-w-0 justify-start rounded-xl bg-brand-card px-3 lg:w-52"><Link href="/catalogo/categorias"><List className="h-4 w-4 shrink-0" aria-hidden="true"/><span>Categorías</span></Link></Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="relative h-11 min-w-0 justify-center rounded-xl border-brand-dark/15 bg-brand-card px-3"
            aria-label="Abrir filtros avanzados"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filtrar</span>
            {advancedCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white">
                {advancedCount}
              </span>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto pb-safe sm:mx-auto sm:max-w-lg"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Filtra tu búsqueda</SheetTitle>
            <SheetDescription>
              {total} {total === 1 ? "resultado" : "resultados"} · encuentra el
              mueble que abraza tu hogar
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 pb-4">
            {/* Rango de precio */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Rango de precio</Label>
                <span className="text-sm font-semibold text-brand-dark">
                  {formatPrice(draftPrice[0])} – {formatPrice(draftPrice[1])}
                </span>
              </div>
              <Slider
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                minStepsBetweenThumbs={1}
                value={draftPrice}
                onValueChange={(value) =>
                  setDraftPrice([value[0] ?? sliderMin, value[1] ?? sliderMax])
                }
                aria-label="Rango de precio"
              />
              <div className="flex justify-between text-xs text-brand-taupe">
                <span>{formatPrice(sliderMin)}</span>
                <span>{formatPrice(sliderMax)}</span>
              </div>
            </div>

            {/* Solo disponibles */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-dark/10 bg-brand-card p-4">
              <div className="space-y-1">
                <Label htmlFor="solo-disponibles">Solo disponibles</Label>
                <p className="text-xs text-brand-taupe">
                  Muestra únicamente muebles listos para entrega
                </p>
              </div>
              <Switch
                id="solo-disponibles"
                checked={draftInStock}
                onCheckedChange={setDraftInStock}
              />
            </div>

            {/* Orden */}
            {colors.length > 0 && <div className="space-y-2"><Label htmlFor="color-catalogo">Color</Label><Select value={draftColor} onValueChange={setDraftColor}><SelectTrigger id="color-catalogo"><SelectValue placeholder="Todos los colores"/></SelectTrigger><SelectContent><SelectItem value="all">Todos los colores</SelectItem>{colors.map((color) => <SelectItem key={color} value={color}>{color}</SelectItem>)}</SelectContent></Select></div>}
            {sizes.length > 0 && <div className="space-y-2"><Label htmlFor="medida-catalogo">Medida o variante</Label><Select value={draftSize} onValueChange={setDraftSize}><SelectTrigger id="medida-catalogo"><SelectValue placeholder="Todas las medidas"/></SelectTrigger><SelectContent><SelectItem value="all">Todas las medidas</SelectItem>{sizes.map((size) => <SelectItem key={size} value={size}>{size}</SelectItem>)}</SelectContent></Select></div>}

            {/* Acciones */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={clearFilters}>
                Limpiar
              </Button>
              <Button variant="accent" className="flex-1" onClick={applyFilters}>
                Aplicar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

          <Select value={activeSort} onValueChange={(value) => setSort(value as SortValue)}>
            <SelectTrigger aria-label="Ordenar productos" className="h-11 min-w-0 rounded-xl bg-brand-card px-3 lg:w-48">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
