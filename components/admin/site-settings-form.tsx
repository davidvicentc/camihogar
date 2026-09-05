"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWhatsAppNumber } from "@/lib/actions/admin";

export function SiteSettingsForm({ initialNumber }: { initialNumber: string }) {
  const [number, setNumber] = useState(initialNumber); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  function submit(event: React.FormEvent) { event.preventDefault(); setError(null); setMessage(null); startTransition(async () => { const result = await saveWhatsAppNumber(number); if (!result.ok) setError(result.error ?? "No se pudo guardar."); else setMessage("Número actualizado. Los próximos enlaces usarán este número."); }); }
  return <form onSubmit={submit} className="max-w-xl space-y-5 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-7"><div><h2 className="font-display text-xl font-semibold text-brand-dark">WhatsApp del catálogo</h2><p className="mt-1 text-sm text-brand-taupe">Formato internacional sin + ni espacios. Ejemplo: 584120000000.</p></div><div className="space-y-2"><Label htmlFor="settings-whatsapp">Número de WhatsApp</Label><Input id="settings-whatsapp" inputMode="numeric" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="584120000000" required /></div>{error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{message && <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700"><Check />{message}</p>}<Button type="submit" variant="accent" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}{pending ? "Guardando..." : "Guardar número"}</Button></form>;
}
