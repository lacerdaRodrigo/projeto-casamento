import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // M1: foco em unit no domínio puro. Componente/E2E entram depois.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
