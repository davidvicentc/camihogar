import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import AdminUserModel from "@/lib/models/AdminUser";
import { connectDB } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, getAdminSessionUserId } from "@/lib/auth";
import type { AdminPermission } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const userId = await getAdminSessionUserId(token);
  if (userId) {
    await connectDB();
    const currentUser = await AdminUserModel.findById(userId, { permissions: 1, active: 1 }).lean();
    const permission: AdminPermission = "users.manage";
    if (!currentUser?.active || !currentUser.permissions.includes(permission)) redirect("/admin");
  }
  await connectDB();
  const users = await AdminUserModel.find({}, { name: 1, email: 1, permissions: 1, active: 1 }).sort({ name: 1 }).lean();
  return <div className="max-w-4xl space-y-6"><header><h1 className="font-display text-3xl font-semibold text-brand-dark">Usuarios y accesos</h1><p className="mt-1 text-sm text-brand-taupe">Crea cuentas individuales y controla qué puede hacer cada persona.</p></header><AdminUsersManager initialUsers={users.map((user) => ({ _id: String(user._id), name: user.name, email: user.email, permissions: user.permissions, active: user.active }))} /></div>;
}
