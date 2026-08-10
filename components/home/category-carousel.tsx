"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/home/section-heading";
import { CATEGORY_META } from "@/lib/constants";

export function CategoryCarousel() {
  return (
    <section aria-labelledby="category-carousel-title" className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <SectionHeading
        titleId="category-carousel-title"
        eyebrow="Espacios"
        title="Explora por espacios"
        subtitle="Cada rincón de tu casa merece un mueble que lo abrace"
        action={{ label: "Ver catálogo", href: "/catalogo" }}
      />

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide md:gap-5">
        {CATEGORY_META.map((category) => (
          <Link
            key={category.slug}
            href={`/catalogo?categoria=${category.slug}`}
            aria-label={`Ver catálogo de ${category.label}`}
            className="shrink-0 snap-start rounded-[1.75rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <motion.article
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="group relative h-60 w-44 overflow-hidden rounded-[1.75rem] bg-brand-dark shadow-warm-sm ring-1 ring-brand-dark/5 transition-shadow hover:shadow-warm sm:h-72 sm:w-52"
            >
              <Image
                src={category.image}
                alt={category.label}
                fill
                sizes="(max-width: 640px) 176px, 208px"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.08]"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/30 to-transparent"
                aria-hidden="true"
              />
              {/* Velo naranja del logo al pasar el cursor */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-brand-accent/35 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden="true"
              />

              <span
                className="absolute right-3 top-3 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full border border-white/25 text-white opacity-0 transition-all duration-300 glass-dark group-hover:translate-y-0 group-hover:opacity-100"
                aria-hidden="true"
              >
                <ArrowUpRight className="h-4 w-4" />
              </span>

              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="font-display text-lg font-semibold tracking-tight text-white">
                  {category.label}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed tracking-tight text-white/70">
                  {category.description}
                </p>
                {/* Regla naranja del logo, se despliega al hover */}
                <span
                  className="mt-2.5 block h-px w-8 bg-brand-accent transition-all duration-500 group-hover:w-16"
                  aria-hidden="true"
                />
              </div>
            </motion.article>
          </Link>
        ))}
      </div>
    </section>
  );
}
