/**
 * Autenticación mínima del admin: cookie httpOnly firmada con HMAC-SHA256.
 * Usa Web Crypto para funcionar tanto en Node (route handlers) como en el
 * Edge Runtime (middleware).
 */

export const ADMIN_COOKIE = "camihogar_admin";
const SESSION_HOURS = 24 * 7;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Falta AUTH_SECRET en las variables de entorno.");
  }
  return secret;
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Crea el token de sesión: `<expiraEnMs>.<firma>`. */
export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const signature = await hmac(String(expiresAt), getSecret());
  return `${expiresAt}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;
  if (Number(expiresAt) < Date.now()) return false;

  const expected = await hmac(expiresAt, getSecret());
  if (expected.length !== signature.length) return false;

  // Comparación en tiempo constante.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isValidAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && password === expected;
}
