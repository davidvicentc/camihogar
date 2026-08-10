import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Customizer } from "@/components/customizer/customizer";
import { getProductBySlug } from "@/lib/data/products";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: "Personalizar" };
  }
  return {
    title: `Personalizar ${product.title}`,
    description: `Diseña tu ${product.title} a tu gusto: elige telas, acabados y medidas en tiempo real y pídelo por WhatsApp.`,
  };
}

export default async function PersonalizarProductoPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const { fabrics, finishes, configurations } = product.customizationOptions;
  const hasOptions =
    fabrics.length > 0 || finishes.length > 0 || configurations.length > 0;

  if (!hasOptions) {
    redirect(`/producto/${product.slug}`);
  }

  return <Customizer product={product} />;
}
