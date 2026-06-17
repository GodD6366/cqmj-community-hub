import path from "node:path";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.0.44"],
  devIndicators: false,
  turbopack: {
    root: path.join(__dirname),
  },
};

export default withSerwist(nextConfig);
