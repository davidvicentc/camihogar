"use client";

import { motion, type Variants } from "framer-motion";
import { Flame } from "lucide-react";
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

export function Bestsellers({ products, cardStyles }: { products: ProductDTO[]; cardStyles?: Parameters<typeof ProductCard>[0]["cardStyles"] }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="bestsellers-title" className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <SectionHeading
        titleId="bestsellers-title"
        eyebrow="Los favoritos"
        icon={Flame}
        title="Los más pedidos"
        subtitle="Las piezas que más hogares venezolanos están eligiendo"
        action={{ label: "Ver todo", href: "/catalogo" }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5"
      >
        {products.map((product, index) => (
          <motion.div key={product._id} variants={item}>
            <ProductCard product={product} priority={index < 2} className="h-full" cardStyles={cardStyles} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
