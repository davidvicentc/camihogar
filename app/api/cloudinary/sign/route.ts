import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signUploadParams } from "@/lib/cloudinary";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Firma las cargas del Cloudinary Upload Widget (modo firmado).
 * Solo accesible con sesión de admin activa.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
