import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { validPassword } from "@/lib/admin-validation";
import { hashAdminPassword } from "@/lib/admin-users";
import AdminUserModel from "@/lib/models/AdminUser";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || !validPassword(password)) return NextResponse.json({ error: "Enlace inválido o contraseña fuera del rango de 12 a 128 caracteres." }, { status: 400 });
    if (!(await allowAuthAttempt(request))) return NextResponse.json({ error: "Demasiados intentos. Espera 15 minutos." }, { status: 429 });
    const credentials = await hashAdminPassword(password);
    // Consumir y actualizar en una sola operación evita reutilización concurrente.
    const user = await AdminUserModel.findOneAndUpdate({ invitationHash: createHash("sha256").update(token).digest("hex"), invitationExpiresAt: { $gt: new Date() }, active: true, invitationPending: true }, {
      $set: { passwordHash: credentials.hash, passwordSalt: credentials.salt, invitationPending: false },
      $unset: { invitationHash: 1, invitationExpiresAt: 1 },
      $inc: { sessionVersion: 1 },
    });
    if (!user) return NextResponse.json({ error: "Este enlace venció o ya fue utilizado. Solicita uno nuevo al administrador." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No pudimos activar tu acceso. Inténtalo nuevamente." }, { status: 500 });
  }
}
