import Link from "next/link";
import { CheckCircle2, Eye, Layers3, PackagePlus } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-session";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const fields = [
  ["Nombre", "Nombre que verá el cliente. Incluye la configuración cuando ayude: Colchón Imperial 1 Pillow."],
  ["Modelo comercial", "Nombre de la línea o familia; no es la medida ni el tipo ortopédico."],
  ["Tipo, pillow y composición", "Configuración fija de todo el colchón. Se selecciona una sola vez por producto."],
  ["Garantía", "Años de garantía aplicables a todas las medidas de ese colchón."],
  ["Medida", "Tamaño disponible: Individual, Matrimonial, Queen, King u otro creado por el administrador."],
  ["Precio", "Precio específico de esa medida."],
  ["SKU", "Código interno único para inventario. Ejemplo: IMP-MAT-1P."],
  ["Fotos", "Hasta 8 imágenes. La primera es la portada y las demás forman la galería."],
] as const;

export default async function ProductHelpPage() {
  await requireAdminPage("products.read");
  return <div className="space-y-10">
    <header className="max-w-3xl"><p className="text-sm font-semibold text-brand-accent">Manual de productos</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">Cómo publicar un colchón correctamente</h1><p className="mt-3 leading-relaxed text-brand-taupe">Cada producto representa una configuración completa. Sus medidas cambian de precio, pero comparten pillow, tipo, composición y garantía.</p><Button asChild variant="accent" className="mt-5"><Link href="/admin/productos/nuevo"><PackagePlus/>Crear producto</Link></Button></header>
    <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-brand-dark/10 bg-brand-card p-5"><PackagePlus className="h-5 w-5 text-brand-accent"/><h2 className="mt-3 font-semibold text-brand-dark">1. Configura el colchón</h2><p className="mt-1 text-sm text-brand-taupe">Elige una sola vez tipo, pillow, composición y garantía.</p></div><div className="rounded-2xl border border-brand-dark/10 bg-brand-card p-5"><Layers3 className="h-5 w-5 text-brand-accent"/><h2 className="mt-3 font-semibold text-brand-dark">2. Agrega medidas</h2><p className="mt-1 text-sm text-brand-taupe">Selecciona Individual, Matrimonial, Queen o King y coloca cada precio.</p></div><div className="rounded-2xl border border-brand-dark/10 bg-brand-card p-5"><Eye className="h-5 w-5 text-brand-accent"/><h2 className="mt-3 font-semibold text-brand-dark">3. Revisa</h2><p className="mt-1 text-sm text-brand-taupe">La configuración permanece fija y el precio cambia al elegir la medida.</p></div></section>
    <section className="space-y-4"><div><h2 className="font-display text-2xl font-semibold text-brand-dark">Ejemplo: Colchón Imperial 1 Pillow</h2><p className="text-sm text-brand-taupe">Configuración general: Ortopédico · 1 Pillow · Resortes · 8 años.</p></div><div className="overflow-x-auto rounded-2xl border border-brand-dark/10 bg-brand-card"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-secondary/60"><tr><th className="p-4">Medida</th><th className="p-4">Precio</th><th className="p-4">SKU</th><th className="p-4">Principal</th></tr></thead><tbody className="divide-y divide-brand-dark/10"><tr><td className="p-4 font-semibold">Individual</td><td className="p-4">$180</td><td className="p-4">IMP-IND-1P</td><td className="p-4">Sí</td></tr><tr><td className="p-4 font-semibold">Matrimonial</td><td className="p-4">$260</td><td className="p-4">IMP-MAT-1P</td><td className="p-4">No</td></tr><tr><td className="p-4 font-semibold">Queen</td><td className="p-4">$330</td><td className="p-4">IMP-QUE-1P</td><td className="p-4">No</td></tr></tbody></table></div></section>
    <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]"><div><h2 className="font-display text-2xl font-semibold text-brand-dark">Para qué sirve cada campo</h2><dl className="mt-4 divide-y divide-brand-dark/10 rounded-2xl border border-brand-dark/10 bg-brand-card px-5">{fields.map(([name, description]) => <div key={name} className="py-4"><dt className="font-semibold text-brand-dark">{name}</dt><dd className="mt-1 text-sm text-brand-taupe">{description}</dd></div>)}</dl></div><aside className="space-y-5"><div className="rounded-2xl bg-brand-dark p-6 text-brand-bg"><h2 className="font-display text-xl font-semibold">Regla principal</h2><p className="mt-2 text-sm leading-relaxed text-brand-bg/70">Si cambia el pillow, tipo, composición o garantía, crea otro producto. En el mismo producto solo cambian medida, precio y SKU.</p></div><div className="rounded-2xl border border-brand-accent/25 bg-brand-accent/5 p-6"><h2 className="font-semibold text-brand-dark">Antes de guardar</h2><ul className="mt-3 space-y-3 text-sm text-brand-taupe">{["Configuración general completa.", "Cada medida tiene precio.", "Solo una medida es principal.", "Los SKU no se repiten.", "La portada es la primera foto."].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent"/>{item}</li>)}</ul></div></aside></section>
  </div>;
}
