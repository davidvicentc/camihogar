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
    "Mueblería en Guatire y Guarenas con entrega en Caracas, Higuerote y toda Venezuela. Salas, comedores, camas, colchones y muebles a medida.",
  keywords: [
    "mueblería Guatire",
    "mueblería Guarenas",
    "mueblería Caracas",
    "mueblería Higuerote",
    "muebles en Venezuela",
    "salas y comedores",
    "camas y colchones",
    "muebles a medida",
  ],
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
      "Mueblería en Guatire y Guarenas con entrega en Caracas, Higuerote y toda Venezuela. Muebles que abrazan tu hogar.",
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
