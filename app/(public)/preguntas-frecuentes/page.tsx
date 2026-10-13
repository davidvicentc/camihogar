import { FaqList } from "@/components/faq/faq-list";
import { getPublicFaq } from "@/lib/data/faq";
import { getSiteSettings } from "@/lib/data/settings";
export const dynamic = "force-dynamic";
export default async function FaqPage() { const [items, settings] = await Promise.all([getPublicFaq(), getSiteSettings()]); return <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 md:pt-16"><header className="mb-8 space-y-2"><p className="text-sm font-semibold text-brand-accent">Estamos para ayudarte</p><h1 className="font-display text-4xl font-semibold tracking-tighter text-brand-dark">Preguntas frecuentes</h1><p className="text-brand-taupe">{settings.faqIntro}</p></header><FaqList items={items} /></section>; }
