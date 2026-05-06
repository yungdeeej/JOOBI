/** @type {import('next').NextConfig} */
const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@joobi/shared'],
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default nextConfig;
