"use client";
/* eslint-disable @next/next/no-img-element -- vista previa de una URL aún no guardada */

import { useState, useTransition } from "react";
import { ArrowLeft, Check, Eye, ImageOff, Loader2, Palette, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createBrand, createCategory } from "@/lib/actions/catalog";
import { saveMattressOption } from "@/lib/actions/mattress-options";
import { createProduct, updateProduct } from "@/lib/actions/products";
import type { CatalogOptionDTO } from "@/lib/data/catalog";
import type { ProductDTO, ProductInput, ProductVariant } from "@/lib/types";
import { formatPrice, normalizeImageUrl } from "@/lib/utils";
import { ProductImageUploader } from "@/components/admin/product-image-uploader";
import type { MattressOptionDTO } from "@/lib/data/mattress-options";
import type { MattressOptionKind } from "@/lib/models/MattressOption";
import type { ColorPresetDTO } from "@/lib/data/colors";
import { colorSwatchBackground } from "@/lib/color-swatch";

type VariantDraft = { name: string; price: string; sku: string; isDefault: boolean };
type ColorDraft = { name: string; colors: string[]; image: string };
type QuickCreateKind = "brand" | "category" | MattressOptionKind;
type MattressGroups = { sizes: MattressOptionDTO[]; pillows: MattressOptionDTO[]; models: MattressOptionDTO[]; compositions: MattressOptionDTO[] };

function quickKindLabel(kind: QuickCreateKind | null) {
  if (kind === "brand") return "marca";
  if (kind === "category") return "categoría";
  if (kind === "size") return "medida";
  if (kind === "pillow") return "pillow";
  if (kind === "model") return "tipo de colchón";
  return "composición";
}

const EMPTY_VARIANT: VariantDraft = { name: "", price: "", sku: "", isDefault: false };

function draftVariants(product?: ProductDTO): VariantDraft[] {
  if (product?.variants?.length) return product.variants.map((variant) => ({ name: variant.name, price: String(variant.price), sku: variant.sku ?? "", isDefault: variant.isDefault ?? false }));
  return [];
}

function draftColors(product?: ProductDTO): ColorDraft[] {
  return (product?.colorOptions ?? []).map((color) => ({ name: color.name, colors: color.colors, image: color.image ?? "" }));
}

