import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase the maximum header size to handle large Supabase session cookies
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  // Compress responses
  compress: true,
  // Allow larger cookies for auth
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Accept-Encoding',
          value: 'gzip, deflate, br',
        },
      ],
    },
  ],
};

export default nextConfig;
