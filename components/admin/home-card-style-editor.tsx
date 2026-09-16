"use client";

import { useState, useTransition } from "react";
import { Check, ImageIcon, Layers3, Loader2, MousePointer2, Palette, Save, SlidersHorizontal, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveHomeCardStyle } from "@/lib/actions/admin";
import { CARD_PROFILE_OPTIONS, type CardProfileKey, type CardStyle } from "@/lib/card-style";

type Inspector = "card" | "image" | "brand" | "category" | "title" | "body" | "price" | "rating" | "variants" | "button" | "content";

const SAMPLE: Record<CardProfileKey, { category: string; title: string; variant: string }> = {
  furniture: { category: "Muebles", title: "Sofá cama Marruecos", variant: "Tela arena" },
  beds: { category: "Camas", title: "Cama Serena", variant: "Queen" },
  storage: { category: "Almacenamiento", title: "Centro de TV Nórdico", variant: "Roble natural" },
  mattresses: { category: "Colchones", title: "Colchón Ortopédico", variant: "Matrimonial" },
};

const INSPECTOR_COPY: Record<Inspector, { title: string; description: string }> = {
  card: { title: "Tarjeta", description: "Fondo, borde, espacio interno y forma general." },
  image: { title: "Imagen", description: "Controla exactamente cuánto espacio ocupa la fotografía." },
  brand: { title: "Marca", description: "Edita el texto, tamaño y color de la marca." },
  category: { title: "Categoría", description: "Ajusta el tamaño y color de la categoría." },
  title: { title: "Nombre del producto", description: "Jerarquía y color del título principal." },
  body: { title: "Descripción", description: "Ajusta la lectura del texto secundario." },
  price: { title: "Precio", description: "Haz que el dato comercial tenga la jerarquía correcta." },
  rating: { title: "Calificación", description: "Ajusta el tamaño y color de estrellas y reseñas." },
  variants: { title: "Variantes", description: "Tamaño, separación y visibilidad de las opciones." },
  button: { title: "Botón de WhatsApp", description: "Altura y visibilidad de la acción principal." },
  content: { title: "Contenido visible", description: "Decide qué información necesita esta familia." },
};

function Slider({ label, value, min, max, unit = "px", onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (value: number) => void }) {
  return <label className="block rounded-2xl border border-brand-dark/10 bg-brand-bg/60 p-4"><span className="flex items-center justify-between gap-3 text-sm font-semibold text-brand-dark"><span>{label}</span><output className="rounded-lg bg-brand-card px-2 py-1 font-mono text-xs text-brand-accent">{value}{unit}</output></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-4 h-2 w-full cursor-pointer accent-brand-accent" /></label>;
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-brand-bg/60 px-4"><span className="text-sm font-semibold text-brand-dark">{label}</span><span className="flex items-center gap-2"><span className="font-mono text-xs text-brand-taupe">{value}</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-11 cursor-pointer rounded-lg border border-brand-dark/10 bg-transparent p-1" /></span></label>;
}