function ProductPreview({ title, category, imageUrl, variants, selectedIndex, onSelect, colors, selectedColorIndex, onColorSelect, isMattress, features, basePrice }: { title: string; category: string; imageUrl: string; variants: VariantDraft[]; selectedIndex: number; onSelect: (index: number) => void; colors: ColorDraft[]; selectedColorIndex: number; onColorSelect: (index: number) => void; isMattress: boolean; features: { model: string; pillow: string; composition: string; warrantyYears: string }; basePrice: string }) {
  const active = variants[selectedIndex] ?? variants[0];
  const activeColor = colors[selectedColorIndex] ?? colors[0];
  const previewImage = activeColor?.image || imageUrl;
  const previewPrice = active?.price || basePrice;

  return <section className="space-y-5 rounded-3xl border border-brand-accent/25 bg-brand-card p-5 shadow-warm-sm sm:p-7">
    <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-brand-accent" aria-hidden="true"/><div><h2 className="font-display text-xl font-semibold text-brand-dark">Vista previa del cliente</h2><p className="text-sm text-brand-taupe">Prueba cada medida y configuración antes de publicar.</p></div></div>
    <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-brand-sand">{previewImage ? <img src={normalizeImageUrl(previewImage)} alt={activeColor ? `Vista previa en color ${activeColor.name}` : "Vista previa del producto"} className="h-full w-full object-cover" /> : <ImageOff className="h-8 w-8 text-brand-taupe/40" aria-hidden="true" />}</div>
      <div className="min-w-0 space-y-4"><div><p className="text-xs font-semibold text-brand-accent">{category || "Categoría"}</p><h3 className="font-display text-xl font-semibold text-brand-dark">{title || "Nombre del producto"}</h3></div>
        {isMattress && <p className="rounded-xl bg-secondary/60 p-3 text-sm text-brand-taupe"><strong className="text-brand-dark">{features.pillow}</strong> · {features.model} · {features.composition} · {features.warrantyYears} años de garantía</p>}
        {variants.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">{isMattress ? "Elige la medida" : "Elige una variante"}</p><div className="flex flex-wrap gap-2">{variants.map((variant, index) => <button key={index} type="button" onClick={() => onSelect(index)} className={`rounded-xl border px-3 py-2 text-left text-sm ${selectedIndex === index ? "border-brand-accent bg-brand-accent/10" : "border-brand-dark/10"}`}><strong className="block">{variant.name || `Variante ${index + 1}`}</strong>{variant.price ? formatPrice(Number(variant.price)) : "Sin precio"}</button>)}</div></div>}
        {colors.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">Color: <span className="font-normal text-brand-taupe">{activeColor?.name || "Sin nombre"}</span></p><div className="flex flex-wrap gap-2">{colors.map((color, index) => <button key={index} type="button" onClick={() => onColorSelect(index)} aria-label={`Ver ${color.name || `color ${index + 1}`}`} className={`h-9 w-9 rounded-full border-2 p-1 ${selectedColorIndex === index ? "border-brand-dark" : "border-transparent"}`}><span className="block h-full w-full rounded-full border border-black/10" style={{ background: colorSwatchBackground(color.colors) }} /></button>)}</div></div>}
        <p className="text-2xl font-bold text-brand-dark">{previewPrice ? formatPrice(Number(previewPrice)) : "Precio pendiente"}</p>
      </div>
    </div>
  </section>;
}

export function ProductEditor({
  product,
  brands,
  categories,
  mattressOptions,
  colorPresets,
}: {
  product?: ProductDTO;
  brands: CatalogOptionDTO[];
  categories: CatalogOptionDTO[];
  mattressOptions: MattressGroups;
  colorPresets: ColorPresetDTO[];
}) {
  const router = useRouter();
  const [name, setName] = useState(product?.title ?? "");
  const [model, setModel] = useState(product?.collection ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [width, setWidth] = useState(String(product?.dimensions.width || ""));
  const [height, setHeight] = useState(String(product?.dimensions.height || ""));
  const [depth, setDepth] = useState(String(product?.dimensions.depth || ""));
  const [unit, setUnit] = useState(product?.dimensions.unit || "cm");
  const [brandId, setBrandId] = useState(product?.brandId ?? (brands.length === 1 ? brands[0]._id : ""));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? (categories.length === 1 ? categories[0]._id : ""));
  const [brandOptions, setBrandOptions] = useState(brands);
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const selectedCategoryName = categoryOptions.find((item) => item._id === categoryId)?.name ?? "";
  const isMattress = selectedCategoryName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("colchon");
  const normalizedCategory = selectedCategoryName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const isBed = normalizedCategory === "camas";
  const isColorProduct = normalizedCategory.startsWith("closets") || normalizedCategory.includes("centro de tv") || normalizedCategory.includes("zapatera") || normalizedCategory.includes("gaveter");
  const usesSizes = isMattress || isBed;
  const legacyFeatures = product?.mattressFeatures ?? product?.variants?.find((variant) => variant.isDefault)?.mattressFeatures ?? product?.variants?.[0]?.mattressFeatures;
  const [sizeOptions, setSizeOptions] = useState(mattressOptions.sizes);
  const [pillowOptions, setPillowOptions] = useState(mattressOptions.pillows);
  const [modelOptions, setModelOptions] = useState(mattressOptions.models);
  const [compositionOptions, setCompositionOptions] = useState(mattressOptions.compositions);
  const [mattressModel, setMattressModel] = useState(legacyFeatures?.model ?? mattressOptions.models[0]?.name ?? "Ortopédico");
  const [mattressPillow, setMattressPillow] = useState(legacyFeatures?.pillow ?? mattressOptions.pillows[0]?.name ?? "Sin Pillow");
  const [mattressComposition, setMattressComposition] = useState(legacyFeatures?.composition ?? mattressOptions.compositions[0]?.name ?? "Resortes");
  const [mattressWarranty, setMattressWarranty] = useState(String(legacyFeatures?.warrantyYears ?? 2));
  const [warranty, setWarranty] = useState(String(product?.warrantyYears ?? 2));
  const [basePrice, setBasePrice] = useState(String(product?.basePrice ?? ""));
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [quickCreate, setQuickCreate] = useState<QuickCreateKind | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickConfirm, setQuickConfirm] = useState(false);
  const [hasDimensions, setHasDimensions] = useState(Boolean(product?.dimensions.width && product?.dimensions.height && product?.dimensions.depth));
  const [images, setImages] = useState((product?.images ?? []).map(normalizeImageUrl).filter(Boolean));
  const [variants, setVariants] = useState<VariantDraft[]>(draftVariants(product));
  const [colors, setColors] = useState<ColorDraft[]>(draftColors(product));
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [colorQuery, setColorQuery] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [previewVariant, setPreviewVariant] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectCategory(nextId: string) {
    if (nextId === categoryId) return;
    setCategoryId(nextId);
    const nextName = categoryOptions.find((item) => item._id === nextId)?.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? "";
    if (nextName === "camas") {
      setVariants(["Individual", "Matrimonial", "Queen", "King"].map((size, index) => ({ ...EMPTY_VARIANT, name: size, isDefault: index === 0 })));
    } else if (nextName.includes("colchon")) {
      setVariants([{ ...EMPTY_VARIANT, isDefault: true }]);
    } else {
      setVariants([]);
    }
    setPreviewVariant(0);
  }

  function addVariant() {
    setVariants((current) => [
      ...current,
      { ...EMPTY_VARIANT, isDefault: current.length === 0 },
    ]);
  }

  function updateColor(index: number, patch: Partial<ColorDraft>) {
    setColors((current) => current.map((color, itemIndex) => itemIndex === index ? { ...color, ...patch } : color));
  }

  function removeColor(index: number) {
    setColors((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setActiveColorIndex((current) => Math.max(0, current > index ? current - 1 : Math.min(current, colors.length - 2)));
    setEditingColorIndex(null);
  }

  const normalizedColorQuery = colorQuery.trim().toLocaleLowerCase("es");
  const matchingColorPresets = colorPresets.filter((preset) =>
    preset.name.toLocaleLowerCase("es").includes(normalizedColorQuery) &&
    !colors.some((color) => color.name.toLocaleLowerCase("es") === preset.name.toLocaleLowerCase("es"))
  );

  function addSavedColor(preset: ColorPresetDTO) {
    setColors((current) => [...current, { name: preset.name, colors: preset.colors, image: "" }]);
    setActiveColorIndex(colors.length);
    setColorQuery("");
    setColorPickerOpen(false);
  }

  function createColorFromQuery() {
    const cleanName = colorQuery.trim();
    if (!cleanName) return;
    const nextIndex = colors.length;
    setColors((current) => [...current, { name: cleanName, colors: ["#8c7a6b"], image: "" }]);
    setActiveColorIndex(nextIndex);
    setEditingColorIndex(nextIndex);
    setColorQuery("");
    setColorPickerOpen(false);
  }

  function updateVariant(index: number, field: keyof VariantDraft, value: string | boolean) {
    setVariants((current) => current.map((variant, itemIndex) => itemIndex === index ? { ...variant, [field]: value } : variant));
  }

  function removeVariant(index: number) {
    setPreviewVariant(0);
    setVariants((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      if (!next.length) return usesSizes ? [{ ...EMPTY_VARIANT, isDefault: true }] : [];
      if (!next.some((variant) => variant.isDefault)) next[0].isDefault = true;
      return next;
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const cleanVariants: ProductVariant[] = variants.map((variant) => ({
      name: variant.name.trim(),
      price: Number(variant.price),
      sku: variant.sku.trim(),
      isDefault: variant.isDefault,
    }));
    const dimensions = {
      width: Number(width),
      height: Number(height),
      depth: Number(depth),
      unit,
    };
    if (!name.trim() || !brandId || !categoryId) {
      setError("Completa nombre, marca y categoría.");
      return;
    }
    if (hasDimensions && ![dimensions.width, dimensions.height, dimensions.depth].every((value) => Number.isFinite(value) && value > 0)) {
      setError("Completa ancho, alto y profundidad con valores mayores a cero.");
      return;
    }
    if (!usesSizes && (!Number.isFinite(Number(basePrice)) || Number(basePrice) <= 0)) {
      setError("Indica un precio mayor a cero.");
      return;
    }
    if (usesSizes && cleanVariants.some((variant) => !variant.name || !Number.isFinite(variant.price) || variant.price <= 0)) {
      setError("Cada variante necesita nombre y precio mayor a cero.");
      return;
    }
    const defaultPrice = cleanVariants.find((variant) => variant.isDefault)?.price ?? cleanVariants[0]?.price ?? 0;
    const input: ProductInput = {
      title: name.trim(),
      collection: isMattress ? model.trim() : "",
      brand: "",
      brandId,
      category: "",
      categoryId,
      description: description.trim(),
      variantName: "",
      sku: cleanVariants[0]?.sku ?? "",
      basePrice: usesSizes ? defaultPrice : Number(basePrice),
      variants: usesSizes || (!isColorProduct && cleanVariants.some((v) => v.name || v.price)) ? cleanVariants.filter((v) => v.name || v.price) : [],
      colorOptions: colors.map((color) => ({ name: color.name.trim(), colors: color.colors, image: color.image || undefined })),
      images,
      dimensions: hasDimensions ? dimensions : { width: 0, height: 0, depth: 0, unit },
      customizationOptions: product?.customizationOptions ?? { fabrics: [], finishes: [], configurations: [] },
      warrantyYears: Number(warranty),
      mattressFeatures: isMattress ? { model: mattressModel, pillow: mattressPillow, warrantyYears: Number(mattressWarranty), composition: mattressComposition } : undefined,
      isFeatured,
      inStock,
    };
    startTransition(async () => {
      const result = product ? await updateProduct(product._id, input) : await createProduct(input);
      if (!result.ok) { setError(result.error ?? "No se pudo guardar el producto."); return; }
      router.push("/admin/productos");
      router.refresh();
    });
  }

  function saveQuickOption() {
    const cleanName = quickName.trim();
    if (!cleanName || !quickCreate) return;
    startTransition(async () => {
      const result = quickCreate === "brand" ? await createBrand(cleanName) : quickCreate === "category" ? await createCategory(cleanName) : await saveMattressOption(quickCreate, cleanName);
      if (!result.ok) { setError(result.error ?? "No se pudo crear."); return; }
      const option = { _id: result.data?._id ?? `new-${Date.now()}`, name: cleanName, slug: cleanName.toLowerCase().replace(/\s+/g, "-"), isActive: true };
      if (quickCreate === "brand") { setBrandOptions((current) => [...current, option]); setBrandId(option._id); }
      else if (quickCreate === "category") { setCategoryOptions((current) => [...current, option]); setCategoryId(option._id); }
      else {
        const mattressOption = { _id: option._id, name: cleanName, kind: quickCreate, isActive: true };
        if (quickCreate === "size") setSizeOptions((current) => [...current, mattressOption]);
        if (quickCreate === "pillow") { setPillowOptions((current) => [...current, mattressOption]); setMattressPillow(cleanName); }
        if (quickCreate === "model") { setModelOptions((current) => [...current, mattressOption]); setMattressModel(cleanName); }
        if (quickCreate === "composition") { setCompositionOptions((current) => [...current, mattressOption]); setMattressComposition(cleanName); }
      }
      setQuickName(""); setQuickCreate(null); setQuickConfirm(false);
    });
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-brand-dark/10 bg-brand-card p-2 text-sm"><span className="rounded-xl bg-brand-accent px-3 py-2 font-semibold text-white">1 · Familia</span><span className={categoryId ? "rounded-xl bg-brand-accent/10 px-3 py-2 font-semibold text-brand-dark" : "px-3 py-2 text-brand-taupe"}>2 · Información</span><span className={name && (basePrice || usesSizes) ? "rounded-xl bg-brand-accent/10 px-3 py-2 font-semibold text-brand-dark" : "px-3 py-2 text-brand-taupe"}>3 · Venta</span><span className="px-3 py-2 text-brand-taupe">4 · Revisar</span></div>
      <div className="grid gap-5 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:grid-cols-2 sm:p-7">
        <div className="space-y-3 sm:col-span-2"><div><Label>1. Selecciona la familia del producto *</Label><p className="mt-1 text-xs text-brand-taupe">Esto configura automáticamente precios, medidas, variantes y colores.</p></div><div className="grid gap-2 sm:grid-cols-2">{categoryOptions.map((category) => <button key={category._id} type="button" onClick={() => selectCategory(category._id)} className={`min-h-16 rounded-2xl border px-4 py-3 text-left transition-colors ${categoryId === category._id ? "border-brand-accent bg-brand-accent/10 ring-1 ring-brand-accent" : "border-brand-dark/10 bg-brand-bg hover:border-brand-accent/50"}`}><span className="block text-sm font-semibold text-brand-dark">{category.name}</span><span className="mt-1 block text-xs text-brand-taupe">{category.description || "Configurar producto"}</span></button>)}</div><Button type="button" variant="ghost" className="px-0 text-brand-accent" onClick={() => setQuickCreate("category")}><Plus />Crear otra categoría</Button></div>
        {categoryId && <>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-name">Nombre del producto *</Label><Input id="product-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Cama Oslo" autoComplete="off" /></div>
        <div className="space-y-2"><Label htmlFor="product-brand">Marca *</Label><div className="flex gap-2"><select id="product-brand" value={brandId} onChange={(event) => setBrandId(event.target.value)} className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-3 text-sm"><option value="">Selecciona una marca</option>{brandOptions.map((brand) => <option key={brand._id} value={brand._id}>{brand.name}</option>)}</select><Button type="button" variant="outline" size="icon" onClick={() => setQuickCreate("brand")} aria-label="Crear marca"><Plus /></Button></div></div>
        {isMattress && <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-model">Modelo comercial</Label><Input id="product-model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="Ej. Colchón Ortopédico" autoComplete="off" /></div>}
        <div className="sm:col-span-2"><ProductImageUploader images={images} onChange={setImages}/></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-description">Características o descripción</Label><Textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe materiales, medidas, firmeza, colores o cualquier detalle importante..." rows={4} /><p className="text-xs text-brand-taupe">Aparecerá debajo del nombre en la tarjeta y en la ficha del producto.</p></div>
        {!usesSizes && <div className="space-y-2"><Label htmlFor="base-price">Precio *</Label><Input id="base-price" type="number" min="0.01" step="0.01" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} placeholder="0.00" /></div>}
        <div className="space-y-2"><Label htmlFor="product-warranty">Garantía</Label><select id="product-warranty" value={warranty} onChange={(event) => setWarranty(event.target.value)} className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm"><option value="0">Sin garantía indicada</option>{Array.from({ length: 11 }, (_, index) => <option key={index + 2} value={index + 2}>{index + 2} años</option>)}</select></div>
        </>}
      </div>

      {isMattress && <section className="space-y-5 rounded-3xl border border-brand-accent/25 bg-brand-accent/5 p-5 shadow-warm-sm sm:p-7"><div><p className="text-xs font-semibold text-brand-accent">Configuración general</p><h2 className="mt-1 font-display text-xl font-semibold text-brand-dark">Características del colchón</h2><p className="mt-1 text-sm leading-relaxed text-brand-taupe">Estas características pertenecen a todo el colchón. Las variantes de abajo solo cambian medida y precio.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="mattress-model">Tipo de colchón</Label><div className="flex gap-2"><select id="mattress-model" value={mattressModel} onChange={(event) => setMattressModel(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm">{modelOptions.map((option) => <option key={option._id} value={option.name}>{option.name}</option>)}</select><Button type="button" variant="outline" size="icon" onClick={() => setQuickCreate("model")} aria-label="Crear tipo de colchón"><Plus/></Button></div></div><div className="space-y-2"><Label htmlFor="mattress-pillow">Pillow</Label><div className="flex gap-2"><select id="mattress-pillow" value={mattressPillow} onChange={(event) => setMattressPillow(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm">{pillowOptions.map((option) => <option key={option._id} value={option.name}>{option.name}</option>)}</select><Button type="button" variant="outline" size="icon" onClick={() => setQuickCreate("pillow")} aria-label="Crear pillow"><Plus/></Button></div></div><div className="space-y-2"><Label htmlFor="mattress-composition">Composición interna</Label><div className="flex gap-2"><select id="mattress-composition" value={mattressComposition} onChange={(event) => setMattressComposition(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm">{compositionOptions.map((option) => <option key={option._id} value={option.name}>{option.name}</option>)}</select><Button type="button" variant="outline" size="icon" onClick={() => setQuickCreate("composition")} aria-label="Crear composición"><Plus/></Button></div></div><div className="space-y-2"><Label htmlFor="mattress-warranty">Garantía</Label><select id="mattress-warranty" value={mattressWarranty} onChange={(event) => setMattressWarranty(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">{Array.from({ length: 11 }, (_, index) => <option key={index + 2} value={index + 2}>{index + 2} años</option>)}</select></div></div></section>}

      {!isMattress && <section className="space-y-4 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-7">
        <div className="flex items-center justify-between gap-4"><div><h2 className="font-display text-xl font-semibold text-brand-dark">Medidas del producto</h2><p className="text-sm text-brand-taupe">Puedes agregarlas ahora o completarlas después.</p></div><label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-dark"><input type="checkbox" checked={hasDimensions} onChange={(event) => setHasDimensions(event.target.checked)} />Sí, tiene medidas</label></div>
        {hasDimensions && <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2"><Label htmlFor="product-width">Ancho *</Label><Input id="product-width" type="number" min="0.01" step="0.01" value={width} onChange={(event) => setWidth(event.target.value)} placeholder="200" /></div>
          <div className="space-y-2"><Label htmlFor="product-height">Alto *</Label><Input id="product-height" type="number" min="0.01" step="0.01" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="90" /></div>
          <div className="space-y-2"><Label htmlFor="product-depth">Profundidad *</Label><Input id="product-depth" type="number" min="0.01" step="0.01" value={depth} onChange={(event) => setDepth(event.target.value)} placeholder="190" /></div>
          <div className="space-y-2"><Label htmlFor="product-unit">Unidad</Label><select id="product-unit" value={unit} onChange={(event) => setUnit(event.target.value)} className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-brand-accent"><option value="cm">Centímetros (cm)</option><option value="m">Metros (m)</option><option value="pulg">Pulgadas (pulg)</option></select></div>
        </div>}
      </section>}

      {!isColorProduct && <section className="space-y-4 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold text-brand-dark">{usesSizes ? "Medidas y precios" : "Variantes opcionales"}</h2><p className="text-sm text-brand-taupe">{usesSizes ? "Cada medida tiene su propio precio." : "Puedes agregar una variante con nombre y precio, si aplica."}</p></div><Button type="button" variant="outline" onClick={addVariant}><Plus aria-hidden="true" />{usesSizes ? "Agregar medida" : "Agregar variante"}</Button></div>
        <div className="space-y-3">
          {variants.map((variant, index) => <article key={index} className="space-y-4 rounded-2xl border border-brand-dark/10 bg-secondary/30 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-brand-dark">{isMattress ? `Medida ${index + 1}` : `Variante ${index + 1}`}</h3><Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => removeVariant(index)} aria-label={`Eliminar ${isMattress ? "medida" : "variante"} ${index + 1}`}><Trash2 aria-hidden="true" /></Button></div><div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1"><Label htmlFor={`variant-name-${index}`}>{isMattress ? "Medida" : "Nombre"}</Label>{isMattress ? <div className="flex gap-2"><select id={`variant-name-${index}`} value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"><option value="">Selecciona una medida</option>{sizeOptions.map((option) => <option key={option._id} value={option.name}>{option.name}</option>)}</select><Button type="button" variant="outline" size="icon" onClick={() => setQuickCreate("size")} aria-label="Crear medida"><Plus/></Button></div> : <Input id={`variant-name-${index}`} value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} placeholder="Individual" autoComplete="off" />}</div><div className="space-y-1"><Label htmlFor={`variant-price-${index}`}>Precio</Label><Input id={`variant-price-${index}`} type="number" min="0.01" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} placeholder="0.00" /></div><div className="space-y-1"><Label htmlFor={`variant-sku-${index}`}>SKU</Label><Input id={`variant-sku-${index}`} value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} placeholder="Ej. COL-MAT-01" autoComplete="off" /></div></div><label className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark"><input type="radio" name="default-variant" checked={variant.isDefault} onChange={() => setVariants((current) => current.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index })))} />Mostrar esta {isMattress ? "medida" : "variante"} primero</label></article>)}
        </div>
      </section>}

      <section className="space-y-4 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-7">
        <div><h2 className="flex items-center gap-2 font-display text-xl font-semibold text-brand-dark"><Palette className="h-5 w-5 text-brand-accent" aria-hidden="true" />Colores disponibles</h2><p className="text-sm text-brand-taupe">Busca una combinación guardada o escribe una nueva. La fotografía es opcional.</p></div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 z-10 h-4 w-4 text-brand-taupe" aria-hidden="true" />
          <Input value={colorQuery} onFocus={() => setColorPickerOpen(true)} onBlur={() => window.setTimeout(() => setColorPickerOpen(false), 120)} onChange={(event) => { setColorQuery(event.target.value); setColorPickerOpen(true); }} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); if (matchingColorPresets[0]) addSavedColor(matchingColorPresets[0]); else createColorFromQuery(); }} placeholder="Escribe para buscar o crear un color…" className="pl-9" role="combobox" aria-expanded={colorPickerOpen} aria-controls="color-results" autoComplete="off" />
          {colorPickerOpen && <div id="color-results" className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-brand-dark/10 bg-background p-2 shadow-warm" role="listbox">
            {matchingColorPresets.map((preset) => <button key={preset._id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addSavedColor(preset)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-secondary"><span className="h-8 w-8 shrink-0 rounded-full border border-black/10" style={{ background: colorSwatchBackground(preset.colors) }} /><span className="flex-1 font-semibold text-brand-dark">{preset.name}</span><span className="text-xs text-brand-taupe">Agregar</span></button>)}
            {colorQuery.trim() && !colorPresets.some((preset) => preset.name.toLocaleLowerCase("es") === normalizedColorQuery) && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={createColorFromQuery} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-brand-dark hover:bg-brand-accent/10"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent"><Plus className="h-4 w-4" /></span><span>Crear <strong>“{colorQuery.trim()}”</strong></span></button>}
            {!colorQuery.trim() && matchingColorPresets.length === 0 && <p className="px-3 py-3 text-sm text-brand-taupe">No hay más combinaciones guardadas.</p>}
          </div>}
        </div>
        {colors.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">{colors.map((color, index) => <div key={`${color.name}-${index}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-brand-dark/10 bg-secondary/30 px-3 py-2"><button type="button" onClick={() => { setActiveColorIndex(index); setEditingColorIndex(index); }} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="h-9 w-9 shrink-0 rounded-full border border-black/10" style={{ background: colorSwatchBackground(color.colors) }} /><span className="min-w-0"><strong className="block truncate text-sm text-brand-dark">{color.name}</strong><span className="text-xs text-brand-taupe">{color.colors.length} {color.colors.length === 1 ? "color" : "colores"}{color.image ? " · Con foto" : ""}</span></span></button><Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setActiveColorIndex(index); setEditingColorIndex(index); }} aria-label={`Editar ${color.name}`}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-600" onClick={() => removeColor(index)} aria-label={`Quitar ${color.name}`}><X className="h-4 w-4" /></Button></div>)}</div> : <p className="rounded-xl border border-dashed border-brand-dark/15 bg-secondary/20 p-4 text-sm text-brand-taupe">Sin colores agregados. Este apartado es opcional.</p>}
      </section>

      <section className="space-y-4 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-7">
        <div>
          <h2 className="font-display text-xl font-semibold text-brand-dark">Publicación</h2>
          <p className="text-sm text-brand-taupe">Controla si el producto puede comprarse y si aparece en la vitrina destacada.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-brand-dark/10 bg-secondary/30 px-4 py-3">
            <input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--brand-accent))]" />
            <span><strong className="block text-sm text-brand-dark">Disponible para la venta</strong><span className="text-xs text-brand-taupe">Visible como producto con existencia.</span></span>
          </label>
          <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-brand-dark/10 bg-secondary/30 px-4 py-3">
            <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--brand-accent))]" />
            <span><strong className="flex items-center gap-1.5 text-sm text-brand-dark"><Star className="h-4 w-4 text-brand-accent" aria-hidden="true" />Producto destacado</strong><span className="text-xs text-brand-taupe">Puede aparecer en la portada.</span></span>
          </label>
        </div>
      </section>

      <ProductPreview title={name} category={selectedCategoryName} imageUrl={images[0] ?? ""} variants={variants} selectedIndex={previewVariant} onSelect={setPreviewVariant} colors={colors} selectedColorIndex={activeColorIndex} onColorSelect={setActiveColorIndex} isMattress={isMattress} features={{ model: mattressModel, pillow: mattressPillow, composition: mattressComposition, warrantyYears: mattressWarranty }} basePrice={basePrice} />

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-between gap-3"><Button type="button" variant="ghost" onClick={() => router.push("/admin/productos")}><ArrowLeft aria-hidden="true" />Cancelar</Button><Button type="submit" variant="accent" disabled={pending}>{pending && <Loader2 className="animate-spin" aria-hidden="true" />}{pending ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}</Button></div>
      <Dialog open={editingColorIndex !== null && Boolean(colors[editingColorIndex])} onOpenChange={(open) => { if (!open) setEditingColorIndex(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {editingColorIndex !== null && colors[editingColorIndex] && <>
            <DialogHeader><DialogTitle className="flex items-center gap-3"><span className="h-9 w-9 rounded-full border border-black/10" style={{ background: colorSwatchBackground(colors[editingColorIndex].colors) }} />Editar {colors[editingColorIndex].name}</DialogTitle></DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2"><Label htmlFor={`color-name-${editingColorIndex}`}>Nombre de la combinación *</Label><Input id={`color-name-${editingColorIndex}`} value={colors[editingColorIndex].name} onChange={(event) => updateColor(editingColorIndex, { name: event.target.value })} placeholder="Ej. Canela / Off White" /></div>
              <div className="space-y-3"><div className="flex items-center justify-between gap-3"><div><Label>Colores de la muestra</Label><p className="text-xs text-brand-taupe">Se reparten en partes iguales.</p></div>{colors[editingColorIndex].colors.length < 4 && <Button type="button" variant="outline" size="sm" onClick={() => updateColor(editingColorIndex, { colors: [...colors[editingColorIndex].colors, "#f5f0e6"] })}><Plus />Agregar color</Button>}</div><div className="grid gap-2 sm:grid-cols-2">{colors[editingColorIndex].colors.map((hex, colorIndex) => <div key={colorIndex} className="flex h-12 items-center gap-2 rounded-xl border border-input bg-background px-2"><input type="color" aria-label={`Color ${colorIndex + 1}`} value={hex} onChange={(event) => updateColor(editingColorIndex, { colors: colors[editingColorIndex].colors.map((item, index) => index === colorIndex ? event.target.value : item) })} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="flex-1 text-xs uppercase text-brand-taupe">{hex}</span>{colors[editingColorIndex].colors.length > 1 && <button type="button" onClick={() => updateColor(editingColorIndex, { colors: colors[editingColorIndex].colors.filter((_, index) => index !== colorIndex) })} className="rounded p-1 text-red-600" aria-label={`Quitar color ${colorIndex + 1}`}><X className="h-4 w-4" /></button>}</div>)}</div></div>
              <ProductImageUploader images={colors[editingColorIndex].image ? [colors[editingColorIndex].image] : []} onChange={(next) => updateColor(editingColorIndex, { image: next[0] ?? "" })} maxImages={1} compactLabel="Fotografía para esta combinación" />
            </div>
            <DialogFooter><Button type="button" variant="accent" onClick={() => setEditingColorIndex(null)}><Check />Listo</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
      <Dialog open={quickCreate !== null} onOpenChange={(open) => { if (!open) { setQuickCreate(null); setQuickName(""); setQuickConfirm(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{quickConfirm ? "Confirmar creación" : `Crear ${quickKindLabel(quickCreate)}`}</DialogTitle></DialogHeader>
          {quickConfirm ? <p className="text-sm leading-relaxed text-brand-taupe">¿Seguro que quieres crear <strong className="text-brand-dark">“{quickName.trim()}”</strong> como {quickKindLabel(quickCreate)}? Se guardará en la base de datos y quedará disponible para otros colchones.</p> : <div className="space-y-2"><Label htmlFor="quick-option-name">Nombre</Label><Input id="quick-option-name" value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder={quickCreate === "brand" ? "CamiHogar" : quickCreate === "category" ? "Colchones" : quickCreate === "size" ? "Super King" : quickCreate === "pillow" ? "Doble Pillow" : "Nueva opción"} autoFocus onKeyDown={(event) => { if (event.key === "Enter") setQuickConfirm(true); }} /></div>}
          <DialogFooter><Button type="button" variant="ghost" onClick={() => { setQuickCreate(null); setQuickConfirm(false); }}><X />Cancelar</Button>{quickConfirm ? <Button type="button" variant="accent" onClick={saveQuickOption} disabled={pending}><Check />Sí, crear y seleccionar</Button> : <Button type="button" variant="accent" onClick={() => setQuickConfirm(true)} disabled={pending || !quickName.trim()}><Plus />Continuar</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
