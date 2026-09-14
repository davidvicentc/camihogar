"use client";
/* eslint-disable @next/next/no-img-element -- previsualiza URLs recién subidas a R2 */

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const MAX_IMAGES = 8;
const MAX_SOURCE_SIZE = 15 * 1024 * 1024;

async function optimizeImage(file: File): Promise<File> {
  if (file.size > MAX_SOURCE_SIZE) throw new Error(`${file.name}: la foto supera 15 MB.`);
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no pudo procesar la fotografía.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("No se pudo optimizar la fotografía.");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

function uploadWithProgress(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", "image/webp");
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Cloudflare rechazó la subida. Revisa el CORS del bucket."));
    request.onerror = () => reject(new Error("No se pudo conectar con el almacenamiento."));
    request.send(file);
  });
}

export function ProductImageUploader({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const originalImages = useRef(new Set(images));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setError("");
    const next = [...images];
    try {
      for (const source of Array.from(files).slice(0, MAX_IMAGES - images.length)) {
        setProgress(5);
        const optimized = await optimizeImage(source);
        setProgress(15);
        const response = await fetch("/api/admin/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType: optimized.type, size: optimized.size }) });
        const data = await response.json() as { uploadUrl?: string; publicUrl?: string; error?: string };
        if (!response.ok || !data.uploadUrl || !data.publicUrl) throw new Error(data.error ?? "No se pudo preparar la subida.");
        await uploadWithProgress(data.uploadUrl, optimized, (value) => setProgress(15 + Math.round(value * 0.85)));
        next.push(data.publicUrl);
        onChange([...next]);
      }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudo subir la imagen."); }
    finally { setUploading(false); setProgress(0); if (input.current) input.current.value = ""; }
  }

  async function remove(index: number) {
    const url = images[index];
    onChange(images.filter((_, itemIndex) => itemIndex !== index));
    if (!url.includes("/productos/") || originalImages.current.has(url)) return;
    const response = await fetch("/api/admin/images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    if (!response.ok) setError("La foto salió del producto, pero no se pudo borrar del almacenamiento.");
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images]; [next[index], next[target]] = [next[target], next[index]]; onChange(next);
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-brand-dark">Fotos del producto</p><p className="text-xs text-brand-taupe">Hasta {MAX_IMAGES}. La primera será la portada. Se convierten a WebP y máximo 2000 px.</p></div><Button type="button" variant="outline" disabled={uploading || images.length >= MAX_IMAGES} onClick={() => input.current?.click()}><ImagePlus aria-hidden="true"/>{images.length ? "Agregar fotos" : "Subir fotos"}</Button></div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => void uploadFiles(event.target.files)} />
    {uploading && <div className="space-y-2 rounded-xl bg-secondary/60 p-3"><div className="flex items-center justify-between text-xs text-brand-taupe"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Optimizando y subiendo</span><span>{progress}%</span></div><Progress value={progress}/></div>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!images.length && !uploading && <button type="button" onClick={() => input.current?.click()} className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-dark/20 bg-secondary/30 text-sm text-brand-taupe hover:border-brand-accent hover:text-brand-dark"><UploadCloud className="h-7 w-7"/><span>Selecciona fotografías desde tu equipo o teléfono</span></button>}
    {images.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((url, index) => <li key={`${url}-${index}`} className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-card"><div className="relative aspect-square bg-brand-sand"><img src={url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover"/>{index === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-brand-dark/80 px-2 py-1 text-[11px] font-semibold text-white"><Star className="h-3 w-3 fill-current"/>Portada</span>}</div><div className="flex items-center justify-center gap-1 p-2"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover a la izquierda" className="rounded-lg p-2 text-brand-taupe hover:bg-secondary disabled:opacity-25"><ArrowLeft className="h-4 w-4"/></button><button type="button" onClick={() => void remove(index)} aria-label="Eliminar foto" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4"/></button><button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label="Mover a la derecha" className="rounded-lg p-2 text-brand-taupe hover:bg-secondary disabled:opacity-25"><ArrowRight className="h-4 w-4"/></button></div></li>)}</ul>}
  </div>;
}
