import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next infiera la raíz del workspace por el lockfile de ~/.
  outputFileTracingRoot: __dirname,
  images: {
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
