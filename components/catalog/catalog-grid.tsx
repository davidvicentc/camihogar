"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/catalog/product-card";
import type { ProductDTO } from "@/lib/types";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export function CatalogGrid({ products, cardStyles }: { products: ProductDTO[]; cardStyles?: Parameters<typeof ProductCard>[0]["cardStyles"] }) {
  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-brand-dark/15 bg-brand-card/60 px-6 py-20 text-center"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
          <PackageOpen className="h-8 w-8" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold text-brand-dark">
            No encontramos muebles con esos filtros
          </h2>
          <p className="mx-auto max-w-sm text-sm text-brand-taupe">
            Prueba ajustando el precio o explorando otra categoría: seguro hay
            un mueble esperando abrazar tu hogar.
          </p>
        </div>
        <Button asChild variant="accent" className="mt-2">
          <Link href="/catalogo">Limpiar filtros</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
    >
      {products.map((product, index) => (
        <motion.div key={product._id} variants={itemVariants}>
          <ProductCard
            product={product}
            priority={index < 4}
            className="h-full"
            cardStyles={cardStyles}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
