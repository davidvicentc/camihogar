"use client";
/* eslint-disable @next/next/no-img-element -- vista previa de una URL aún no guardada */

import { useState, useTransition } from "react";
import { ArrowLeft, Check, Eye, ImageOff, Loader2, Plus, Trash2, X } from "lucide-react";
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

type VariantDraft = { name: string; price: string; sku: string; isDefault: boolean };
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
  return [{ ...EMPTY_VARIANT, isDefault: true }];
}

function ProductPreview({ title, category, imageUrl, variants, selectedIndex, onSelect, isMattress, features }: { title: string; category: string; imageUrl: string; variants: VariantDraft[]; selectedIndex: number; onSelect: (index: number) => void; isMattress: boolean; features: { model: string; pillow: string; composition: string; warrantyYears: string } }) {
  const active = variants[selectedIndex] ?? variants[0];

  return <section className="space-y-5 rounded-3xl border border-brand-accent/25 bg-brand-card p-5 shadow-warm-sm sm:p-7">
    <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-brand-accent" aria-hidden="true"/><div><h2 className="font-display text-xl font-semibold text-brand-dark">Vista previa del cliente</h2><p className="text-sm text-brand-taupe">Prueba cada medida y configuración antes de publicar.</p></div></div>
    <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-brand-sand">{imageUrl ? <img src={normalizeImageUrl(imageUrl)} alt="Vista previa del producto" className="h-full w-full object-cover" /> : <ImageOff className="h-8 w-8 text-brand-taupe/40" aria-hidden="true" />}</div>
      <div className="min-w-0 space-y-4"><div><p className="text-xs font-semibold text-brand-accent">{category || "Categoría"}</p><h3 className="font-display text-xl font-semibold text-brand-dark">{title || "Nombre del producto"}</h3></div>
        {isMattress && <p className="rounded-xl bg-secondary/60 p-3 text-sm text-brand-taupe"><strong className="text-brand-dark">{features.pillow}</strong> · {features.model} · {features.composition} · {features.warrantyYears} años de garantía</p>}
        <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">{isMattress ? "Elige la medida" : "Elige una variante"}</p><div className="flex flex-wrap gap-2">{variants.map((variant, index) => <button key={index} type="button" onClick={() => onSelect(index)} className={`rounded-xl border px-3 py-2 text-left text-sm ${selectedIndex === index ? "border-brand-accent bg-brand-accent/10" : "border-brand-dark/10"}`}><strong className="block">{variant.name || `Variante ${index + 1}`}</strong>{variant.price ? formatPrice(Number(variant.price)) : "Sin precio"}</button>)}</div></div>
        {active && <p className="text-2xl font-bold text-brand-dark">{active.price ? formatPrice(Number(active.price)) : "Precio pendiente"}</p>}
      </div>
    </div>
  </section>;
}

