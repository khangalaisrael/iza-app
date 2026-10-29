import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Records the pitch video: one scripted run through the app on a phone. Run with `npx playwright test -c playwright.demo.config.ts`.
export default defineConfig({
  ...base,
  timeout: 180_000,
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "demo", use: { ...devices["Pixel 7"] }, dependencies: ["setup"], testMatch: /demo\.spec\.ts/ },
  ],
});
