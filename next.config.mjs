/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: "/AEI-Animated",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/AEI-Animated",
  },
};

export default nextConfig;

