import { requireAdminPage } from "@/lib/admin-session";
import { getMattressOptionGroups } from "@/lib/data/mattress-options";
import { MattressOptionsManager } from "@/components/admin/mattress-options-manager";

export const dynamic = "force-dynamic";

export default async function MattressOptionsPage() {
  await requireAdminPage("categories.manage");
  return <div className="space-y-6"><header className="max-w-3xl"><h1 className="font-display text-3xl font-semibold text-brand-dark">Opciones de colchones</h1><p className="mt-1 text-sm leading-relaxed text-brand-taupe">Administra las medidas, tipos de pillow, modelos y composiciones disponibles al crear colchones. Las opciones en uso no se pueden eliminar.</p></header><MattressOptionsManager groups={await getMattressOptionGroups()}/></div>;
}
