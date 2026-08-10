import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, createSessionToken, isValidAdminPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { password } = (await request.json()) as { password?: string };

    if (!password || !isValidAdminPassword(password)) {
      return NextResponse.json(
        { ok: false, error: "Clave incorrecta" },
        { status: 401 }
      );
    }

    const token = await createSessionToken();
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
