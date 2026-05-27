import { test, expect } from "@playwright/test";

test("creates a project", async ({ page }) => {
  await page.goto("/projects/new");
  await page.getByRole("textbox", { name: /name/i }).fill("Roadmap");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Roadmap")).toBeVisible();
});
