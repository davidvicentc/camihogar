"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CldUploadWidget } from "next-cloudinary";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/catalog/product-card";
import { createProduct } from "@/lib/actions/products";
import { CONFIGURATION_PRESETS, FABRIC_PRESETS, FINISH_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/types";
import type {
  Category,
  ConfigurationOption,
  FabricOption,
  FinishOption,
  ProductDTO,
  ProductInput,
} from "@/lib/types";

const STEPS = [
  "Datos básicos",
  "Fotos",
  "Dimensiones y personalización",
  "Vista previa y publicar",
] as const;

const UNITS = ["cm", "m", "pulg"] as const;

const CLOUDINARY_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

interface WizardData {
  title: string;
  category: Category;
  basePrice: string;
  description: string;
  images: string[];
  width: string;
  height: string;
  depth: string;
  unit: string;
  fabrics: FabricOption[];
  finishes: FinishOption[];
  configurations: ConfigurationOption[];
  isFeatured: boolean;
  inStock: boolean;
}

const INITIAL_DATA: WizardData = {
  title: "",
  category: "Salas",
  basePrice: "",
  description: "",
  images: [],
  width: "",
  height: "",
  depth: "",
  unit: "cm",
  fabrics: [],
  finishes: [],
  configurations: [],
  isFeatured: false,
  inStock: true,
};

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -48 }),
};

function OptionChip({
  active,
  label,
  hex,
  detail,
  onToggle,
}: {
  active: boolean;
  label: string;
  hex?: string;
  detail?: string;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
          : "border-brand-dark/15 bg-brand-card text-brand-taupe hover:border-brand-dark/30 hover:text-brand-dark"
      )}
    >
      {hex && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-brand-dark/10"
          style={{ backgroundColor: hex }}
        />
      )}
      {label}
      {detail && <span className="font-normal opacity-70">{detail}</span>}
      {active && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
    </motion.button>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="font-display text-base font-semibold text-brand-dark">{title}</h3>
      <p className="text-xs text-brand-taupe">{subtitle}</p>
    </div>
  );
}

