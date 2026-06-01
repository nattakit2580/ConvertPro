/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";

    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
      {
        source: "/docs",
        destination: `${apiTarget}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${apiTarget}/openapi.json`,
      },
    ];
  },
};

export default nextConfig;
