import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import mongoose from "mongoose";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const databaseName = `camihogar_auth_test_${randomBytes(6).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = `/${databaseName}`;
const origin = "http://localhost:3003";
const password = "Test-access-password-2026";
const masterPassword = randomBytes(24).toString("hex");
const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
const actionId = (name) => Object.entries(manifest.node).find(([, value]) => value.exportedName === name)?.[0];
let server;
let connection;
async function json(path, body) {
  const response = await fetch(origin + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body), redirect: "manual" });
  return { response, body: await response.json() };
}
async function action(name, args, cookie, path = "/admin/usuarios") {
  const response = await fetch(origin + path, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", "Next-Action": actionId(name), Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(args), redirect: "manual" });
  return { response, text: await response.text() };
}
try {
  connection = await mongoose.createConnection(uri.toString()).asPromise();
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "3003"], { env: { ...process.env, MONGODB_URI: uri.toString(), AUTH_SECRET: randomBytes(32).toString("hex"), ADMIN_PASSWORD: masterPassword }, stdio: "ignore" });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error("El servidor de prueba no inició.");
    try { if ((await fetch(origin + "/admin/login")).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Servidor listo");
  const anonymous = await action("inviteAdminUser", [{ name: "Intruso", email: "intruso@example.com", permissions: ["users.manage"] }]);
  assert.ok(!anonymous.text.includes('"ok":true'), "Anónimo no puede invitar");
  assert.equal(await connection.db.collection("adminusers").countDocuments(), 0);
  const ownerLogin = await json("/api/admin/login", { password: masterPassword });
  assert.equal(ownerLogin.response.status, 200);
  const ownerCookie = ownerLogin.response.headers.get("set-cookie").split(";")[0];
  const input = { name: "Usuario de prueba", email: "equipo@example.com", permissions: ["products.read"] };
  const invitation = await action("inviteAdminUser", [input], ownerCookie);
  const token = invitation.text.match(/\/admin\/activar#([a-f0-9]{64})/)?.[1];
  assert.ok(token, "Invitación creada por acción real");
  assert.equal((await json("/api/admin/login", { email: input.email, password })).response.status, 401);
  assert.equal((await json("/api/admin/activar", { token, password })).response.status, 200);
  assert.equal((await json("/api/admin/activar", { token, password })).response.status, 400, "Enlace no reutilizable");
  assert.equal((await json("/api/admin/login", { email: input.email, password: masterPassword })).response.status, 401, "Sin fallback a propietario");
  const login = await json("/api/admin/login", { email: input.email, password });
  assert.equal(login.response.status, 200);
  const userCookie = login.response.headers.get("set-cookie").split(";")[0];
  const inventory = await fetch(origin + "/admin/productos", { headers: { Cookie: userCookie } });
  assert.equal(inventory.status, 200);
  assert.ok((await inventory.text()).includes("Inventario"));
  const usersPage = await fetch(origin + "/admin/usuarios", { headers: { Cookie: userCookie }, redirect: "manual" });
  assert.equal(usersPage.status, 307, "Lectura no puede acceder a usuarios");
  const denied = await action("inviteAdminUser", [{ ...input, email: "otro@example.com" }], userCookie);
  assert.ok(denied.text.includes('"ok":false'), "Permisos comprobados en acción");
  assert.equal(await connection.db.collection("adminusers").countDocuments(), 1);
  const allPermissions = ["products.read", "products.write", "products.delete", "brands.manage", "categories.manage", "settings.manage", "users.manage"];
  const fullInvite = await action("inviteAdminUser", [{ name: "Administrador de prueba", email: "admin@example.com", permissions: allPermissions }], ownerCookie);
  const fullToken = fullInvite.text.match(/\/admin\/activar#([a-f0-9]{64})/)?.[1];
  assert.ok(fullToken);
  assert.equal((await json("/api/admin/activar", { token: fullToken, password })).response.status, 200);
  const fullLogin = await json("/api/admin/login", { email: "admin@example.com", password });
  assert.equal(fullLogin.response.status, 200);
  const fullCookie = fullLogin.response.headers.get("set-cookie").split(";")[0];
  const category = await action("createCategory", ["Colchones de prueba"], fullCookie, "/admin/categorias");
  assert.ok(category.text.includes('"ok":true'), "Cuenta completa crea categorías");
  const brand = await action("createBrand", ["Marca de prueba"], fullCookie, "/admin/marcas");
  assert.ok(brand.text.includes('"ok":true'), "Cuenta completa crea marcas");
  const categoryId = String((await connection.db.collection("categories").findOne({ name: "Colchones de prueba" }))._id);
  const brandId = String((await connection.db.collection("brands").findOne({ name: "Marca de prueba" }))._id);
  const product = { title: "Colchón de prueba", collection: "Ortopédico", brand: "", category: "", categoryId, brandId, description: "Prueba automatizada", variantName: "", sku: "", basePrice: 100, variants: [{ name: "Individual", price: 100, isDefault: true }], images: [], dimensions: { width: 0, height: 0, depth: 0, unit: "cm" }, customizationOptions: { fabrics: [], finishes: [], configurations: [] }, inStock: true };
  const created = await action("createProduct", [product], fullCookie, "/admin/productos/nuevo");
  assert.ok(created.text.includes('"ok":true'), "Cuenta completa publica productos");
  const forbidden = await action("createProduct", [{ ...product, title: "No autorizado" }], userCookie, "/admin/productos/nuevo");
  assert.ok(forbidden.text.includes('"ok":false'), "Solo lectura no publica");
  assert.equal(await connection.db.collection("products").countDocuments(), 1);
  const user = await connection.db.collection("adminusers").findOne({ email: input.email });
  const reset = await action("inviteAdminUser", [input, String(user._id)], ownerCookie);
  assert.ok(reset.text.includes("/admin/activar#"));
  const revoked = await fetch(origin + "/admin/productos", { headers: { Cookie: userCookie }, redirect: "manual" });
  assert.equal(revoked.status, 307, "Sesión revocada al renovar invitación");
  const resetToken = reset.text.match(/\/admin\/activar#([a-f0-9]{64})/)?.[1];
  await connection.db.collection("adminusers").updateOne({ _id: user._id }, { $set: { invitationExpiresAt: new Date(0) } });
  assert.equal((await json("/api/admin/activar", { token: resetToken, password })).response.status, 400, "Enlace vencido rechazado");
  console.log("Flujo verificado: autorización, invitación, activación única, login, catálogo, permisos, revocación y caducidad.");
} finally {
  if (server && server.exitCode === null) { server.kill("SIGTERM"); await once(server, "exit"); }
  if (connection) {
    assert.equal(connection.name, databaseName);
    await connection.dropDatabase();
    await connection.close();
  }
}
