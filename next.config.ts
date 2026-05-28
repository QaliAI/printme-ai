import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.printify.com' },
      { protocol: 'https', hostname: 'cdn.printify.com' },
      { protocol: 'https', hostname: 'image.pollinations.ai' },
    ],
  },
};

export default nextConfig;
