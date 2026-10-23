import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith("/")
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://127.0.0.1:5000");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "100.102.156.86",
    "*.trycloudflare.com",
    "*.localtunnel.me",
    "*.ngrok-free.app",
    "*.devtunnels.ms",
  ],
  async rewrites() {
    return [
      {
        source: "/api/chat/:path*",
        destination: `${BACKEND_URL}/api/chat/:path*`,
      },
      {
        source: "/api/chat",
        destination: `${BACKEND_URL}/api/chat`,
      },
      {
        source: "/api/stt/:path*",
        destination: `${BACKEND_URL}/api/stt/:path*`,
      },
      {
        source: "/api/stt",
        destination: `${BACKEND_URL}/api/stt`,
      },
      {
        source: "/api/auth/:path*",
        destination: `${BACKEND_URL}/api/auth/:path*`,
      },
      {
        source: "/api/documents/:path*",
        destination: `${BACKEND_URL}/api/documents/:path*`,
      },
      {
        source: "/api/case/:path*",
        destination: `${BACKEND_URL}/api/case/:path*`,
      },
      {
        source: "/api/police/:path*",
        destination: `${BACKEND_URL}/api/police/:path*`,
      },
      {
        source: "/api/judge/:path*",
        destination: `${BACKEND_URL}/api/judge/:path*`,
      },
      {
        source: "/api/advocates",
        destination: `${BACKEND_URL}/api/advocates`,
      },
      {
        source: "/api/petitions/:path*",
        destination: `${BACKEND_URL}/api/petitions/:path*`,
      },
      {
        source: "/api/petitions",
        destination: `${BACKEND_URL}/api/petitions`,
      },
      {
        source: "/api/document/:path*",
        destination: `${BACKEND_URL}/api/document/:path*`,
      },
      {
        source: "/health",
        destination: `${BACKEND_URL}/health`,
      },
    ];
  },
};

export default nextConfig;
