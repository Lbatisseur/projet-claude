import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.boutique.example" }],
  },
};

export default nextConfig;
