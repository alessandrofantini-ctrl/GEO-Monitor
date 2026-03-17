import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WHY: il page router è disabilitato — usiamo solo App Router (ADR-0001)
  experimental: {},
};

export default nextConfig;
