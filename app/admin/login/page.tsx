"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLockup } from "@/components/brand/logo";
import { BRAND } from "@/lib/constants";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined, password }),
      });
      if (res.ok) {
        router.push(searchParams.get("from") ?? "/admin");
        router.refresh();
        return; // mantiene el estado de carga mientras navega
      }
      setError(true);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-hero-gradient px-4">
      {/* Trama de la ventana del logo y luz cálida detrás de la tarjeta */}
      <div
        className="pointer-events-none absolute inset-0 logo-grid opacity-40 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-accent/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm animate-fade-up rounded-[1.75rem] border border-white/10 bg-brand-card/95 p-8 shadow-warm-lg backdrop-blur-xl">
        <div className="mb-8 text-center">
          <LogoLockup className="mx-auto w-32" priority />
          <span className="mx-auto mt-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-accent/10 text-brand-accent ring-1 ring-inset ring-brand-accent/15">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm tracking-tight text-brand-taupe">
            Panel del hogar — solo para el equipo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Correo (usuarios)</Label>
            <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Clave de acceso</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
            >
              Clave incorrecta. Inténtalo de nuevo.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-brand-taupe/70">{BRAND.tagline}</p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
