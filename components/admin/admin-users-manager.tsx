"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/types";
import { createAdminUser, deleteAdminUser, updateAdminUser } from "@/lib/actions/admin";

type UserRow = { _id: string; name: string; email: string; permissions: string[]; active: boolean };
const labels: Record<AdminPermission, string> = { "products.read": "Ver productos", "products.write": "Crear y editar productos", "products.delete": "Eliminar productos", "brands.manage": "Gestionar marcas", "categories.manage": "Gestionar categorías", "settings.manage": "Gestionar configuración", "users.manage": "Gestionar usuarios" };

export function AdminUsersManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]); const [active, setActive] = useState(true); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  function reset() { setEditing(null); setName(""); setEmail(""); setPassword(""); setPermissions([]); setActive(true); }
  function beginEdit(user: UserRow) { setEditing(user); setName(user.name); setEmail(user.email); setPassword(""); setPermissions(user.permissions); setActive(user.active); }
  function submit(event: React.FormEvent) { event.preventDefault(); setError(null); startTransition(async () => { const result = editing ? await updateAdminUser(editing._id, { name, email, password: password || undefined, permissions, active }) : await createAdminUser({ name, email, password, permissions }); if (!result.ok) { setError(result.error ?? "No se pudo guardar."); return; } reset(); window.location.reload(); }); }
  function remove(user: UserRow) { setDeleteTarget(user); }
  function executeDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteAdminUser(deleteTarget._id);
      if (!result.ok) {
        setError(result.error ?? "No se pudo eliminar.");
        setDeleteTarget(null);
        return;
      }
      setUsers((current) => current.filter((user) => user._id !== deleteTarget._id));
      setDeleteTarget(null);
    });
  }
  return <div className="space-y-6">
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm sm:p-7">
      <div><h2 className="font-display text-xl font-semibold text-brand-dark">{editing ? "Editar usuario" : "Nuevo usuario"}</h2><p className="text-sm text-brand-taupe">Asigna únicamente los accesos que necesita.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="user-name">Nombre</Label><Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></div><div className="space-y-2"><Label htmlFor="user-email">Correo</Label><Input id="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="user-password">{editing ? "Nueva contraseña (opcional)" : "Contraseña"}</Label><Input id="user-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required={!editing} minLength={8} autoComplete={editing ? "new-password" : "new-password"} /></div></div>
      <fieldset><legend className="mb-3 text-sm font-semibold text-brand-dark">Permisos</legend><div className="grid gap-2 sm:grid-cols-2">{ADMIN_PERMISSIONS.map((permission) => <label key={permission} className="flex items-center gap-2 rounded-xl border border-brand-dark/10 px-3 py-2 text-sm"><input type="checkbox" checked={permissions.includes(permission)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))} />{labels[permission]}</label>)}</div></fieldset>
      {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Usuario activo</label>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2"><Button type="submit" variant="accent" disabled={pending}>{editing ? <Check /> : <Plus />}{pending ? "Guardando..." : editing ? "Guardar cambios" : "Crear usuario"}</Button>{editing && <Button type="button" variant="ghost" onClick={reset}><X />Cancelar</Button>}</div>
    </form>
    <div className="divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-card">{users.map((user) => <div key={user._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"><div><p className="font-semibold text-brand-dark">{user.name} {!user.active && <span className="text-xs text-red-600">(inactivo)</span>}</p><p className="text-sm text-brand-taupe">{user.email} · {user.permissions.length} permisos</p></div><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Editar ${user.name}`} onClick={() => beginEdit(user)}><Pencil /></Button><Button type="button" variant="ghost" size="icon" className="text-red-600" aria-label={`Eliminar ${user.name}`} onClick={() => remove(user)} disabled={pending}><Trash2 /></Button></div></div>)}</div>

    <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Seguro que quieres eliminar este usuario?</DialogTitle>
          <DialogDescription>
            Se eliminará “{deleteTarget?.name ?? ""}” y perderá el acceso inmediato al panel.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button type="button" variant="accent" onClick={executeDelete} disabled={pending}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
