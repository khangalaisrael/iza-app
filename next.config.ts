import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Database drivers load native files and WebAssembly at run time, so they stay out of the bundle.
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
};

export default nextConfig;
