import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  // Some flows walk through several screens and roles, and a slow or nearly full disk can stretch them past the default 30 seconds.
  timeout: 60_000,
  // The first request after a cold start boots the test database, which can take a few seconds.
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Signs in once per role and saves the cookies for the tests.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // Phone first: this is a phone-width app.
    {
      name: "phone",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts|demo\.spec\.ts/,
    },
  ],
  webServer: {
    command: `node scripts/reset-e2e.mjs && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
    // A throwaway Postgres (PGlite) and throwaway demo accounts, only for these tests.
    env: {
      IZA_DB_DIR: "data/e2e-pg",
      IZA_SEED_DEMO: "1",
      IZA_SEED_PASSWORD: "e2e-only-password",
      // Set E2E_DATABASE_URL to run the same tests through the real `pg` driver (see scripts/pg-smoke.mjs).
      ...(process.env.E2E_DATABASE_URL ? { DATABASE_URL: process.env.E2E_DATABASE_URL, PG_POOL_MAX: "1" } : {}),
    },
  },
});