export function HomeCardStyleEditor({ initialStyles }: { initialStyles: Record<CardProfileKey, CardStyle> }) {
  const [profile, setProfile] = useState<CardProfileKey>("furniture");
  const [styles, setStyles] = useState(initialStyles);
  const [inspector, setInspector] = useState<Inspector | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const style = styles[profile];
  const sample = SAMPLE[profile];
  const update = <K extends keyof CardStyle>(key: K, value: CardStyle[K]) => setStyles((current) => ({ ...current, [profile]: { ...current[profile], [key]: value } }));

  function save() {
    setMessage(""); setError("");
    startTransition(async () => {
      const result = await saveHomeCardStyle(profile, style);
      if (result.ok) setMessage(`Diseño de ${CARD_PROFILE_OPTIONS.find((item) => item.key === profile)?.label} publicado.`);
      else setError(result.error ?? "No se pudo guardar.");
    });
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-brand-accent"/><h2 className="font-display text-2xl font-semibold text-brand-dark">Editor visual de cards</h2></div><p className="mt-1 max-w-xl text-sm text-brand-taupe">Selecciona una familia y toca la parte de la tarjeta que quieres modificar.</p></div>
      <label className="min-w-72 text-sm font-semibold text-brand-dark">Familia de producto<select value={profile} onChange={(event) => { setProfile(event.target.value as CardProfileKey); setMessage(""); }} className="mt-2 h-12 w-full rounded-xl border border-input bg-brand-card px-3 text-sm">{CARD_PROFILE_OPTIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-3xl bg-brand-dark p-5 shadow-warm sm:p-7">
        <div className="flex items-center justify-between gap-3 text-brand-bg"><div><p className="font-semibold">Vista previa interactiva</p><p className="mt-1 text-xs text-brand-bg/55">Los contornos aparecen al pasar el cursor</p></div><MousePointer2 className="h-5 w-5 text-brand-accent"/></div>
        <div className="mt-5 flex min-h-[560px] items-center justify-center rounded-2xl bg-brand-bg p-5 sm:p-8">
          <div className={`group/card relative w-full max-w-[330px] overflow-hidden border shadow-warm transition-all ${style.radius === "small" ? "rounded-lg" : style.radius === "medium" ? "rounded-2xl" : "rounded-[1.5rem]"}`} style={{ backgroundColor: style.cardBackground, borderColor: style.borderColor }}>
            <button type="button" onClick={() => setInspector("card")} aria-label="Editar tarjeta" className="absolute right-2 top-2 z-20 rounded-lg bg-brand-dark/80 px-2 py-1 text-[10px] font-semibold text-white opacity-0 backdrop-blur transition-opacity group-hover/card:opacity-100">Editar card</button>
            <button type="button" onClick={() => setInspector("image")} className="group/image relative block w-full overflow-hidden bg-brand-sand outline-none ring-inset hover:ring-2 hover:ring-brand-accent focus-visible:ring-2 focus-visible:ring-brand-accent" style={{ height: Math.min(style.imageHeight, 360) }}><span className="absolute inset-0 flex items-center justify-center text-brand-taupe/35"><ImageIcon className="h-10 w-10"/></span><span className="absolute bottom-2 right-2 rounded-lg bg-brand-dark/80 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover/image:opacity-100">Imagen · {style.imageHeight}px</span></button>
            <div className="space-y-2" style={{ padding: style.cardPadding }}>
              {style.showBrand && <button type="button" onClick={() => setInspector("brand")} className="block w-full truncate rounded-md text-left font-bold leading-tight outline-none hover:ring-2 hover:ring-brand-accent focus-visible:ring-2" style={{ color: style.accentColor, fontSize: style.brandFontSize }}>{style.brandText}</button>}
              {style.showCategory && <button type="button" onClick={() => setInspector("category")} className="block w-full truncate rounded-md text-left font-semibold uppercase tracking-[0.15em] outline-none hover:ring-2 hover:ring-brand-accent focus-visible:ring-2" style={{ color: style.mutedColor, fontSize: style.categoryFontSize }}>{sample.category}</button>}
              <button type="button" onClick={() => setInspector("title")} className="block w-full rounded-md text-left font-display font-semibold leading-tight outline-none hover:ring-2 hover:ring-brand-accent focus-visible:ring-2" style={{ color: style.textColor, fontSize: style.titleFontSize }}>{sample.title}</button>
              {style.showDescription && <button type="button" onClick={() => setInspector("body")} className="block w-full rounded-md text-left leading-relaxed outline-none hover:ring-2 hover:ring-brand-accent focus-visible:ring-2" style={{ color: style.mutedColor, fontSize: style.bodyFontSize }}>Una pieza cómoda, resistente y pensada para el uso diario.</button>}
              <div className="flex items-center justify-between gap-3 pt-1"><button type="button" onClick={() => setInspector("price")} className="rounded-md text-left font-bold outline-none hover:ring-2 hover:ring-brand-accent focus-visible:ring-2" style={{ color: style.textColor, fontSize: style.priceFontSize }}>$240</button>{style.showRating && <button type="button" onClick={() => setInspector("rating")} className="rounded-md outline-none hover:ring-2 hover:ring-brand-accent focus-visible:ring-2" style={{ color: style.mutedColor, fontSize: style.ratingFontSize }}>★ 5.0</button>}</div>
              {style.showVariants && <button type="button" onClick={() => setInspector("variants")} className="flex w-full items-center rounded-xl border px-3 text-left outline-none hover:ring-2 hover:ring-brand-accent focus-visible:ring-2" style={{ minHeight: Math.min(style.variantsHeight, 92), borderColor: style.borderColor, color: style.mutedColor, fontSize: style.variantsFontSize }}>{sample.variant} · $240</button>}
              {style.showWhatsapp && <button type="button" onClick={() => setInspector("button")} className="w-full rounded-xl bg-[#25D366] px-3 font-semibold text-white outline-none hover:ring-2 hover:ring-brand-accent focus-visible:ring-2" style={{ height: style.buttonHeight, fontSize: style.buttonFontSize }}>{style.buttonText}</button>}
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-3 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-accent">Acciones rápidas</p><h3 className="mt-1 font-display text-xl font-semibold text-brand-dark">¿Qué deseas editar?</h3></div>
        {[{ key: "content", label: "Contenido visible", icon: Layers3 }, { key: "card", label: "Tarjeta y colores", icon: Palette }, { key: "image", label: "Fotografía", icon: ImageIcon }, { key: "title", label: "Textos y precio", icon: Type }, { key: "variants", label: "Variantes", icon: SlidersHorizontal }].map((item) => <button key={item.key} type="button" onClick={() => setInspector(item.key as Inspector)} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-brand-dark/10 bg-brand-bg/60 px-4 text-left text-sm font-semibold text-brand-dark transition-colors hover:border-brand-accent hover:bg-brand-accent/5"><item.icon className="h-4 w-4 text-brand-accent"/>{item.label}</button>)}
        <p className="rounded-2xl bg-brand-accent/5 p-3 text-xs leading-relaxed text-brand-taupe">Los cambios pertenecen solo a <strong className="text-brand-dark">{CARD_PROFILE_OPTIONS.find((item) => item.key === profile)?.label}</strong>.</p>
      </aside>
    </div>

    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700"><Check className="h-4 w-4"/>{message}</p>}
    <div className="sticky bottom-4 z-20 flex justify-end"><Button type="button" variant="accent" size="lg" onClick={save} disabled={pending} className="shadow-warm">{pending ? <Loader2 className="animate-spin"/> : <Save/>}{pending ? "Publicando..." : "Publicar este perfil"}</Button></div>

    <Dialog open={inspector !== null} onOpenChange={(openDialog) => { if (!openDialog) setInspector(null); }}><DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">{inspector && <><DialogHeader><DialogTitle>{INSPECTOR_COPY[inspector].title}</DialogTitle><DialogDescription>{INSPECTOR_COPY[inspector].description}</DialogDescription></DialogHeader><div className="space-y-3 py-2">
      {inspector === "card" && <><Slider label="Espacio interno" value={style.cardPadding} min={8} max={40} onChange={(value) => update("cardPadding", value)}/><ColorControl label="Fondo" value={style.cardBackground} onChange={(value) => update("cardBackground", value)}/><ColorControl label="Borde" value={style.borderColor} onChange={(value) => update("borderColor", value)}/><label className="block text-sm font-semibold text-brand-dark">Forma<select value={style.radius} onChange={(event) => update("radius", event.target.value as CardStyle["radius"])} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"><option value="small">Esquinas sutiles</option><option value="medium">Redondeado medio</option><option value="large">Redondeado amplio</option></select></label></>}
      {inspector === "image" && <Slider label="Alto de fotografía" value={style.imageHeight} min={160} max={560} onChange={(value) => update("imageHeight", value)}/>} 
      {inspector === "brand" && <><label className="block text-sm font-semibold text-brand-dark">Texto de marca<input value={style.brandText} onChange={(event) => update("brandText", event.target.value)} maxLength={40} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal" /></label><Slider label="Tamaño de marca" value={style.brandFontSize} min={10} max={40} onChange={(value) => update("brandFontSize", value)}/><ColorControl label="Color de marca" value={style.accentColor} onChange={(value) => update("accentColor", value)}/></>}
      {inspector === "category" && <><Slider label="Tamaño de categoría" value={style.categoryFontSize} min={8} max={24} onChange={(value) => update("categoryFontSize", value)}/><ColorControl label="Color de categoría" value={style.mutedColor} onChange={(value) => update("mutedColor", value)}/></>}
      {inspector === "title" && <><Slider label="Tamaño del nombre" value={style.titleFontSize} min={12} max={36} onChange={(value) => update("titleFontSize", value)}/><ColorControl label="Color principal" value={style.textColor} onChange={(value) => update("textColor", value)}/></>}
      {inspector === "body" && <><Slider label="Tamaño de descripción" value={style.bodyFontSize} min={10} max={20} onChange={(value) => update("bodyFontSize", value)}/><ColorControl label="Color secundario" value={style.mutedColor} onChange={(value) => update("mutedColor", value)}/></>}
      {inspector === "price" && <><Slider label="Tamaño del precio" value={style.priceFontSize} min={12} max={40} onChange={(value) => update("priceFontSize", value)}/><ColorControl label="Color del precio" value={style.textColor} onChange={(value) => update("textColor", value)}/></>}
      {inspector === "rating" && <><Slider label="Tamaño de calificación" value={style.ratingFontSize} min={8} max={24} onChange={(value) => update("ratingFontSize", value)}/><ColorControl label="Color de calificación" value={style.mutedColor} onChange={(value) => update("mutedColor", value)}/></>}
      {inspector === "variants" && <><Slider label="Alto del bloque" value={style.variantsHeight} min={48} max={260} onChange={(value) => update("variantsHeight", value)}/><Slider label="Tamaño del texto" value={style.variantsFontSize} min={10} max={20} onChange={(value) => update("variantsFontSize", value)}/><Slider label="Separación entre opciones" value={style.variantsGap} min={4} max={24} onChange={(value) => update("variantsGap", value)}/></>}
      {inspector === "button" && <><label className="block text-sm font-semibold text-brand-dark">Texto del botón<input value={style.buttonText} onChange={(event) => update("buttonText", event.target.value)} maxLength={42} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal" /></label><Slider label="Tamaño del texto" value={style.buttonFontSize} min={10} max={24} onChange={(value) => update("buttonFontSize", value)}/><Slider label="Altura del botón" value={style.buttonHeight} min={32} max={64} onChange={(value) => update("buttonHeight", value)}/></>} 
      {inspector === "content" && <div className="space-y-2">{([{ key: "showBrand", label: "Marca" }, { key: "showCategory", label: "Categoría" }, { key: "showDescription", label: "Descripción" }, { key: "showRating", label: "Calificación" }, { key: "showVariants", label: "Variantes" }, { key: "showWhatsapp", label: "WhatsApp" }] as const).map((item) => <label key={item.key} className="flex min-h-14 items-center justify-between rounded-2xl border border-brand-dark/10 bg-brand-bg/60 px-4"><span className="text-sm font-semibold text-brand-dark">{item.label}</span><Switch checked={style[item.key]} onCheckedChange={(value) => update(item.key, value)}/></label>)}</div>}
    </div><DialogFooter><Button type="button" variant="accent" onClick={() => setInspector(null)}><Check/>Aplicar cambios</Button></DialogFooter></>}</DialogContent></Dialog>
  </section>;
}
