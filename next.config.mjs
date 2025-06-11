import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // You can add more PWA options here if needed
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config options would go here
  // For now, it's empty as per your file.
};

export default withPWA(nextConfig);