"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteMattressOption, saveMattressOption } from "@/lib/actions/mattress-options";
import type { MattressOptionDTO } from "@/lib/data/mattress-options";
import type { MattressOptionKind } from "@/lib/models/MattressOption";

const LABELS: Record<MattressOptionKind, { title: string; singular: string; example: string }> = {
  size: { title: "Medidas", singular: "medida", example: "Ej. Super King" },
  pillow: { title: "Pillows", singular: "pillow", example: "Ej. Euro Pillow" },
  model: { title: "Tipos", singular: "tipo", example: "Ej. Anatómico" },
  composition: { title: "Composiciones", singular: "composición", example: "Ej. Híbrido" },
};

function OptionGroup({ kind, initialItems }: { kind: MattressOptionKind; initialItems: MattressOptionDTO[] }) {
  const [items, setItems] = useState(initialItems); const [name, setName] = useState(""); const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState(""); const [pending, startTransition] = useTransition(); const labels = LABELS[kind];
  function reset() { setName(""); setEditing(null); setError(""); }
  function save() { if (!name.trim()) return; startTransition(async () => { const result = await saveMattressOption(kind, name, editing ?? undefined); if (!result.ok) { setError(result.error ?? "No se pudo guardar."); return; } if (editing) setItems((current) => current.map((item) => item._id === editing ? { ...item, name: name.trim() } : item)); else if (result.data) setItems((current) => [...current, { _id: result.data!._id, kind, name: result.data!.name, isActive: true }]); reset(); }); }
  function remove(item: MattressOptionDTO) { if (!window.confirm(`¿Eliminar “${item.name}”?`)) return; startTransition(async () => { const result = await deleteMattressOption(item._id); if (!result.ok) { setError(result.error ?? "No se pudo eliminar."); return; } setItems((current) => current.filter((option) => option._id !== item._id)); }); }
  return <section className="space-y-4 rounded-2xl border border-brand-dark/10 bg-brand-card p-5"><div><h2 className="font-display text-xl font-semibold text-brand-dark">{labels.title}</h2><p className="text-xs text-brand-taupe">Se muestran en los selectores del producto.</p></div><div className="flex gap-2"><Input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); }} placeholder={labels.example}/><Button type="button" variant="accent" size="icon" onClick={save} disabled={pending || !name.trim()} aria-label={`${editing ? "Guardar" : "Agregar"} ${labels.singular}`}>{editing ? <Check/> : <Plus/>}</Button>{editing && <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label="Cancelar"><X/></Button>}</div>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}<div className="divide-y divide-brand-dark/10">{items.map((item) => <div key={item._id} className="flex min-h-12 items-center justify-between gap-2"><span className="text-sm font-medium text-brand-dark">{item.name}</span><span className="flex"><Button type="button" variant="ghost" size="icon" onClick={() => { setEditing(item._id); setName(item.name); }} aria-label={`Editar ${item.name}`}><Pencil/></Button><Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => remove(item)} aria-label={`Eliminar ${item.name}`}><Trash2/></Button></span></div>)}</div></section>;
}

export function MattressOptionsManager({ groups }: { groups: { sizes: MattressOptionDTO[]; pillows: MattressOptionDTO[]; models: MattressOptionDTO[]; compositions: MattressOptionDTO[] } }) {
  return <div className="grid gap-5 lg:grid-cols-2"><OptionGroup kind="size" initialItems={groups.sizes}/><OptionGroup kind="pillow" initialItems={groups.pillows}/><OptionGroup kind="model" initialItems={groups.models}/><OptionGroup kind="composition" initialItems={groups.compositions}/></div>;
}
