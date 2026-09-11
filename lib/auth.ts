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

export async function createUserSessionToken(userId: string, version = 0): Promise<string> {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${userId}:${version}.${expiresAt}`;
  return `${payload}.${await hmac(payload, getSecret())}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2 && parts.length !== 3) return false;
  if (parts.length === 3 && !/^[a-f\d]{24}(?::\d+)?$/i.test(parts[0])) return false;
  const expiresAt = parts.length === 2 ? parts[0] : parts[1];
  const signature = parts.length === 2 ? parts[1] : parts[2];
  if (!expiresAt || !signature) return false;
  if (!/^\d+$/.test(expiresAt) || !Number.isSafeInteger(Number(expiresAt)) || Number(expiresAt) <= Date.now()) return false;

  const payload = parts.length === 2 ? expiresAt : `${parts[0]}.${expiresAt}`;
  const expected = await hmac(payload, getSecret());
  if (expected.length !== signature.length) return false;

  // Comparación en tiempo constante.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function getAdminSessionUserId(token: string | undefined): Promise<string | null> {
  if (!token || token.split(".").length !== 3 || !(await verifySessionToken(token))) return null;
  return token.split(".")[0].split(":")[0] || null;
}

export function isValidAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && password === expected;
}
