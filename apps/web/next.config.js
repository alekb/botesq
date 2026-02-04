/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@botesq/shared', '@botesq/database'],
  experimental: {
    // Mark native modules as external for server-side code
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },
}

module.exports = nextConfig
