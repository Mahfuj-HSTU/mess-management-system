import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for react-redux and @reduxjs/toolkit to work correctly
  // with Next.js App Router (server/client boundary)
  transpilePackages: ["@reduxjs/toolkit", "react-redux"],
};

export default nextConfig;
