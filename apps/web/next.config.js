/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@botesq/shared', '@botesq/database'],
}

module.exports = nextConfig
