"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.12 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
};

const STATS = [
  { value: "+500", label: "hogares amoblados" },
  { value: "2 años", label: "de garantía" },
  { value: "100%", label: "hecho en Venezuela" },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      {/* Móvil: la foto como fondo full-bleed con overlay oscuro para legibilidad */}
      <div className="absolute inset-0 lg:hidden" aria-hidden="true">
        <Image
          src="/hero/living-warm.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 1px, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/90 via-brand-dark/70 to-brand-dark/92" />
      </div>

      {/* Trama de la ventana del logo como textura del fondo */}
      <div
        className="pointer-events-none absolute inset-0 logo-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]"
        aria-hidden="true"
      />

      {/* Marca de agua: la casa del logo a gran escala con barrido de luz */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 hidden h-[34rem] -translate-y-1/2 opacity-[0.06] lg:block xl:-right-10"
      >
        <div className="relative h-full overflow-hidden">
          <LogoMark variant="white" className="h-full" />
          <span className="absolute inset-y-0 -left-1/3 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>
      </div>

      {/* Capa de luz cálida sobre el gradiente oscuro */}
      <div className="pointer-events-none absolute inset-0 bg-warm-radial" aria-hidden="true" />

      {/* Glows terracota con respiración lenta */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-16 h-64 w-64 rounded-full bg-brand-accent/25 blur-3xl md:-right-10 md:top-24 md:h-96 md:w-96"
        animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-flame/15 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid min-h-[78vh] w-full max-w-6xl items-center gap-12 px-4 py-20 md:min-h-[86vh] md:px-6 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        {/* Columna de texto con entrada escalonada */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start gap-6"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium tracking-tight text-brand-bg/90 backdrop-blur">
              <MapPin className="h-3.5 w-3.5 text-brand-accent" aria-hidden="true" />
              Hecho en Venezuela · Envíos a todo el país
            </span>
          </motion.div>

          {/* La casa del logo introduce el titular */}
          <motion.div variants={item} className="flex items-center gap-3">
            <LogoMark className="h-11 drop-shadow-[0_0_22px_rgba(232,81,26,0.45)] md:h-14" priority />
            <span className="h-10 w-px bg-white/15 md:h-12" aria-hidden="true" />
            <span className="font-display text-[0.7rem] font-medium uppercase leading-tight tracking-[0.28em] text-brand-bg/60">
              Camihogar
              <br />
              Mobiliario
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="max-w-2xl text-balance font-display text-[2.6rem] font-semibold leading-[1.03] tracking-tightest text-brand-bg sm:text-6xl md:text-7xl"
          >
            Muebles que{" "}
            <span className="text-gradient-ember">abrazan</span> tu hogar
          </motion.h1>

          <motion.p
            variants={item}
            className="max-w-xl text-pretty text-base leading-relaxed tracking-tight text-brand-bg/70 md:text-lg"
          >
            Explora nuestro catálogo de piezas cálidas para cada rincón de tu casa.
            Elige tu producto, revisa sus variantes y consúltanos directamente.
          </motion.p>

          <motion.div variants={item} className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button asChild variant="accent" size="lg">
              <Link href="/catalogo">
                Ver catálogo
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </motion.div>

          {/* Cifras de confianza separadas por filos naranjas */}
          <motion.dl
            variants={item}
            className="mt-4 flex w-full max-w-md items-stretch gap-5 border-t border-white/10 pt-6"
          >
            {STATS.map((stat, index) => (
              <div key={stat.label} className="flex flex-1 items-center gap-5">
                <div>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-xl font-semibold tracking-tight text-brand-bg md:text-2xl">
                      {stat.value}
                    </span>
                    <span className="mt-0.5 block text-[0.7rem] leading-tight text-brand-bg/50">
                      {stat.label}
                    </span>
                  </dd>
                </div>
                {index < STATS.length - 1 && (
                  <span
                    className="w-px self-stretch bg-gradient-to-b from-transparent via-brand-accent/40 to-transparent"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* Columna de foto (solo lg+): tarjeta editorial con elementos flotantes */}
        <motion.div
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.3 }}
          className="relative hidden lg:block"
        >
          <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[2rem] shadow-warm-lg ring-1 ring-white/10 xl:aspect-[4/3]">
            <Image
              src="/hero/living-warm.jpg"
              alt="Sala moderna y cálida amoblada con piezas de CamiHogar"
              fill
              priority
              sizes="(min-width: 1024px) 560px, 1px"
              className="object-cover"
            />
            {/* Viñeta suave para integrar la foto con el fondo oscuro */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-dark/45 via-transparent to-transparent"
              aria-hidden="true"
            />
            {/* Sello del logo sobre la foto */}
            <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-2xl border border-white/15 px-3 py-2 glass-dark">
              <LogoMark className="h-6" />
              <span className="font-display text-[0.62rem] font-medium tracking-[0.22em] text-white/85">
                CAMIHOGAR
              </span>
            </div>
          </div>

          {/* Mini-tarjeta glass flotante: rating */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.8 }}
            className="absolute -left-5 bottom-6"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center gap-2.5 rounded-2xl border border-white/40 bg-white/90 px-4 py-3 shadow-warm backdrop-blur-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent/15">
                <Star
                  className="h-4 w-4 fill-brand-accent text-brand-accent"
                  aria-hidden="true"
                />
              </span>
              <span>
                <span className="block text-sm font-semibold leading-tight tracking-tight text-brand-dark">
                  4.9 de 5
                </span>
                <span className="block text-xs leading-tight text-brand-taupe">
                  +500 hogares felices
                </span>
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Transición del hero al fondo crema */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-brand-bg"
      />
    </section>
  );
}
