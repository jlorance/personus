import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@personus/auth',
    '@personus/authz',
    '@personus/constants',
    '@personus/db',
    '@personus/flags',
    '@personus/logger',
  ],
  serverExternalPackages: ['@neondatabase/serverless'],
};

export default nextConfig;
