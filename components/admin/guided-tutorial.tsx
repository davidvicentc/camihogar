"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const lessons = [
  { title: "Así funciona el catálogo", href: "/admin", permission: "", text: "Primero creas categorías y marcas. Después creas productos y los relacionas con ambas. Cada producto tiene variantes con precios; la variante principal define el precio inicial que ve el cliente.", task: "Ejemplo: categoría Colchones → marca CamiHogar → producto Ortopédico → variantes Individual y Matrimonial." },
  { title: "1. Crea una categoría", href: "/admin/categorias", permission: "categories.manage", text: "Las categorías agrupan productos por tipo: Salas, Comedores o Colchones. En Categorías, escribe un nombre claro; puedes añadir descripción e imagen y guardar. Reutiliza las categorías existentes para evitar duplicados.", task: "Comprueba que tu categoría aparece en la lista. Una categoría utilizada por productos no se puede eliminar hasta reasignarlos." },
  { title: "2. Registra una marca", href: "/admin/marcas", permission: "brands.manage", text: "La marca identifica al fabricante. Escribe su nombre y guarda. Una misma marca puede tener productos de distintas categorías.", task: "Comprueba que la marca aparece en la lista. Si está vinculada a un producto, primero cambia la marca del producto antes de eliminarla." },
  { title: "3. Completa el producto", href: "/admin/productos/nuevo", permission: "products.write", text: "Completa nombre, marca, categoría y modelo. Añade una imagen mediante su enlace público y describe materiales y características. El botón + junto a marca o categoría permite crear una opción sin salir del formulario.", task: "Si el producto tiene medidas, activa la opción y completa ancho, alto, profundidad y unidad. Usa información real: guardar publica el producto en el catálogo." },
  { title: "4. Añade variantes y publica", href: "/admin/productos/nuevo", permission: "products.write", text: "Las variantes son presentaciones del mismo producto, por ejemplo Individual y Matrimonial. Cada una necesita nombre y precio mayor que cero; el SKU es opcional. Marca una variante como principal y revisa los datos antes de guardar.", task: "Guarda el producto y verifica que aparece en Inventario. Si cambias de pantalla antes de guardar, puedes perder lo escrito." },
  { title: "5. Revisa la tienda", href: "/admin/productos", permission: "products.read", text: "En Inventario puedes encontrar productos y, según tus permisos, editarlos o eliminarlos. Abre Ver tienda para comprobar imagen, descripción, variantes y precio tal como los verá el cliente.", task: "La consulta del cliente se envía por WhatsApp. Revisa el número de destino en Configuración antes de compartir el catálogo." },
  { title: "6. Incorpora al equipo", href: "/admin/usuarios", permission: "users.manage", text: "Escribe nombre y correo, elige Administración completa o un perfil de permisos y genera la invitación. Copia el enlace y envíalo a esa persona: podrá establecer su contraseña y entrar con su correo.", task: "El enlace vence en 48 horas y solo sirve una vez. Nuevo enlace de acceso permite recuperar una cuenta y cierra sus sesiones anteriores. Desactivar impide el acceso. Administración completa incluye todos los permisos de la tienda; el taller conserva sus roles propios." },
];

export function GuidedTutorial({ userId, permissions }: { userId: string; permissions: string[] }) {
  const pathname = usePathname();
  const available = lessons.filter(lesson => !lesson.permission || permissions.includes(lesson.permission));
  const storageKey = `camihogar:tutorial:v1:${userId}`;
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved) { setStep(Math.max(0, Math.min(Number(saved.step) || 0, available.length - 1))); setCompleted(!!saved.completed); setOpen(!!saved.open); }
      else setOpen(true);
    } catch { setOpen(true); }
    setReady(true);
  }, [storageKey, available.length]);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(storageKey, JSON.stringify({ step, open, completed })); } catch { /* El tutorial también funciona sin almacenamiento. */ } }
  }, [step, open, completed, ready, storageKey]);
  const lesson = available[step] ?? available[0];
  if (!ready) return null;
  return <section className="mb-6 rounded-2xl border border-brand-accent/25 bg-brand-card shadow-warm-sm" aria-label="Tutorial del panel">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-brand-accent" /><span className="font-semibold text-brand-dark">{completed ? "Guía de administración" : "Aprende a administrar tu tienda"}</span></div><Button variant="ghost" size="sm" onClick={() => { if (completed) { setStep(0); setCompleted(false); } setOpen(!open); }}>{open ? <><X className="h-4 w-4" />Pausar tutorial</> : "Abrir tutorial"}</Button></div>
    {open && <div className="space-y-4 border-t border-brand-dark/10 p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold" tabIndex={-1}>{lesson.title}</h2><span className="shrink-0 text-xs text-brand-taupe">{step + 1} de {available.length}</span></div><progress aria-label="Progreso del tutorial" max={available.length} value={step + 1} className="h-2 w-full accent-brand-accent" /><div aria-live="polite" className="space-y-3"><p className="max-w-3xl text-sm leading-relaxed text-brand-dark">{lesson.text}</p><p className="max-w-3xl rounded-xl bg-brand-bg p-3 text-sm leading-relaxed text-brand-taupe">{lesson.task}</p></div><div className="flex flex-wrap items-center gap-2">{pathname !== lesson.href && <Button asChild variant="accent"><Link href={lesson.href}>Ir a esta pantalla</Link></Button>}<Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ChevronLeft />Anterior</Button><Button variant="outline" onClick={() => { if (step === available.length - 1) { setCompleted(true); setOpen(false); } else setStep(s => s + 1); }}>{step === available.length - 1 ? "Finalizar tutorial" : "Entendido, siguiente"}<ChevronRight /></Button></div><p className="text-xs text-brand-taupe">Puedes pausar y volver cuando quieras. El progreso se guarda en este navegador. Avanzar en la guía no guarda formularios.</p></div>}
  </section>;
}
