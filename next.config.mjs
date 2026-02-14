/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Work around build failures caused by ESLint stack overflow on Vercel.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Work around build failures due to type-check stack overflow on Vercel.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

