import { expect, test } from '@playwright/test';

// Replace TC-WORKFLOW-001 with the source-backed test case ID.
test('TC-WORKFLOW-001 user completes the documented workflow', async ({ page }) => {
  await page.goto('/replace-with-route');

  await page.getByRole('textbox', { name: /replace with label/i }).fill('replace-with-value');
  await page.getByRole('button', { name: /replace with action/i }).click();

  await expect(page).toHaveURL(/replace-with-expected-route/);
  await expect(page.getByRole('heading', { name: /replace with expected state/i })).toBeVisible();
});

test('TC-WORKFLOW-001 mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/replace-with-route');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
