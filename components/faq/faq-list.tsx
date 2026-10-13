import type { FaqDTO } from "@/lib/data/faq";
export function FaqList({ items }: { items: FaqDTO[] }) {
  if (!items.length) return <p className="rounded-2xl border border-dashed border-brand-dark/15 p-8 text-center text-brand-taupe">Pronto publicaremos respuestas a las preguntas más comunes.</p>;
  return <div className="space-y-3">{items.map((item) => <details key={item._id} className="group rounded-2xl border border-brand-dark/10 bg-brand-card px-5 py-4 shadow-warm-sm"><summary className="cursor-pointer list-none pr-8 font-semibold text-brand-dark marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{item.question}<span className="float-right text-xl font-normal text-brand-accent transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl whitespace-pre-line border-t border-brand-dark/10 pt-3 text-sm leading-7 text-brand-taupe">{item.answer}</p></details>)}</div>;
}
