/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Work around build failures caused by ESLint stack overflow on Vercel.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

