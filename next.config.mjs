/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Versão do app exibida no rodapé (D15 / §9.4). Bump automático pelo CI depois;
    // por enquanto lê da versão do package.json em build-time.
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.0.0",
  },
};

export default nextConfig;
