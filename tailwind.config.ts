import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Sistema de diseño derivado del logo oficial de CamiHogar:
 * marrón #25160F (fondo del logo) + naranja #E8511A (casa y regla).
 * El resto de la paleta son tonos calculados a partir de esos dos.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          /* Tintas exactas del logo */
          dark: "#25160F",
          accent: "#E8511A",
          /* Escala de marrones para superficies oscuras */
          espresso: "#331E14",
          cocoa: "#46291B",
          /* Escala del naranja */
          ember: "#C63F0C",
          flame: "#FF7A45",
          /* Neutros cálidos */
          bg: "#FBF8F4",
          sand: "#F1E9E0",
          taupe: "#6E5748",
          card: "#FFFFFF",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        /* Stack tipográfico de Apple; Inter cubre los equipos no-Apple */
        sans: ["var(--font-apple-text)"],
        display: ["var(--font-apple-display)"],
      },
      letterSpacing: {
        /* Titulares al estilo Apple: tracking negativo progresivo */
        tightest: "-0.045em",
        tighter: "-0.032em",
        tight: "-0.02em",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        warm: "0 24px 50px -22px rgba(37, 22, 15, 0.32)",
        "warm-sm": "0 10px 26px -14px rgba(37, 22, 15, 0.22)",
        "warm-lg": "0 44px 90px -34px rgba(37, 22, 15, 0.45)",
        glow: "0 0 60px -12px rgba(232, 81, 26, 0.5)",
        "glow-sm": "0 0 28px -8px rgba(232, 81, 26, 0.45)",
        /* Botón de acento con luz interna, al estilo iOS */
        ember:
          "0 10px 30px -10px rgba(232, 81, 26, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)",
      },
      backgroundImage: {
        "warm-radial":
          "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(232,81,26,0.16), transparent 70%)",
        "hero-gradient":
          "linear-gradient(155deg, #1C100A 0%, #25160F 42%, #46291B 100%)",
        "ember-gradient": "linear-gradient(135deg, #FF7A45 0%, #E8511A 55%, #C63F0C 100%)",
        "ink-gradient": "linear-gradient(180deg, #25160F 0%, #1A0F09 100%)",
        /* Texto con degradado del naranja del logo */
        "text-ember": "linear-gradient(100deg, #FF8A5B 0%, #E8511A 55%, #FF7A45 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        /* Barrido de luz sobre el monograma del logo */
        sheen: {
          "0%": { transform: "translateX(-140%) skewX(-18deg)" },
          "55%, 100%": { transform: "translateX(240%) skewX(-18deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        sheen: "sheen 6s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
