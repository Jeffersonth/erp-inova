/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build standalone (server.js + node_modules traçados) — usado pelo
  // Dockerfile de deploy na VPS (mesmo padrão dos projetos irmãos).
  output: "standalone",
};

export default nextConfig;
