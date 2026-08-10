"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { FABRIC_PRESETS } from "@/lib/constants";

const swatchContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
};

const swatch: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export function CustomizerBanner() {
  return (
    <section aria-labelledby="customizer-banner-title" className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-hero-gradient px-6 py-11 shadow-warm-lg ring-1 ring-white/10 md:px-12 md:py-16">
        {/* Luz cálida y trama de la ventana del logo */}
        <div className="pointer-events-none absolute inset-0 bg-warm-radial" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 logo-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_80%_at_10%_50%,black,transparent)]"
          aria-hidden="true"
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-accent/30 blur-3xl md:h-72 md:w-72"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Marca de agua: la casa del logo con barrido de luz */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 right-4 hidden h-56 opacity-[0.07] md:block"
        >
          <div className="relative h-full overflow-hidden">
            <LogoMark variant="white" className="h-full" />
            <span className="absolute inset-y-0 -left-1/3 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        </div>

        <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium tracking-tight text-brand-bg/90 backdrop-blur">
              <Wand2 className="h-3.5 w-3.5 text-brand-accent" aria-hidden="true" />
              Hecho a tu medida
            </span>
            <h2
              id="customizer-banner-title"
              className="mt-4 text-balance font-display text-[1.9rem] font-semibold leading-[1.05] tracking-tightest text-brand-bg md:text-5xl"
            >
              Diseña tu <span className="text-gradient-ember">mueble ideal</span>
            </h2>
            <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed tracking-tight text-brand-bg/70 md:text-base">
              Telas, acabados y medidas a tu gusto. Tú lo imaginas, nosotros lo
              fabricamos para que llegue a casa tal como lo soñaste.
            </p>

            {/* Muestras de tela decorativas */}
            <motion.div
              variants={swatchContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-6 flex items-center -space-x-2"
              aria-hidden="true"
            >
              {FABRIC_PRESETS.map((fabric, index) => (
                <motion.span
                  key={fabric.name}
                  variants={swatch}
                  title={fabric.name}
                  className="relative inline-block h-8 w-8 rounded-full border-2 border-brand-dark shadow-warm-sm md:h-9 md:w-9"
                  style={{ backgroundColor: fabric.hex, zIndex: FABRIC_PRESETS.length - index }}
                >
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    animate={{ opacity: [0, 0.25, 0] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.35,
                      ease: "easeInOut",
                    }}
                    style={{ backgroundColor: "#FFFFFF" }}
                  />
                </motion.span>
              ))}
            </motion.div>
          </div>

          <Button asChild variant="accent" size="lg" className="shrink-0">
            <Link href="/personalizar">
              <Wand2 aria-hidden="true" />
              Personalizar ahora
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
