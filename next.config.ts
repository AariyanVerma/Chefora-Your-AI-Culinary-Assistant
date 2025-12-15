import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {
    // Suppress source map warnings - these are harmless development warnings
    // from third-party packages like @neondatabase/serverless
  },
  // Increase body size limit for server actions (default is 1MB)
  // This is needed because base64 images can be large
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow up to 10MB for server actions
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'foodish-api.herokuapp.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.google.com',
      },
    ],
    // Allow unoptimized images from any domain (for Google search results)
    unoptimized: false,
  },
};

export default nextConfig;
