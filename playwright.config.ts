import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

// Carrega o .env.local pro process.env (login do teste + chaves do Supabase).
try {
  const txt = readFileSync(new URL(".env.local", import.meta.url), "utf8");
  for (const line of txt.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trimStart().startsWith("#")) {
      const k = line.slice(0, i).trim();
      if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
    }
  }
} catch {
  /* .env.local ausente — o teste vai pular se faltar credencial */
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
