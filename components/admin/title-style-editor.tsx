"use client";

import { useRef, useState } from "react";
import { HeroTitle, type HeroTitleStyle, type TextStyleRange } from "@/lib/hero-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Value = HeroTitleStyle & { heroTitle: string };

export function TitleStyleEditor({ value, onChange }: { value: Value; onChange: (value: Value) => void }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [color, setColor] = useState("#E8511A");
  const [endColor, setEndColor] = useState("#FFB782");
  const [mode, setMode] = useState<"solid" | "gradient">("gradient");
  const [bold, setBold] = useState(false);
  const ranges = value.heroTitleRanges ?? [];
  function apply() {
    if (selection.start === selection.end) return;
    onChange({ ...value, heroTitleRanges: [...ranges, { ...selection, color, endColor, mode, bold }] });
  }
  return <fieldset className="space-y-5 rounded-2xl border border-brand-dark/10 bg-brand-card p-5">
    <legend className="px-2 font-semibold text-brand-dark">Editor del título por palabras</legend>
    <div className="space-y-2"><Label htmlFor="styled-title">Título principal</Label><textarea ref={input} id="styled-title" rows={3} value={value.heroTitle} onChange={(event) => { onChange({ ...value, heroTitle: event.target.value, heroTitleRanges: [] }); setSelection({start: 0, end: 0}); }} onSelect={() => { if (input.current) setSelection({start: input.current.selectionStart, end: input.current.selectionEnd}); }} className="w-full rounded-xl border border-input bg-background p-3 text-base"/><p className="text-sm text-brand-taupe">Selecciona cualquier palabra o frase y aplica su estilo. Puedes combinar tantos fragmentos como quieras. Al reescribir el título se limpian los estilos anteriores.</p></div>
    <div className="rounded-xl bg-brand-dark p-5 font-display text-3xl font-semibold leading-tight"><HeroTitle title={value.heroTitle} settings={value}/></div>
    <p className="text-sm text-brand-taupe" aria-live="polite">{selection.start !== selection.end ? `Selección: “${value.heroTitle.slice(selection.start, selection.end)}”` : "Selecciona texto en el recuadro para darle estilo."}</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2"><Label htmlFor="title-base">Color general</Label><Input id="title-base" type="color" value={value.heroTitleColor ?? "#FBF8F4"} onChange={(e) => onChange({...value, heroTitleColor: e.target.value})}/></div>
      <div className="space-y-2"><Label htmlFor="range-mode">Estilo de selección</Label><select id="range-mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="solid">Color sólido</option><option value="gradient">Degradado</option></select></div>
      <div className="space-y-2"><Label htmlFor="range-color">Color inicial</Label><Input id="range-color" type="color" value={color} onChange={(e) => setColor(e.target.value)}/></div>
      {mode === "gradient" && <div className="space-y-2"><Label htmlFor="range-end">Color final</Label><Input id="range-end" type="color" value={endColor} onChange={(e) => setEndColor(e.target.value)}/></div>}
    </div>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={bold} onChange={(e) => setBold(e.target.checked)}/>Negrita en la selección</label>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="accent" disabled={selection.start === selection.end} onClick={apply}>Aplicar a la selección</Button><Button type="button" variant="outline" onClick={() => onChange({...value, heroTitleRanges: []})}>Limpiar estilos</Button></div>
    {ranges.length > 0 && <ul className="divide-y divide-brand-dark/10">{ranges.map((range: TextStyleRange, index: number) => <li key={index} className="flex items-center justify-between gap-3 py-2 text-sm"><span>“{value.heroTitle.slice(range.start, range.end)}” · {range.mode === "solid" ? "Color" : "Degradado"}</span><Button type="button" variant="ghost" onClick={() => onChange({...value, heroTitleRanges: ranges.filter((_, i) => i !== index)})}>Quitar</Button></li>)}</ul>}
  </fieldset>;
}
