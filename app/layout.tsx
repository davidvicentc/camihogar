import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/utils";
import "./globals.css";

/**
 * La UI usa la tipografía del sistema de Apple (San Francisco). Inter solo
 * entra como respaldo en equipos donde SF no existe, por eso no se precarga.
 */
const fontFallback = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Muebles con diseño cálido para salas, comedores, dormitorios y más. Personaliza telas, acabados y medidas, y pide por WhatsApp.",
  applicationName: BRAND.name,
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Muebles con diseño cálido. Personaliza telas, acabados y medidas, y pide por WhatsApp.",
    type: "website",
    locale: "es_VE",
    siteName: BRAND.name,
    images: [
      {
        url: "/camihogarlogo.jpeg",
        width: 1000,
        height: 1000,
        alt: `Logo de ${BRAND.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: "Muebles con diseño cálido, hechos a tu medida.",
    images: ["/camihogarlogo.jpeg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F4" },
    { media: "(prefers-color-scheme: dark)", color: "#25160F" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={fontFallback.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
