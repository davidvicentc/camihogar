"use client";

import { useState, useTransition } from "react";
import { Check, Edit3, Loader2, Monitor, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSiteSettings } from "@/lib/actions/admin";

type Settings = {
  whatsappNumber: string; instagramUrl: string; facebookUrl: string; tagline: string; warrantyText: string; deliveryText: string; email: string;
  heroTitle: string; heroSubtitle: string; heroEyebrow: string; heroButtonText: string; heroPrimaryStat: string; heroPrimaryStatLabel: string; heroQualityStat: string; heroQualityStatLabel: string; heroCountryStat: string; heroCountryStatLabel: string; taxNoteText: string;
};

type EditableField = keyof Pick<Settings, "heroTitle" | "heroSubtitle" | "heroEyebrow" | "heroButtonText" | "heroPrimaryStat" | "heroPrimaryStatLabel" | "heroQualityStat" | "heroQualityStatLabel" | "heroCountryStat" | "heroCountryStatLabel">;
const labels: Record<EditableField, string> = {
  heroTitle: "Título principal", heroSubtitle: "Texto de apoyo", heroEyebrow: "Mensaje superior", heroButtonText: "Texto del botón", heroPrimaryStat: "Cifra de hogares", heroPrimaryStatLabel: "Etiqueta de hogares", heroQualityStat: "Indicador de calidad", heroQualityStatLabel: "Etiqueta de calidad", heroCountryStat: "Cifra de origen", heroCountryStatLabel: "Etiqueta de origen",
};

export function HomeContentEditor({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(""); setError("");
    startTransition(async () => {
      const result = await saveSiteSettings(settings);
      if (result.ok) { setMessage("Home publicado correctamente."); setEditing(null); }
      else setError(result.error ?? "No se pudo publicar el home.");
    });
  }

  const editable = (field: EditableField, className: string) => (
    <button type="button" onClick={() => setEditing(field)} className={`${className} group/edit relative rounded-lg text-left outline-none ring-offset-4 ring-offset-brand-dark hover:ring-2 hover:ring-brand-accent focus-visible:ring-2 focus-visible:ring-brand-accent`}>
      {settings[field]}
      <span className="absolute -right-2 -top-2 hidden rounded-full bg-brand-accent p-1 text-white shadow group-hover/edit:block"><Edit3 className="h-3 w-3" /></span>
    </button>
  );

  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><Monitor className="h-5 w-5 text-brand-accent"/><h2 className="font-display text-2xl font-semibold text-brand-dark">Personalizador del home</h2></div><p className="mt-1 text-sm text-brand-taupe">Toca cualquier texto resaltable en la vista previa para cambiarlo.</p></div><Button type="button" variant="accent" onClick={save} disabled={pending}>{pending ? <Loader2 className="animate-spin"/> : <Save/>}{pending ? "Publicando..." : "Publicar cambios"}</Button></div>
    <div className="overflow-hidden rounded-3xl border border-brand-dark/10 bg-brand-dark shadow-warm-lg">
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-red-400"/><span className="h-2.5 w-2.5 rounded-full bg-amber-400"/><span className="h-2.5 w-2.5 rounded-full bg-green-400"/><span className="ml-3 rounded-lg bg-white/10 px-3 py-1 text-[11px] text-white/60">camihogar.com</span></div>
      <div className="relative min-h-[480px] overflow-hidden bg-[linear-gradient(135deg,#2b211b_20%,#4a2f24_100%)] p-6 sm:p-10 lg:p-14">
        <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-brand-accent/20 blur-3xl"/>
        <div className="relative max-w-2xl space-y-6">{editable("heroEyebrow", "inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80")}{editable("heroTitle", "block max-w-xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl")}{editable("heroSubtitle", "block max-w-xl text-sm leading-relaxed text-white/70 sm:text-base")}{editable("heroButtonText", "inline-flex rounded-xl bg-brand-accent px-5 py-3 text-sm font-semibold text-white")}<div className="grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6">{["heroPrimaryStat", "heroQualityStat", "heroCountryStat"].map((field) => <div key={field} className="space-y-1">{editable(field as EditableField, "block font-display text-xl font-semibold text-white")}{editable(`${field}Label` as EditableField, "block text-xs text-white/50")}</div>)}</div></div>
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700"><Check className="h-4 w-4"/>{message}</p>}
    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>{editing ? labels[editing] : "Editar texto"}</DialogTitle><DialogDescription>El cambio se verá en el home después de publicar.</DialogDescription></DialogHeader>{editing && <div className="space-y-2"><Label htmlFor="home-text">Contenido</Label>{editing === "heroSubtitle" ? <textarea id="home-text" rows={4} value={settings[editing]} onChange={(event) => setSettings((current) => ({ ...current, [editing]: event.target.value }))} className="w-full rounded-xl border border-input bg-background p-3 text-sm"/> : <Input id="home-text" value={settings[editing]} onChange={(event) => setSettings((current) => ({ ...current, [editing]: event.target.value }))}/>}</div>}<DialogFooter><Button type="button" variant="accent" onClick={() => setEditing(null)}><Check/>Aplicar en la vista previa</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
