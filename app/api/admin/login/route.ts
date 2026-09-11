import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, createSessionToken, createUserSessionToken, isValidAdminPassword } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AdminUserModel from "@/lib/models/AdminUser";
import { verifyAdminPassword } from "@/lib/admin-users";

import { allowAuthAttempt } from "@/lib/auth-rate-limit";

export async function POST(request: Request) {
  try {
    const { password, email } = (await request.json()) as { password?: string; email?: string };
    if (typeof password !== "string" || password.length > 128 || (email !== undefined && typeof email !== "string")) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (!(await allowAuthAttempt(request))) return NextResponse.json({ error: "Demasiados intentos. Espera 15 minutos." }, { status: 429 });
    let token: string | null = null;

    if (email && password) {
      await connectDB();
      const user = await AdminUserModel.findOne({ email: email.trim().toLowerCase(), active: true });
      if (user && !user.invitationPending && await verifyAdminPassword(password, user.passwordSalt, user.passwordHash)) {
        user.lastLoginAt = new Date(); await user.save(); token = await createUserSessionToken(String(user._id), user.sessionVersion ?? 0);
      }
    }

    if (!token && (!!email || !password || !isValidAdminPassword(password))) {
      return NextResponse.json(
        { ok: false, error: "Clave incorrecta" },
        { status: 401 }
      );
    }

    token ??= await createSessionToken();
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/login] POST:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
