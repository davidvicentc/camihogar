import { requireAdminPage } from "@/lib/admin-session";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import AdminUserModel from "@/lib/models/AdminUser";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  await requireAdminPage("users.manage");
  await connectDB();
  const users = await AdminUserModel.find({}, { name: 1, email: 1, permissions: 1, active: 1, invitationPending: 1 }).sort({ name: 1 }).lean();
  return <div className="max-w-4xl space-y-6"><header><h1 className="font-display text-3xl font-semibold text-brand-dark">Usuarios y accesos</h1><p className="mt-1 text-sm text-brand-taupe">Crea cuentas individuales y controla qué puede hacer cada persona.</p></header><AdminUsersManager initialUsers={users.map((user) => ({ _id: String(user._id), name: user.name, email: user.email, permissions: user.permissions, active: user.active, invitationPending: user.invitationPending }))} /></div>;
}
