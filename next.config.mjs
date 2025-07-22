import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // You can add more PWA options here if needed
});

/** @type {import('next').NextConfig} */
const isMobileBuild = process.env.BUILD_FOR_MOBILE === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isMobileBuild ? 'export' : undefined,
  images: {
    unoptimized: isMobileBuild ? true : false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);