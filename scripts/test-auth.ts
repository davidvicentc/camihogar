import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createSessionToken, createUserSessionToken, getAdminSessionUserId, verifySessionToken } from "../lib/auth";
import { hashAdminPassword, verifyAdminPassword } from "../lib/admin-users";
import { safeAdminDestination, validEmail, validPassword } from "../lib/admin-validation";

process.env.AUTH_SECRET = "test-only-secret-never-used-in-production";
const sign = (payload: string) => `${payload}.${createHmac("sha256", process.env.AUTH_SECRET!).update(payload).digest("hex")}`;

test("sesiones válidas y versiones de usuario", async () => {
  assert.equal(await verifySessionToken(await createSessionToken()), true);
  const token = await createUserSessionToken("0123456789abcdef01234567", 3);
  assert.equal(await verifySessionToken(token), true);
  assert.equal(await getAdminSessionUserId(token), "0123456789abcdef01234567");
  assert.match(token, /:3\./);
});
test("rechaza sesiones ausentes, vencidas, alteradas y malformadas", async () => {
  for (const token of [undefined, "", "bad", sign("NaN"), sign("Infinity"), sign("0"), sign("a.b.c"), `${await createSessionToken()}.extra`]) {
    assert.equal(await verifySessionToken(token), false, token);
  }
  const token = await createSessionToken();
  assert.equal(await verifySessionToken(token.slice(0, -1) + (token.endsWith("0") ? "1" : "0")), false);
});
test("contraseñas almacenadas con sal y comparación segura", async () => {
  const first = await hashAdminPassword("Una contraseña larga");
  const second = await hashAdminPassword("Una contraseña larga");
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyAdminPassword("Una contraseña larga", first.salt, first.hash), true);
  assert.equal(await verifyAdminPassword("incorrecta", first.salt, first.hash), false);
});
test("valida datos y evita redirecciones externas después del login", () => {
  assert.equal(validEmail("equipo@example.com"), true);
  assert.equal(validEmail("correo-invalido"), false);
  assert.equal(validPassword("corta"), false);
  assert.equal(validPassword("x".repeat(129)), false);
  assert.equal(validPassword("x".repeat(12)), true);
  for (const target of ["https://example.com", "//example.com", "/admin\\evil", "javascript:alert(1)", "/administrador", null]) assert.equal(safeAdminDestination(target), "/admin");
  assert.equal(safeAdminDestination("/admin/productos"), "/admin/productos");
});
