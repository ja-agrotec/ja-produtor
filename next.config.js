/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Expoe metadados do build pro client (painel de diagnostico do PWA).
    // VERCEL_GIT_COMMIT_SHA e setado automaticamente em builds Vercel.
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};
module.exports = nextConfig;
