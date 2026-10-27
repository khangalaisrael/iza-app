import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
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
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: `node scripts/reset-e2e.mjs && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
    // A throwaway database and throwaway demo accounts, only for these tests.
    env: {
      IZA_DB_FILE: "data/e2e.db",
      IZA_SEED_DEMO: "1",
      IZA_SEED_PASSWORD: "e2e-only-password",
    },
  },
});
