import type { NextConfig } from "next";

const r2Hostname = (() => {
  try { return process.env.NEXT_PUBLIC_R2_PUBLIC_URL ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname : null; }
  catch { return null; }
})();

const nextConfig: NextConfig = {
  // Evita que Next infiera la raíz del workspace por el lockfile de ~/.
  outputFileTracingRoot: __dirname,
  async redirects() {
    // Old indexed monochrome URLs resolve to the official brand colors too.
    return [
      { source: "/logo-mark-white.png", destination: "/logo-mark-color.png", permanent: true },
      { source: "/logo-lockup-white.png", destination: "/camihogarlogo.jpeg", permanent: true },
    ];
  },
  images: {
    // Las imágenes se sirven desde su URL original para evitar cargos de Image Optimization en Vercel.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(r2Hostname ? [{ protocol: "https" as const, hostname: r2Hostname }] : []),
    ],
  },
};

export default nextConfig;
