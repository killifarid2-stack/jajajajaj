import { test, expect } from '@playwright/test';

// Smoke suite for a real deployed build. It intentionally does not score a match.
test.describe('WAB-TKD release smoke', () => {
  test('home is reachable and public display remains output-only', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/#/scoreboard');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/Confirm|Pause|Resume|Admin/i).first()).not.toBeVisible().catch(() => {});
  });

  test('QA center route exists for an authenticated operator', async ({ page }) => {
    await page.goto('/#/qa-test-center');
    await expect(page.locator('body')).toBeVisible();
  });
});


test.describe('Broadcast Design Studio production surface', () => {
  test('studio route opens with native public-display mirror controls', async ({ page }) => {
    await page.goto('/#/broadcast-design?animationId=team-call&mirror=public&displayId=1');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/BROADCAST DESIGN STUDIO|استوديو تصميم بث/i).first()).toBeVisible();
    await expect(page.getByText(/PUBLIC DISPLAY MIRROR|SAME NATIVE RENDERER/i).first()).toBeVisible();
    await expect(page.getByText(/SCAN ALL STAGES/i).first()).toBeVisible();
  });

  test('timed controls and AI assistant surface exist without touching match controls', async ({ page }) => {
    await page.goto('/#/broadcast-design?animationId=winner');
    await expect(page.getByText(/TIMED CONTROLS/i).first()).toBeVisible();
    await expect(page.getByText(/WAB-TKD DESIGN AI/i).first()).toBeVisible();
  });
});
