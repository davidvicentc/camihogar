"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
  updateBrand,
  updateCategory,
} from "@/lib/actions/catalog";
import type { CatalogOptionDTO } from "@/lib/data/catalog";

type Kind = "marca" | "categoría";

export function CatalogOptionsManager({
  kind,
  initialItems,
}: {
  kind: Kind;
  initialItems: CatalogOptionDTO[];
}) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isBrand = kind === "marca";

  function reset() {
    setName("");
    setEditingId(null); setDescription(""); setImage("");
  }

  function save() {
    const cleanName = name.trim();
    if (!cleanName) return;
    const action = editingId ? "actualizar" : "crear";
    if (!window.confirm(`¿Seguro que quieres ${action} la ${kind} “${cleanName}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? isBrand
          ? await updateBrand(editingId, cleanName)
          : await updateCategory(editingId, cleanName, description, image)
        : isBrand
          ? await createBrand(cleanName)
          : await createCategory(cleanName, description, image);

      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar.");
        return;
      }

      if (editingId) {
        setItems((current) =>
          current.map((item) =>
            item._id === editingId ? { ...item, name: cleanName, description, image } : item
          )
        );
      } else {
        // The server revalidates the page; this optimistic row keeps the UI immediate.
        setItems((current) => [
          ...current,
          {
            _id: `pending-${Date.now()}`,
            name: cleanName,
            slug: cleanName.toLowerCase().replace(/\s+/g, "-"),
            isActive: true, description, image,
          },
        ]);
      }
      reset();
    });
  }

  function remove(id: string) {
    setError(null);
    const item = items.find((entry) => entry._id === id);
    if (!window.confirm(`¿Seguro que quieres eliminar la ${kind} “${item?.name ?? ""}”?`)) return;
    startTransition(async () => {
      const result = isBrand ? await deleteBrand(id) : await deleteCategory(id);
      if (!result.ok) {
        setError(result.error ?? "No se pudo eliminar.");
        return;
      }
      setItems((current) => current.filter((item) => item._id !== id));
    });
  }

  function beginEdit(item: CatalogOptionDTO) { setEditingId(item._id); setName(item.name); setDescription(item.description ?? ""); setImage(item.image ?? ""); }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          placeholder={`Nombre de ${kind}`}
          aria-label={`Nombre de ${kind}`}
          autoComplete="off"
        />
        <div className="flex gap-2">
          <Button type="button" variant="accent" onClick={save} disabled={pending || !name.trim()}>
            {editingId ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {editingId ? "Guardar" : "Agregar"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label="Cancelar edición">
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {!isBrand && <div className="grid gap-2 sm:grid-cols-2"><Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripción de la categoría" /><Input value={image} onChange={(event) => setImage(event.target.value)} placeholder="URL de imagen" type="url" /></div>}

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-card">
        {items.length === 0 && <p className="p-6 text-sm text-brand-taupe">Todavía no hay {kind} registradas.</p>}
        {items.map((item) => (
          <div key={item._id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="font-medium text-brand-dark">{item.name}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${item.name}`} onClick={() => beginEdit(item)}>
                <Pencil aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="text-red-600" aria-label={`Eliminar ${item.name}`} onClick={() => remove(item._id)} disabled={pending || item._id.startsWith("pending-")}>
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
