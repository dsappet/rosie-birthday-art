import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "coloring-book-pages.s3.us-east-005.backblazeb2.com",
      },
    ],
  },
};

export default nextConfig;
