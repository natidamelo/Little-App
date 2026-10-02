/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const rawTarget =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";
    const target = rawTarget.replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
