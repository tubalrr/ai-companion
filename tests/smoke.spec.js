import { test, expect } from "@playwright/test";

const pagePaths = [
  "/index.html",
  "/pages/profile.html",
  "/pages/settings.html",
  "/pages/upgrade.html",
  "/pages/help.html",
  "/pages/login.html",
  "/pages/signup.html",
  "/pages/library.html",
  "/pages/projects.html",
  "/pages/scheduled.html",
  "/pages/coding.html",
  "/pages/project-workspace.html"
];

test.describe("AI Companion page smoke tests", () => {
  for (const pagePath of pagePaths) {
    test("loads " + pagePath, async ({ page }) => {
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
      const response = await page.goto(pagePath, { waitUntil: "networkidle" });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("homepage buttons are visible and enabled", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "networkidle" });
    const buttons = page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(buttons.nth(i)).toBeVisible();
      await expect(buttons.nth(i)).toBeEnabled();
    }
  });
});
