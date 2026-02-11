import { test, expect } from '@playwright/test';

/**
 * Simplified Workflow Tests
 * 
 * Basic workflow tests that verify core functionality without complex selectors.
 */

test.describe('Ideation Basic Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/project/digilist/ideation');
        await page.waitForLoadState('networkidle');
    });

    test('should load page successfully', async ({ page }) => {
        // Verify page loaded
        const body = await page.textContent('body');
        expect(body).toContain('Ideation');
        expect(body).not.toContain('No routes matched');
    });

    test('should have functional generate button', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate")').first();
        await expect(generateButton).toBeEnabled();

        // Click should not cause errors
        await generateButton.click();
        await page.waitForTimeout(500);

        // Should still be on same page
        expect(page.url()).toContain('/ideation');
    });

    test('should have tabs', async ({ page }) => {
        const tabList = page.locator('[role="tablist"]');
        await expect(tabList).toBeVisible();
    });
});

test.describe('Roadmap Basic Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/project/digilist/roadmap');
        await page.waitForLoadState('networkidle');
    });

    test('should load page successfully', async ({ page }) => {
        // Verify page loaded
        const body = await page.textContent('body');
        expect(body).toContain('Roadmap');
        expect(body).not.toContain('No routes matched');
    });

    test('should have functional generate button', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate")').first();
        await expect(generateButton).toBeEnabled();

        // Click should not cause errors
        await generateButton.click();
        await page.waitForTimeout(500);

        // Should still be on same page
        expect(page.url()).toContain('/roadmap');
    });
});
