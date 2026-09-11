import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-session";
import { signUploadParams } from "@/lib/cloudinary";

/**
 * Firma las cargas del Cloudinary Upload Widget (modo firmado).
 * Solo accesible con sesión de admin activa.
 */
export async function POST(request: Request) {
  try { await requireAdminPermission("products.write"); }
  catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

  try {
    const { paramsToSign } = (await request.json()) as {
      paramsToSign: Record<string, unknown>;
    };
    const signature = signUploadParams(paramsToSign);
    return NextResponse.json({ signature });
  } catch (error) {
    console.error("[api/cloudinary/sign] POST:", error);
    return NextResponse.json({ error: "Error al firmar" }, { status: 500 });
  }
}
