"use client";

import { useState, useTransition } from "react";
import { Check, Eye, Loader2, Palette, Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { saveHomeCardStyle } from "@/lib/actions/admin";

type CardStyle = { showBrand: boolean; showCategory: boolean; showDescription: boolean; showRating: boolean; showVariants: boolean; showWhatsapp: boolean; scale: "compact" | "standard" | "large"; accentColor: string };

const controls: { key: keyof Omit<CardStyle, "scale" | "accentColor">; label: string; detail: string }[] = [
  { key: "showBrand", label: "Marca", detail: "Nombre grande sobre el producto" },
  { key: "showCategory", label: "Categoría", detail: "Ayuda a ubicar la pieza" },
  { key: "showDescription", label: "Descripción", detail: "Texto breve del producto" },
  { key: "showRating", label: "Calificación", detail: "Estrellas y reseñas" },
  { key: "showVariants", label: "Variantes", detail: "Opciones y sus precios" },
  { key: "showWhatsapp", label: "Botón de WhatsApp", detail: "Consulta directa desde la card" },
];

export function HomeCardStyleEditor({ initialStyle }: { initialStyle: CardStyle }) {
  const [style, setStyle] = useState(initialStyle);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const update = <K extends keyof CardStyle>(key: K, value: CardStyle[K]) => setStyle((current) => ({ ...current, [key]: value }));
  function save() { setMessage(""); setError(""); startTransition(async () => { const result = await saveHomeCardStyle(style); if (result.ok) setMessage("El diseño de las cards quedó publicado."); else setError(result.error ?? "No se pudo guardar."); }); }

  return <section className="space-y-5">
    <div><div className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-brand-accent" /><h2 className="font-display text-2xl font-semibold text-brand-dark">Diseño de las cards del home</h2></div><p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-taupe">Construye la vitrina a tu medida. Cambia la jerarquía, el tamaño y la información sin tocar código.</p></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
      <div className="rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-6">
        <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-brand-accent" /><h3 className="font-semibold text-brand-dark">Controles visuales</h3></div>
        <div className="mt-5 space-y-2">{controls.map((control) => <label key={control.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-brand-dark/8 bg-brand-bg/60 p-3"><span><span className="block text-sm font-semibold text-brand-dark">{control.label}</span><span className="block text-xs text-brand-taupe">{control.detail}</span></span><Switch checked={style[control.key]} onCheckedChange={(value) => update(control.key, value)} aria-label={`Mostrar ${control.label}`} /></label>)}</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-semibold text-brand-dark" htmlFor="card-scale">Tamaño de card</label><select id="card-scale" value={style.scale} onChange={(e) => update("scale", e.target.value as CardStyle["scale"])} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="compact">Compacta</option><option value="standard">Estándar</option><option value="large">Grande</option></select></div><div><label className="text-sm font-semibold text-brand-dark" htmlFor="card-accent">Color protagonista</label><div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-2"><input id="card-accent" type="color" value={style.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="h-8 w-10 cursor-pointer rounded" /><span className="font-mono text-xs text-brand-taupe">{style.accentColor}</span></div></div></div>
      </div>
      <div className="rounded-3xl border border-brand-dark/10 bg-brand-dark p-5 text-brand-bg shadow-warm-sm sm:p-6"><div className="flex items-center gap-2"><Eye className="h-4 w-4 text-brand-accent" /><h3 className="font-semibold">Vista previa en vivo</h3></div><div className="mt-5 flex min-h-[390px] items-center justify-center rounded-2xl bg-brand-bg p-5"><div className="w-full max-w-[280px] overflow-hidden rounded-[1.5rem] border border-brand-dark/10 bg-brand-card shadow-warm"><div className={style.scale === "large" ? "aspect-square bg-brand-sand" : style.scale === "compact" ? "aspect-[5/3] bg-brand-sand" : "aspect-[4/3] bg-brand-sand"} /><div className="space-y-2 p-4">{style.showBrand && <p style={{ color: style.accentColor }} className="text-xl font-bold">CamiHogar</p>}{style.showCategory && <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-taupe">Dormitorios</p>}<p className="font-display font-semibold text-brand-dark">Cama Serena</p>{style.showDescription && <p className="text-xs text-brand-taupe">Una pieza pensada para descansar mejor.</p>}<div className="flex items-center justify-between"><strong className="text-lg text-brand-dark">Desde $240</strong>{style.showRating && <span className="text-xs text-brand-taupe">★ 5.0</span>}</div>{style.showVariants && <div className="rounded-xl border border-brand-dark/10 p-2 text-xs text-brand-taupe">Individual · $240</div>}{style.showWhatsapp && <div className="rounded-xl bg-[#25D366] py-2 text-center text-xs font-semibold text-white">Consultar por WhatsApp</div>}</div></div></div></div>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700"><Check className="h-4 w-4" />{message}</p>}
    <Button type="button" variant="accent" onClick={save} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}{pending ? "Publicando..." : "Publicar diseño de cards"}</Button>
  </section>;
}
