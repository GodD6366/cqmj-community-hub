
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.0.44"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
