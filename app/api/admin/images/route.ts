import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-session";
import { createProductImageUpload, deleteProductImage, productImageKeyFromUrl } from "@/lib/r2";

export const runtime = "nodejs";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try { await requireAdminPermission("products.write"); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }
  try {
    const body = await request.json() as { contentType?: string; size?: number };
    if (!body.contentType || !ALLOWED_TYPES.has(body.contentType)) return NextResponse.json({ error: "Usa una imagen JPG, PNG o WebP." }, { status: 400 });
    if (!body.size || body.size > 6 * 1024 * 1024) return NextResponse.json({ error: "La imagen optimizada no puede superar 6 MB." }, { status: 400 });
    return NextResponse.json(await createProductImageUpload("image/webp"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo preparar la subida." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try { await requireAdminPermission("products.write"); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }
  try {
    const body = await request.json() as { url?: string };
    const key = body.url ? productImageKeyFromUrl(body.url) : null;
    if (!key) return NextResponse.json({ error: "La imagen no pertenece al almacenamiento de productos." }, { status: 400 });
    await deleteProductImage(key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar la imagen." }, { status: 500 });
  }
}
