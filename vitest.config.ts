import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Native tsconfig-paths-Auflösung (@/* → src/*), kein Extra-Plugin nötig.
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: "node",
    // Nur Unit-Tests; die Playwright-E2E-Specs unter tests/e2e bleiben außen vor.
    include: ["src/**/*.test.ts"],
    env: {
      // Prisma-Client wird beim Import konstruiert (kein Connect) – Dummy reicht.
      DATABASE_URL: "postgresql://user:pass@localhost:5432/vrema_test",
      NODE_ENV: "test",
    },
  },
});
