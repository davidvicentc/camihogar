import Link from "next/link";
import { AlertTriangle, CheckCircle2, Cloud, HardDrive, ImageIcon, PackagePlus } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-session";
import { getR2StorageStats } from "@/lib/r2";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

function bytes(value: number) {
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

export default async function ImageStoragePage() {
  await requireAdminPage("products.read");
  let stats;
  let connectionError = "";
  try { stats = await getR2StorageStats(); } catch (error) {
    stats = { configured: true, imageCount: 0, bytesUsed: 0, limitBytes: 10 * 1024 ** 3, percentUsed: 0 };
    connectionError = error instanceof Error ? error.message : "No se pudo consultar Cloudflare R2.";
  }
  const remaining = Math.max(0, stats.limitBytes - stats.bytesUsed);
  const level = stats.percentUsed >= 90 ? "crítico" : stats.percentUsed >= 75 ? "atención" : "saludable";

  return <div className="space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand-accent">Cloudflare R2</p><h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark">Almacenamiento de imágenes</h1><p className="mt-1 text-sm text-brand-taupe">Uso real de las fotografías de productos guardadas en el bucket.</p></div><Button asChild variant="accent"><Link href="/admin/productos/nuevo"><PackagePlus aria-hidden="true"/>Subir fotos a un producto</Link></Button></header>

    {!stats.configured ? <section className="rounded-3xl border border-amber-300 bg-amber-50 p-6"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/><div><h2 className="font-semibold text-amber-950">Cloudflare R2 está pendiente de conectar</h2><p className="mt-1 text-sm text-amber-900/75">Completa las variables R2 del servidor y reinicia la aplicación. El cargador de productos quedará activo automáticamente.</p><Link href="/admin/ayuda/productos" className="mt-3 inline-block text-sm font-semibold text-amber-900 underline">Consultar la guía</Link></div></div></section> : <>
      {connectionError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">No se pudo leer el bucket: {connectionError}</p>}
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm"><ImageIcon className="h-5 w-5 text-brand-accent"/><p className="mt-4 text-3xl font-bold tabular-nums text-brand-dark">{stats.imageCount}</p><p className="text-sm text-brand-taupe">Imágenes de productos</p></div><div className="rounded-2xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm"><HardDrive className="h-5 w-5 text-brand-accent"/><p className="mt-4 text-3xl font-bold tabular-nums text-brand-dark">{bytes(stats.bytesUsed)}</p><p className="text-sm text-brand-taupe">Espacio utilizado</p></div><div className="rounded-2xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm"><Cloud className="h-5 w-5 text-brand-accent"/><p className="mt-4 text-3xl font-bold tabular-nums text-brand-dark">{bytes(remaining)}</p><p className="text-sm text-brand-taupe">Disponible según tu límite</p></div></section>
      <section className="rounded-3xl border border-brand-dark/10 bg-brand-card p-6 shadow-warm-sm sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-xl font-semibold text-brand-dark">Capacidad del bucket</h2><p className="mt-1 text-sm text-brand-taupe">Límite de control configurado: {bytes(stats.limitBytes)}</p></div><p className="text-3xl font-bold tabular-nums text-brand-dark">{stats.percentUsed.toFixed(stats.percentUsed < 1 ? 2 : 1)}%</p></div><Progress value={stats.percentUsed} className="mt-5 h-3"/><div className="mt-4 flex items-center gap-2 text-sm text-brand-taupe">{level === "saludable" ? <CheckCircle2 className="h-4 w-4 text-green-700"/> : <AlertTriangle className="h-4 w-4 text-amber-700"/>}<span>Estado {level}. El aviso cambia al superar 75% y vuelve crítico al 90%.</span></div></section>
    </>}
  </div>;
}
