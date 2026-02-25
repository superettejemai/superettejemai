/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Explicitly disable Turbopack for build
  experimental: {
    turbo: undefined
  },
   allowedDevOrigins: ["*" ],
}

export default nextConfig;