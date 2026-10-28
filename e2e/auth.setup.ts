import { test as setup, expect } from "@playwright/test";
import { ACCOUNTS, authFile, signIn, type Role } from "./fixtures";

for (const role of Object.keys(ACCOUNTS) as Role[]) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await signIn(page, ACCOUNTS[role]);
    await expect(page.getByRole("link", { name: "Izza home" })).toBeVisible();
    await expect(page.getByLabel(/Account menu/)).toBeVisible();
    await page.context().storageState({ path: authFile(role) });
  });
}
