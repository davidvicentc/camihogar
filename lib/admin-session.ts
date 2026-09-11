import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, getAdminSessionUserId, verifySessionToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AdminUserModel from "@/lib/models/AdminUser";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/types";

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !(await verifySessionToken(token))) return null;
  const id = await getAdminSessionUserId(token);
  if (!id) return { id: null, master: true, name: "Propietario", permissions: [...ADMIN_PERMISSIONS] as string[] };
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  await connectDB();
  const user = await AdminUserModel.findById(id).lean();
  const version = Number(token.split(".")[0].split(":")[1] ?? 0);
  if (!user?.active || user.invitationPending || version !== (user.sessionVersion ?? 0)) return null;
  return { id, master: false, name: user.name, permissions: user.permissions };
}

export async function requireAdminPermission(permission?: AdminPermission) {
  const session = await getAdminSession();
  if (!session || (permission && !session.permissions.includes(permission))) throw new Error("No autorizado");
  return session;
}

export async function requireAdminPage(permission?: AdminPermission) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (permission && !session.permissions.includes(permission)) redirect("/admin?acceso=denegado");
  return session;
}
