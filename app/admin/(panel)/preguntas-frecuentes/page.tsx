import { requireAdminPage } from "@/lib/admin-session";
import { getFaq } from "@/lib/data/faq";
import { FaqManager } from "@/components/admin/faq-manager";
import { getSiteSettings } from "@/lib/data/settings";
export const dynamic = "force-dynamic";
export default async function AdminFaqPage() { await requireAdminPage("settings.manage"); const [items, settings] = await Promise.all([getFaq(true), getSiteSettings()]); return <div className="max-w-3xl space-y-6"><header><h1 className="font-display text-3xl font-semibold text-brand-dark">Preguntas frecuentes</h1><p className="mt-1 text-sm text-brand-taupe">Edita las respuestas que verán tus clientes.</p></header><FaqManager initialItems={items} initialIntro={settings.faqIntro} /></div>; }
