// Load polyfill before anything else
require('./polyfill');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static export to avoid build issues with react-pdftotext during Docker build
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Suppress TypeScript errors during build for Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Suppress ESLint errors during build for Docker
  eslint: {
    ignoreDuringBuilds: true,
  }
}

module.exports = nextConfig