import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript (JIT) — let Next transpile them.
  transpilePackages: [
    '@personus/ai',
    '@personus/auth',
    '@personus/authz',
    '@personus/constants',
    '@personus/contact',
    '@personus/db',
    '@personus/flags',
    '@personus/logger',
    '@personus/notifications',
    '@personus/timeout',
    '@personus/types',
    '@personus/validations',
  ],
  // @neondatabase/serverless + Mastra are server-only; keep them external to the
  // server bundle so they aren't traced into edge/client output.
  serverExternalPackages: ['@neondatabase/serverless', '@mastra/core'],
};

export default nextConfig;
