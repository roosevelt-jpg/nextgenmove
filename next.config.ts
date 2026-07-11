import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Admin SDK external so Node resolves its native/transitive deps correctly.
  serverExternalPackages: ["firebase-admin"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
