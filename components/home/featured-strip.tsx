"use client";

import { motion, type Variants } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { SectionHeading } from "@/components/home/section-heading";
import type { ProductDTO } from "@/lib/types";

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export function FeaturedStrip({ products, cardStyles }: { products: ProductDTO[]; cardStyles?: Parameters<typeof ProductCard>[0]["cardStyles"] }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="featured-strip-title" className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <SectionHeading
        titleId="featured-strip-title"
        eyebrow="Selección"
        icon={Sparkles}
        title="Destacados de la casa"
        subtitle="Una selección especial con el sello de CamiHogar"
        action={{ label: "Ver todo", href: "/catalogo" }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide md:gap-5"
      >
        {products.map((product) => (
          <motion.div
            key={product._id}
            variants={item}
            className="w-[260px] min-w-[260px] shrink-0 snap-start"
          >
            <ProductCard product={product} className="h-full" cardStyles={cardStyles} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
