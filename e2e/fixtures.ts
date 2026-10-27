import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";

export const PASSWORD = "e2e-only-password"; // matches the throwaway seed in playwright.config.ts

export const ACCOUNTS = {
  admin: "admin@iza.test",
  runner: "sipho@iza.test",
  point: "cornershop@iza.test",
  customer: "lindiwe@iza.test",
} as const;

export type Role = keyof typeof ACCOUNTS;

export const authFile = (role: Role) => `e2e/.auth/${role}.json`;

export async function signIn(page: Page, identifier: string, password = PASSWORD) {
  await page.goto("/signin");
  await page.getByLabel("Phone number or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

type Fixtures = {
  /** A fresh browser context signed in as the given role. */
  as: (role: Role) => Promise<BrowserContext>;
};

export const test = base.extend<Fixtures>({
  as: async ({ browser, baseURL }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async (role) => {
      const ctx = await browser.newContext({ baseURL, storageState: authFile(role) });
      contexts.push(ctx);
      return ctx;
    });
    await Promise.all(contexts.map((c) => c.close()));
  },
});

export { expect };
