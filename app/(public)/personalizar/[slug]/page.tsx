import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Explora el catálogo de productos de CamiHogar.",
};

export default async function PersonalizarProductoPage({ params }: PageProps) {
  void params;
  redirect("/catalogo");
}