export default function NuevoProductoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [manualUrl, setManualUrl] = useState("");
  const [customFabric, setCustomFabric] = useState({ name: "", hex: "#D9CDBA", extra: "" });
  const [customFinish, setCustomFinish] = useState({ name: "", hex: "#4A2F1F", extra: "" });
  const [customConfig, setCustomConfig] = useState({ label: "", multiplier: "" });

  const patch = (partial: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  /* ------------------------------- navegación ------------------------------ */

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!data.title.trim()) return "Ponle un nombre a tu mueble para continuar.";
      const price = Number(data.basePrice);
      if (!data.basePrice || !Number.isFinite(price) || price <= 0) {
        return "Indica un precio base mayor a cero.";
      }
    }
    return null;
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
  }

  function goBack() {
    setStepError(null);
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }

  /* --------------------------------- fotos --------------------------------- */

  function addImage(url: string) {
    const clean = url.trim();
    if (!clean) return;
    setData((prev) =>
      prev.images.includes(clean) ? prev : { ...prev, images: [...prev.images, clean] }
    );
  }

  function removeImage(url: string) {
    setData((prev) => ({ ...prev, images: prev.images.filter((i) => i !== url) }));
  }

  /* ---------------------------- personalización ---------------------------- */

  function toggleFabric(option: FabricOption) {
    setData((prev) => ({
      ...prev,
      fabrics: prev.fabrics.some((f) => f.name === option.name)
        ? prev.fabrics.filter((f) => f.name !== option.name)
        : [...prev.fabrics, option],
    }));
  }

  function toggleFinish(option: FinishOption) {
    setData((prev) => ({
      ...prev,
      finishes: prev.finishes.some((f) => f.name === option.name)
        ? prev.finishes.filter((f) => f.name !== option.name)
        : [...prev.finishes, option],
    }));
  }

  function toggleConfiguration(option: ConfigurationOption) {
    setData((prev) => ({
      ...prev,
      configurations: prev.configurations.some((c) => c.label === option.label)
        ? prev.configurations.filter((c) => c.label !== option.label)
        : [...prev.configurations, option],
    }));
  }

  function addCustomFabric() {
    const name = customFabric.name.trim();
    if (!name) return;
    toggleFabric({ name, hex: customFabric.hex, priceExtra: Number(customFabric.extra) || 0 });
    setCustomFabric({ name: "", hex: "#D9CDBA", extra: "" });
  }

  function addCustomFinish() {
    const name = customFinish.name.trim();
    if (!name) return;
    toggleFinish({ name, hex: customFinish.hex, priceExtra: Number(customFinish.extra) || 0 });
    setCustomFinish({ name: "", hex: "#4A2F1F", extra: "" });
  }

  function addCustomConfig() {
    const label = customConfig.label.trim();
    if (!label) return;
    toggleConfiguration({ label, priceMultiplier: Number(customConfig.multiplier) || 1 });
    setCustomConfig({ label: "", multiplier: "" });
  }

  // Chips visibles: presets + personalizados ya seleccionados que no son presets.
  const fabricChips = [
    ...FABRIC_PRESETS,
    ...data.fabrics.filter((f) => !FABRIC_PRESETS.some((p) => p.name === f.name)),
  ];
  const finishChips = [
    ...FINISH_PRESETS,
    ...data.finishes.filter((f) => !FINISH_PRESETS.some((p) => p.name === f.name)),
  ];
  const configChips = [
    ...CONFIGURATION_PRESETS,
    ...data.configurations.filter(
      (c) => !CONFIGURATION_PRESETS.some((p) => p.label === c.label)
    ),
  ];

  /* -------------------------------- publicar ------------------------------- */

  function buildInput(): ProductInput {
    return {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      basePrice: Number(data.basePrice),
      images: data.images,
      dimensions: {
        width: Number(data.width) || 0,
        height: Number(data.height) || 0,
        depth: Number(data.depth) || 0,
        unit: data.unit,
      },
      customizationOptions: {
        fabrics: data.fabrics,
        finishes: data.finishes,
        configurations: data.configurations,
      },
      isFeatured: data.isFeatured,
      inStock: data.inStock,
    };
  }

  async function publish() {
    setStepError(null);
    setSubmitting(true);
    const result = await createProduct(buildInput());
    if (result.ok) {
      router.push("/admin/productos");
      router.refresh();
      return;
    }
    setStepError(result.error ?? "No pudimos publicar el mueble. Inténtalo de nuevo.");
    setSubmitting(false);
  }

  const preview: ProductDTO = useMemo(
    () => ({
      _id: "vista-previa",
      title: data.title.trim() || "Tu nuevo mueble",
      slug: "vista-previa",
      description: data.description,
      category: data.category,
      basePrice: Number(data.basePrice) || 0,
      images: data.images,
      dimensions: {
        width: Number(data.width) || 0,
        height: Number(data.height) || 0,
        depth: Number(data.depth) || 0,
        unit: data.unit,
      },
      customizationOptions: {
        fabrics: data.fabrics,
        finishes: data.finishes,
        configurations: data.configurations,
      },
      metrics: { viewsCount: 0, whatsappClicksCount: 0 },
      rating: 5,
      reviewsCount: 0,
      isFeatured: data.isFeatured,
      inStock: data.inStock,
      createdAt: "",
      updatedAt: "",
    }),
    [data]
  );

  const optionsCount =
    data.fabrics.length + data.finishes.length + data.configurations.length;

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tighter text-brand-dark sm:text-3xl">
          Nuevo mueble
        </h1>
        <p className="mt-1 text-sm text-brand-taupe">
          Cuatro pasos y tu mueble estará listo para abrazar un hogar.
        </p>
      </header>

      <div className="space-y-2">
        <Progress value={step * 25} aria-label={`Progreso: paso ${step} de 4`} />
        <p className="text-sm font-medium text-brand-dark">
          Paso {step} de 4:{" "}
          <span className="text-brand-taupe">{STEPS[step - 1]}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm sm:p-8">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* ------------------------- Paso 1: Datos básicos ------------------------- */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="wizard-title">Título del mueble *</Label>
                  <Input
                    id="wizard-title"
                    value={data.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Sofá Valencia 3 puestos"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wizard-category">Categoría</Label>
                    <Select
                      value={data.category}
                      onValueChange={(value) => patch({ category: value as Category })}
                    >
                      <SelectTrigger id="wizard-category">
                        <SelectValue placeholder="Elige una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wizard-price">Precio base (USD) *</Label>
                    <Input
                      id="wizard-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={data.basePrice}
                      onChange={(e) => patch({ basePrice: e.target.value })}
                      placeholder="450"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wizard-description">Descripción</Label>
                  <Textarea
                    id="wizard-description"
                    value={data.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder="Cuenta qué hace especial a este mueble: materiales, comodidad, ese detalle que enamora…"
                  />
                </div>
              </div>
            )}

            {/* ----------------------------- Paso 2: Fotos ----------------------------- */}
            {step === 2 && (
              <div className="space-y-5">
                {CLOUDINARY_ENABLED ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-dark/15 bg-secondary/40 p-8 text-center">
                    <ImagePlus className="h-8 w-8 text-brand-taupe/60" aria-hidden="true" />
                    <p className="text-sm text-brand-taupe">
                      Sube fotos cálidas y bien iluminadas: son las que enamoran.
                    </p>
                    <CldUploadWidget
                      signatureEndpoint="/api/cloudinary/sign"
                      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                      options={{ multiple: true, maxFiles: 8, folder: "camihogar/productos" }}
                      onSuccess={(results) => {
                        const info = results.info;
                        if (info && typeof info === "object" && "secure_url" in info) {
                          addImage(info.secure_url);
                        }
                      }}
                    >
                      {({ open }) => (
                        <Button type="button" variant="outline" onClick={() => open()}>
                          <UploadCloud aria-hidden="true" />
                          Subir fotos
                        </Button>
                      )}
                    </CldUploadWidget>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-dashed border-brand-dark/15 bg-secondary/40 p-5">
                    <p className="text-sm text-brand-taupe">
                      Configura Cloudinary en <code className="rounded bg-brand-dark/5 px-1">.env.local</code>{" "}
                      para carga directa. Mientras tanto, pega la URL de una imagen:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addImage(manualUrl);
                            setManualUrl("");
                          }
                        }}
                        placeholder="https://res.cloudinary.com/… o /products/sofa.svg"
                        aria-label="URL de la imagen"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          addImage(manualUrl);
                          setManualUrl("");
                        }}
                      >
                        <Plus aria-hidden="true" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                )}

                {data.images.length > 0 ? (
                  <ul className="flex flex-wrap gap-3">
                    {data.images.map((url, index) => (
                      <li
                        key={url}
                        className="relative h-20 w-20 overflow-hidden rounded-2xl border border-brand-dark/10 bg-secondary"
                      >
                        <Image
                          src={url}
                          alt={`Foto ${index + 1} del mueble`}
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Quitar foto ${index + 1}`}
                          onClick={() => removeImage(url)}
                          className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow-warm-sm transition-transform hover:scale-110"
                        >
                          <X className="h-3 w-3 text-brand-dark" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-brand-taupe/80">
                    Puedes continuar sin fotos, pero un mueble con fotos abraza mucho más.
                  </p>
                )}
              </div>
            )}

            {/* ------------- Paso 3: Dimensiones y personalización ------------- */}
            {step === 3 && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <SectionTitle
                    title="Dimensiones"
                    subtitle="Ayudan a imaginar el mueble en casa"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="wizard-width">Ancho</Label>
                      <Input
                        id="wizard-width"
                        type="number"
                        min={0}
                        value={data.width}
                        onChange={(e) => patch({ width: e.target.value })}
                        placeholder="200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wizard-height">Alto</Label>
                      <Input
                        id="wizard-height"
                        type="number"
                        min={0}
                        value={data.height}
                        onChange={(e) => patch({ height: e.target.value })}
                        placeholder="85"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wizard-depth">Profundidad</Label>
                      <Input
                        id="wizard-depth"
                        type="number"
                        min={0}
                        value={data.depth}
                        onChange={(e) => patch({ depth: e.target.value })}
                        placeholder="90"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wizard-unit">Unidad</Label>
                      <Select value={data.unit} onValueChange={(unit) => patch({ unit })}>
                        <SelectTrigger id="wizard-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle
                    title="Telas y tapizados"
                    subtitle="Toca un chip para incluirlo en el producto"
                  />
                  <div className="flex flex-wrap gap-2">
                    {fabricChips.map((fabric) => (
                      <OptionChip
                        key={fabric.name}
                        active={data.fabrics.some((f) => f.name === fabric.name)}
                        label={fabric.name}
                        hex={fabric.hex}
                        detail={fabric.priceExtra > 0 ? `+$${fabric.priceExtra}` : undefined}
                        onToggle={() => toggleFabric(fabric)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-secondary/40 p-3">
                    <div className="min-w-[140px] flex-1 space-y-1.5">
                      <Label htmlFor="custom-fabric-name" className="text-xs">
                        Agregar personalizado
                      </Label>
                      <Input
                        id="custom-fabric-name"
                        value={customFabric.name}
                        onChange={(e) =>
                          setCustomFabric((c) => ({ ...c, name: e.target.value }))
                        }
                        placeholder="Nombre de la tela"
                        className="h-10"
                      />
                    </div>
                    <input
                      type="color"
                      value={customFabric.hex}
                      onChange={(e) =>
                        setCustomFabric((c) => ({ ...c, hex: e.target.value }))
                      }
                      aria-label="Color de la tela"
                      className="h-10 w-12 cursor-pointer rounded-xl border border-input bg-brand-card p-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={customFabric.extra}
                      onChange={(e) =>
                        setCustomFabric((c) => ({ ...c, extra: e.target.value }))
                      }
                      placeholder="Extra $"
                      aria-label="Costo extra de la tela en dólares"
                      className="h-10 w-24"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addCustomFabric}>
                      <Plus aria-hidden="true" />
                      Agregar
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle
                    title="Acabados"
                    subtitle="Maderas y metales disponibles"
                  />
                  <div className="flex flex-wrap gap-2">
                    {finishChips.map((finish) => (
                      <OptionChip
                        key={finish.name}
                        active={data.finishes.some((f) => f.name === finish.name)}
                        label={finish.name}
                        hex={finish.hex}
                        detail={finish.priceExtra > 0 ? `+$${finish.priceExtra}` : undefined}
                        onToggle={() => toggleFinish(finish)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-secondary/40 p-3">
                    <div className="min-w-[140px] flex-1 space-y-1.5">
                      <Label htmlFor="custom-finish-name" className="text-xs">
                        Agregar personalizado
                      </Label>
                      <Input
                        id="custom-finish-name"
                        value={customFinish.name}
                        onChange={(e) =>
                          setCustomFinish((c) => ({ ...c, name: e.target.value }))
                        }
                        placeholder="Nombre del acabado"
                        className="h-10"
                      />
                    </div>
                    <input
                      type="color"
                      value={customFinish.hex}
                      onChange={(e) =>
                        setCustomFinish((c) => ({ ...c, hex: e.target.value }))
                      }
                      aria-label="Color del acabado"
                      className="h-10 w-12 cursor-pointer rounded-xl border border-input bg-brand-card p-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={customFinish.extra}
                      onChange={(e) =>
                        setCustomFinish((c) => ({ ...c, extra: e.target.value }))
                      }
                      placeholder="Extra $"
                      aria-label="Costo extra del acabado en dólares"
                      className="h-10 w-24"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addCustomFinish}>
                      <Plus aria-hidden="true" />
                      Agregar
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle
                    title="Configuraciones"
                    subtitle="Distribuciones y medidas alternativas"
                  />
                  <div className="flex flex-wrap gap-2">
                    {configChips.map((config) => (
                      <OptionChip
                        key={config.label}
                        active={data.configurations.some((c) => c.label === config.label)}
                        label={config.label}
                        detail={`×${config.priceMultiplier}`}
                        onToggle={() => toggleConfiguration(config)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-secondary/40 p-3">
                    <div className="min-w-[140px] flex-1 space-y-1.5">
                      <Label htmlFor="custom-config-label" className="text-xs">
                        Agregar personalizada
                      </Label>
                      <Input
                        id="custom-config-label"
                        value={customConfig.label}
                        onChange={(e) =>
                          setCustomConfig((c) => ({ ...c, label: e.target.value }))
                        }
                        placeholder="Ej: 4 Puestos"
                        className="h-10"
                      />
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step="0.05"
                      value={customConfig.multiplier}
                      onChange={(e) =>
                        setCustomConfig((c) => ({ ...c, multiplier: e.target.value }))
                      }
                      placeholder="Multiplicador"
                      aria-label="Multiplicador de precio de la configuración"
                      className="h-10 w-32"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addCustomConfig}>
                      <Plus aria-hidden="true" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------ Paso 4: Vista previa y publicar ------------------ */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-2xl bg-secondary/40 p-4">
                    <div>
                      <Label htmlFor="wizard-featured">Destacado</Label>
                      <p className="text-xs text-brand-taupe">Aparece en la portada</p>
                    </div>
                    <Switch
                      id="wizard-featured"
                      checked={data.isFeatured}
                      onCheckedChange={(isFeatured) => patch({ isFeatured })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-secondary/40 p-4">
                    <div>
                      <Label htmlFor="wizard-stock">En stock</Label>
                      <p className="text-xs text-brand-taupe">Disponible para entrega</p>
                    </div>
                    <Switch
                      id="wizard-stock"
                      checked={data.inStock}
                      onCheckedChange={(inStock) => patch({ inStock })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle
                    title="Así se verá en la tienda"
                    subtitle={`${data.images.length} ${data.images.length === 1 ? "foto" : "fotos"} · ${optionsCount} ${optionsCount === 1 ? "opción" : "opciones"} de personalización`}
                  />
                  <div className="pointer-events-none mx-auto w-full max-w-sm">
                    <ProductCard product={preview} />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {stepError && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {stepError}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={step === 1 || submitting}
        >
          <ArrowLeft aria-hidden="true" />
          Atrás
        </Button>

        {step < 4 ? (
          <Button type="button" onClick={goNext}>
            Siguiente
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" variant="accent" onClick={publish} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Publicando…
              </>
            ) : (
              <>
                <Sparkles aria-hidden="true" />
                Publicar mueble
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
