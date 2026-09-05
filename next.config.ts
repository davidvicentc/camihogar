import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next infiera la raíz del workspace por el lockfile de ~/.
  outputFileTracingRoot: __dirname,
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
    ],
  },
};

export default nextConfig;
