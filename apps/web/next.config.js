/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@moltlaw/shared', '@moltlaw/database'],
}

module.exports = nextConfig
