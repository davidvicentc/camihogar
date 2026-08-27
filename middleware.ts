import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";
import { OPERARIO_COOKIE, verificarTokenOperario } from "@/lib/fabricacion/auth";

/**
 * Portero de las dos zonas privadas del sitio.
 *
 * ⚠️ ESTE ARCHIVO CORRE EN EL EDGE RUNTIME. Sólo puede importar funciones que
 * usen Web Crypto (`crypto.subtle`), nunca `node:crypto`, `next/headers` ni
 * Mongoose. En concreto: JAMÁS importes aquí `lib/fabricacion/pin.ts`,
 * `lib/fabricacion/permisos.ts`, `lib/fabricacion/constantes.ts` (usa React)
 * ni ningún modelo de `lib/models/`. De `lib/fabricacion/auth.ts` sólo son
 * seguras `OPERARIO_COOKIE` y `verificarTokenOperario`: el resto del archivo
 * vive tras un `process.env.NEXT_RUNTIME !== "edge"` que se elimina en
 * compilación.
 *
 * Qué protege:
 *  · `/admin/*`  → cookie de admin (salvo `/admin/login`).
 *  · `/fabrica/*` → cookie de operario **o** cookie de admin, para que el dueño
 *    entre al taller sin crearse un usuario (salvo `/fabrica/login`).
 *
 * Qué NO protege a propósito: `/f/*` (destino del QR: comprueba la sesión en la
 * propia página y manda a entrar si hace falta) y `/seguimiento/*` (la vista
 * pública del cliente, apagada por defecto). Ninguna de las dos entra en el
 * `matcher`.
 *
 * Aquí sólo se comprueba que la sesión sea VÁLIDA. Las capacidades se miran en
 * las páginas y en las actions, que sí corren en Node y pueden leer el rol.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const valid = await verifySessionToken(token);
    if (!valid) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (esRutaDeTaller(pathname) && !pathname.startsWith("/fabrica/login")) {
    const operario = await verificarTokenOperario(
      request.cookies.get(OPERARIO_COOKIE)?.value
    );

    // Sin sesión de taller vale la del panel: el dueño no necesita un PIN.
    const admin = operario
      ? true
      : await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);

    if (!operario && !admin) {
      const loginUrl = new URL("/fabrica/login", request.url);
      // La pantalla de entrada sólo acepta rutas de /fabrica y /f, y valida
      // este valor antes de usarlo.
      loginUrl.searchParams.set("volver", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/** `/fabrica` y todo lo que cuelga de él (nunca `/fabricantes` o similar). */
function esRutaDeTaller(pathname: string): boolean {
  return pathname === "/fabrica" || pathname.startsWith("/fabrica/");
}

export const config = {
  matcher: ["/admin/:path*", "/fabrica/:path*"],
};
