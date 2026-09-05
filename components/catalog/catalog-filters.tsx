"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
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
import { cn, formatPrice } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "recent", label: "Más recientes" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "popular", label: "Más populares" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const chipSpring = { type: "spring", stiffness: 300, damping: 24 } as const;

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={chipSpring}
      aria-pressed={active}
      className={cn(
        "relative shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-transparent text-brand-bg"
          : "border-brand-dark/10 bg-brand-card text-brand-taupe hover:border-brand-dark/25 hover:text-brand-dark"
      )}
    >
      {active && (
        <motion.span
          layoutId="catalogo-chip-activo"
          transition={chipSpring}
          className="absolute inset-0 rounded-full bg-brand-dark"
          aria-hidden="true"
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

interface CatalogFiltersProps {
  priceRange: { min: number; max: number };
  total: number;
  categories: { name: string; slug: string }[];
}

export function CatalogFilters({ priceRange, total, categories }: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategorySlug = searchParams.get("categoria") ?? "";

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
  const [draftSort, setDraftSort] = React.useState<SortValue>("recent");

  const navigate = React.useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  /** Los chips de categoría aplican al instante, sin recargar la página. */
  function setCategory(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("categoria", slug);
    } else {
      params.delete("categoria");
    }
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
      const orden = searchParams.get("orden");
      setDraftSort(
        SORT_OPTIONS.some((o) => o.value === orden)
          ? (orden as SortValue)
          : "recent"
      );
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
    if (draftSort !== "recent") {
      params.set("orden", draftSort);
    } else {
      params.delete("orden");
    }

    navigate(params);
    setOpen(false);
  }

  function clearFilters() {
    setDraftPrice([sliderMin, sliderMax]);
    setDraftInStock(false);
    setDraftSort("recent");
    router.replace(pathname, { scroll: false });
    setOpen(false);
  }

  const advancedCount =
    (searchParams.has("precioMin") || searchParams.has("precioMax") ? 1 : 0) +
    (searchParams.get("disponibles") === "1" ? 1 : 0) +
    (SORT_OPTIONS.some(
      (o) => o.value === searchParams.get("orden") && o.value !== "recent"
    )
      ? 1
      : 0);

  return (
    <div className="flex items-center gap-3">
      {/* Chips de categoría, scroll horizontal en móvil */}
      <div className="scrollbar-hide -mx-4 flex flex-1 items-center gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
        <CategoryChip active={!activeCategorySlug} onClick={() => setCategory(null)}>
          Todo
        </CategoryChip>
        {categories.map((category) => (
          <CategoryChip
            key={category.slug}
            active={activeCategorySlug === category.slug}
            onClick={() => setCategory(category.slug)}
          >
            {category.name}
          </CategoryChip>
        ))}
      </div>

      {/* Filtros avanzados en sheet inferior */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative h-10 shrink-0 rounded-full bg-brand-card px-4"
            aria-label="Abrir filtros avanzados"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
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
            <div className="space-y-2">
              <Label htmlFor="orden-catalogo">Ordenar por</Label>
              <Select
                value={draftSort}
                onValueChange={(value) => setDraftSort(value as SortValue)}
              >
                <SelectTrigger id="orden-catalogo" aria-label="Ordenar por">
                  <SelectValue placeholder="Más recientes" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
    </div>
  );
}
