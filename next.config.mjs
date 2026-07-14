import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Parent dir has a stray package-lock.json; without this Turbopack picks the
  // wrong root and nested routes like /members/admin 404.
  turbopack: {
    root: __dirname,
  },
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
