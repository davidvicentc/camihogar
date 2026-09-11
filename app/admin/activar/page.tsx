"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ActivatePage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/activar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: window.location.hash.slice(1), password }) });
      const result = await response.json();
      if (!response.ok) setError(result.error);
      else { setDone(true); window.history.replaceState(null, "", "/admin/activar"); }
    } catch { setError("No se pudo conectar. Vuelve a intentarlo."); }
    finally { setPending(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4"><div className="w-full max-w-md space-y-6 rounded-3xl border bg-brand-card p-8 shadow-warm-sm"><h1 className="font-display text-3xl text-brand-dark">Bienvenido al equipo</h1>{done ? <><p>Tu contraseña está lista. Entra con el correo de tu invitación; encontrarás el tutorial dentro del panel.</p><Button asChild><Link href="/admin/login">Ir a iniciar sesión</Link></Button></> : <form onSubmit={submit} className="space-y-5"><p className="text-sm text-brand-taupe">Crea tu contraseña personal para activar el acceso. El enlace es válido durante 48 horas y se utiliza una sola vez.</p><div className="space-y-2"><Label htmlFor="password">Contraseña (12 a 128 caracteres)</Label><Input id="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirmation">Repite la contraseña</Label><Input id="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={pending} type="submit">{pending ? "Activando…" : "Activar mi acceso"}</Button></form>}</div></main>;
}
