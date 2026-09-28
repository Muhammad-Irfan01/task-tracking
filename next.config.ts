import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files; load it with Node's require instead of bundling.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