export function ProductEditor({
  product,
  brands,
  categories,
  mattressOptions,
}: {
  product?: ProductDTO;
  brands: CatalogOptionDTO[];
  categories: CatalogOptionDTO[];
  mattressOptions: MattressGroups;
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
  const legacyFeatures = product?.mattressFeatures ?? product?.variants?.find((variant) => variant.isDefault)?.mattressFeatures ?? product?.variants?.[0]?.mattressFeatures;
  const [sizeOptions, setSizeOptions] = useState(mattressOptions.sizes);
  const [pillowOptions, setPillowOptions] = useState(mattressOptions.pillows);
  const [modelOptions, setModelOptions] = useState(mattressOptions.models);
  const [compositionOptions, setCompositionOptions] = useState(mattressOptions.compositions);
  const [mattressModel, setMattressModel] = useState(legacyFeatures?.model ?? mattressOptions.models[0]?.name ?? "Ortopédico");
  const [mattressPillow, setMattressPillow] = useState(legacyFeatures?.pillow ?? mattressOptions.pillows[0]?.name ?? "Sin Pillow");
  const [mattressComposition, setMattressComposition] = useState(legacyFeatures?.composition ?? mattressOptions.compositions[0]?.name ?? "Resortes");
  const [mattressWarranty, setMattressWarranty] = useState(String(legacyFeatures?.warrantyYears ?? 2));
  const [quickCreate, setQuickCreate] = useState<QuickCreateKind | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickConfirm, setQuickConfirm] = useState(false);
  const [hasDimensions, setHasDimensions] = useState(Boolean(product?.dimensions.width && product?.dimensions.height && product?.dimensions.depth));
  const [images, setImages] = useState((product?.images ?? []).map(normalizeImageUrl).filter(Boolean));
  const [variants, setVariants] = useState<VariantDraft[]>(draftVariants(product));
  const [previewVariant, setPreviewVariant] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateVariant(index: number, field: keyof VariantDraft, value: string | boolean) {
    setVariants((current) => current.map((variant, itemIndex) => itemIndex === index ? { ...variant, [field]: value } : variant));
  }

  function removeVariant(index: number) {
    setPreviewVariant(0);
    setVariants((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      if (!next.length) return [{ ...EMPTY_VARIANT, isDefault: true }];
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
    if (!name.trim() || !model.trim() || !brandId || !categoryId) {
      setError("Completa nombre, marca, modelo y categoría.");
      return;
    }
    if (hasDimensions && ![dimensions.width, dimensions.height, dimensions.depth].every((value) => Number.isFinite(value) && value > 0)) {
      setError("Completa ancho, alto y profundidad con valores mayores a cero.");
      return;
    }
    if (cleanVariants.some((variant) => !variant.name || !Number.isFinite(variant.price) || variant.price <= 0)) {
      setError("Cada variante necesita nombre y precio mayor a cero.");
      return;
    }
    const defaultPrice = cleanVariants.find((variant) => variant.isDefault)?.price ?? cleanVariants[0].price;
    const input: ProductInput = {
      title: name.trim(),
      collection: model.trim(),
      brand: "",
      brandId,
      category: "",
      categoryId,
      description: description.trim(),
      variantName: "",
      sku: cleanVariants[0].sku ?? "",
      basePrice: defaultPrice,
      variants: cleanVariants,
      images,
      dimensions: hasDimensions ? dimensions : { width: 0, height: 0, depth: 0, unit },
      customizationOptions: product?.customizationOptions ?? { fabrics: [], finishes: [], configurations: [] },
      mattressFeatures: isMattress ? { model: mattressModel, pillow: mattressPillow, warrantyYears: Number(mattressWarranty), composition: mattressComposition } : undefined,
      isFeatured: product?.isFeatured ?? false,
      inStock: product?.inStock ?? true,
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
      <div className="grid gap-5 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:grid-cols-2 sm:p-7">
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-name">Nombre del producto *</Label><Input id="product-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Colchón Ortopédico" autoComplete="off" /></div>
        <div className="space-y-2"><Label htmlFor="product-brand">Marca *</Label><div className="flex gap-2"><select id="product-brand" value={brandId} onChange={(event) => setBrandId(event.target.value)} className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-brand-accent"><option value="">Selecciona una marca</option>{brandOptions.map((brand) => <option key={brand._id} value={brand._id}>{brand.name}</option>)}</select><Button type="button" variant="outline" size="icon" aria-label="Crear marca" onClick={() => setQuickCreate("brand")}><Plus /></Button></div></div>
        <div className="space-y-2"><Label htmlFor="product-category">Categoría *</Label><div className="flex gap-2"><select id="product-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-brand-accent"><option value="">Selecciona una categoría</option>{categoryOptions.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select><Button type="button" variant="outline" size="icon" aria-label="Crear categoría" onClick={() => setQuickCreate("category")}><Plus /></Button></div></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-model">Modelo comercial *</Label><Input id="product-model" list={isMattress ? "mattress-model-suggestions" : undefined} value={model} onChange={(event) => setModel(event.target.value)} placeholder={isMattress ? "Ej. Colchón Ortopédico" : "Ej. Línea Oslo"} autoComplete="off" />{isMattress && <datalist id="mattress-model-suggestions"><option value="Colchón Ortopédico" /><option value="Colchón Semi Ortopédico" /></datalist>}</div>
        <div className="sm:col-span-2"><ProductImageUploader images={images} onChange={setImages}/></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-description">Características o descripción</Label><Textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe materiales, medidas, firmeza, colores o cualquier detalle importante..." rows={4} /><p className="text-xs text-brand-taupe">Aparecerá debajo del nombre en la tarjeta y en la ficha del producto.</p></div>
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

      <section className="space-y-4 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold text-brand-dark">Medidas y precios</h2><p className="text-sm text-brand-taupe">Agrega cada medida en la que se vende este producto y coloca su precio.</p></div><Button type="button" variant="outline" onClick={() => setVariants((current) => [...current, { ...EMPTY_VARIANT }])}><Plus aria-hidden="true" />Agregar medida</Button></div>
        <div className="space-y-3">
          {variants.map((variant, index) => <article key={index} className="space-y-4 rounded-2xl border border-brand-dark/10 bg-secondary/30 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-brand-dark">{isMattress ? `Medida ${index + 1}` : `Variante ${index + 1}`}</h3><Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => removeVariant(index)} aria-label={`Eliminar ${isMattress ? "medida" : "variante"} ${index + 1}`}><Trash2 aria-hidden="true" /></Button></div><div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1"><Label htmlFor={`variant-name-${index}`}>{isMattress ? "Medida" : "Nombre"}</Label>{isMattress ? <div className="flex gap-2"><select id={`variant-name-${index}`} value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"><option value="">Selecciona una medida</option>{sizeOptions.map((option) => <option key={option._id} value={option.name}>{option.name}</option>)}</select><Button type="button" variant="outline" size="icon" onClick={() => setQuickCreate("size")} aria-label="Crear medida"><Plus/></Button></div> : <Input id={`variant-name-${index}`} value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} placeholder="Individual" autoComplete="off" />}</div><div className="space-y-1"><Label htmlFor={`variant-price-${index}`}>Precio</Label><Input id={`variant-price-${index}`} type="number" min="0.01" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} placeholder="0.00" /></div><div className="space-y-1"><Label htmlFor={`variant-sku-${index}`}>SKU</Label><Input id={`variant-sku-${index}`} value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} placeholder="Ej. COL-MAT-01" autoComplete="off" /></div></div><label className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark"><input type="radio" name="default-variant" checked={variant.isDefault} onChange={() => setVariants((current) => current.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index })))} />Mostrar esta {isMattress ? "medida" : "variante"} primero</label></article>)}
        </div>
      </section>

      <ProductPreview title={name} category={selectedCategoryName} imageUrl={images[0] ?? ""} variants={variants} selectedIndex={previewVariant} onSelect={setPreviewVariant} isMattress={isMattress} features={{ model: mattressModel, pillow: mattressPillow, composition: mattressComposition, warrantyYears: mattressWarranty }} />

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-between gap-3"><Button type="button" variant="ghost" onClick={() => router.push("/admin/productos")}><ArrowLeft aria-hidden="true" />Cancelar</Button><Button type="submit" variant="accent" disabled={pending}>{pending && <Loader2 className="animate-spin" aria-hidden="true" />}{pending ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}</Button></div>
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
