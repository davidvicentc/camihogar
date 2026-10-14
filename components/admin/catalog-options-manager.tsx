"use client";
/* eslint-disable @next/next/no-img-element -- preview de imágenes recién subidas */

import { useState, useTransition } from "react";
import { Check, ImageOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductImageUploader } from "@/components/admin/product-image-uploader";
import { createBrand, createCategory, deleteBrand, deleteCategory, updateBrand, updateCategory } from "@/lib/actions/catalog";
import type { CatalogOptionDTO } from "@/lib/data/catalog";

type Kind = "marca" | "categoría";

export function CatalogOptionsManager({ kind, initialItems }: { kind: Kind; initialItems: CatalogOptionDTO[] }) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogOptionDTO | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isBrand = kind === "marca";

  function reset() { setName(""); setDescription(""); setImage(""); setEditingId(null); setError(""); }
  function createNew() { reset(); setEditorOpen(true); }
  function beginEdit(item: CatalogOptionDTO) { setEditingId(item._id); setName(item.name); setDescription(item.description ?? ""); setImage(item.image ?? ""); setError(""); setEditorOpen(true); }
  function save() {
    const cleanName = name.trim();
    if (!cleanName) { setError("Escribe el nombre."); return; }
    if (!isBrand && !image) { setError("Sube una imagen para que la categoría se vea en el home."); return; }
    setError("");
    startTransition(async () => {
      const result = editingId ? (isBrand ? await updateBrand(editingId, cleanName) : await updateCategory(editingId, cleanName, description, image)) : (isBrand ? await createBrand(cleanName) : await createCategory(cleanName, description, image));
      if (!result.ok) { setError(result.error ?? "No se pudo guardar."); return; }
      const next = { _id: result.data?._id ?? `pending-${Date.now()}`, name: cleanName, slug: cleanName.toLowerCase().replace(/\s+/g, "-"), isActive: true, description, image };
      setItems((current) => editingId ? current.map((item) => item._id === editingId ? { ...item, ...next, _id: item._id, slug: item.slug } : item) : [...current, next]);
      setEditorOpen(false); reset();
    });
  }
  function remove() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = isBrand ? await deleteBrand(deleteTarget._id) : await deleteCategory(deleteTarget._id);
      if (!result.ok) { setError(result.error ?? "No se pudo eliminar."); setDeleteTarget(null); return; }
      setItems((current) => current.filter((item) => item._id !== deleteTarget._id)); setDeleteTarget(null);
    });
  }

  const dialogs = <>
    <Dialog open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) reset(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingId ? `Editar ${kind}` : `Nueva ${kind}`}</DialogTitle><DialogDescription>{isBrand ? "Escribe el nombre que verán los clientes." : "Completa los datos y sube la fotografía que se verá en el home."}</DialogDescription></DialogHeader><div className="space-y-5 py-2"><div className="space-y-2"><Label htmlFor="option-name">Nombre</Label><Input id="option-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus/></div>{!isBrand && <><div className="space-y-2"><Label htmlFor="option-description">Descripción</Label><Input id="option-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe brevemente esta categoría"/></div><div className="rounded-2xl border border-brand-dark/10 p-4"><ProductImageUploader images={image ? [image] : []} onChange={(images) => setImage(images[0] ?? "")} maxImages={1} compactLabel="Fotografía de la categoría" compactHint="Se mostrará en la tarjeta del home. Elígela desde tu teléfono o computadora." deleteFromStorage={false}/></div></>}{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div><DialogFooter><Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>Cancelar</Button><Button type="button" variant="accent" onClick={save} disabled={pending}>{pending ? <Loader2 className="animate-spin"/> : <Check/>}{pending ? "Guardando..." : "Guardar"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><DialogContent><DialogHeader><DialogTitle>¿Eliminar {deleteTarget?.name}?</DialogTitle><DialogDescription>Esta acción no se puede deshacer. No se permitirá si está siendo usada por productos.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button type="button" variant="accent" onClick={remove} disabled={pending}>{pending ? <Loader2 className="animate-spin"/> : <Trash2/>}Eliminar</Button></DialogFooter></DialogContent></Dialog>
  </>;

  if (isBrand) return <div className="space-y-5"><div className="flex justify-end"><Button type="button" variant="accent" onClick={createNew}><Plus/>Agregar marca</Button></div><div className="divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-card">{items.map((item) => <div key={item._id} className="flex items-center justify-between gap-3 px-4 py-3"><span className="font-medium text-brand-dark">{item.name}</span><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Editar ${item.name}`} onClick={() => beginEdit(item)}><Pencil/></Button><Button type="button" variant="ghost" size="icon" className="text-red-600" aria-label={`Eliminar ${item.name}`} onClick={() => setDeleteTarget(item)}><Trash2/></Button></div></div>)}</div>{dialogs}</div>;

  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><p className="max-w-xl text-sm text-brand-taupe">Las fotos aparecen en el home. Toca una categoría para editarla en una ventana clara y completa.</p><Button type="button" variant="accent" onClick={createNew}><Plus/>Nueva categoría</Button></div>{error && !editorOpen && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item._id} className="group overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-card shadow-warm-sm"><button type="button" onClick={() => beginEdit(item)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-accent"><div className="relative aspect-[16/10] bg-brand-sand">{item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover"/> : <div className="flex h-full flex-col items-center justify-center gap-2 text-brand-taupe"><ImageOff className="h-8 w-8"/><span className="text-sm">Sin imagen</span></div>}<span className="absolute right-3 top-3 rounded-lg bg-brand-dark/85 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"><Pencil className="mr-1 inline h-3 w-3"/>Editar</span></div><div className="p-4"><h3 className="font-display text-lg font-semibold text-brand-dark">{item.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm text-brand-taupe">{item.description || "Sin descripción"}</p></div></button><div className="flex justify-end border-t border-brand-dark/5 px-2 py-1"><Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4"/>Eliminar</Button></div></article>)}</div>{!items.length && <div className="rounded-2xl border border-dashed border-brand-dark/15 p-10 text-center text-sm text-brand-taupe">Todavía no hay categorías.</div>}{dialogs}</div>;
}
