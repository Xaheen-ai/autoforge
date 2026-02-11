import { test, expect } from '@playwright/test';

/**
 * Simplified Navigation Tests
 * 
 * These tests verify core routing functionality without relying on specific selectors.
 * They catch routing bugs that backend tests cannot detect.
 */

test.describe('Core Routing', () => {
    test('should load home page', async ({ page }) => {
        await page.goto('/');

        // Verify page loaded (look for any content)
        const body = await page.textContent('body');
        expect(body).toBeTruthy();
        expect(body).not.toContain('No routes matched');
    });

    test('should load Ideation page directly', async ({ page }) => {
        await page.goto('/project/digilist/ideation');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Verify URL is correct
        expect(page.url()).toContain('/project/digilist/ideation');

        // Verify no routing errors
        const body = await page.textContent('body');
        expect(body).not.toContain('No routes matched');
        expect(body).not.toContain('404');

        // Verify Ideation content loaded
        expect(body).toContain('Ideation');
    });

    test('should load Roadmap page directly', async ({ page }) => {
        await page.goto('/project/digilist/roadmap');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Verify URL is correct
        expect(page.url()).toContain('/project/digilist/roadmap');

        // Verify no routing errors
        const body = await page.textContent('body');
        expect(body).not.toContain('No routes matched');
        expect(body).not.toContain('404');

        // Verify Roadmap content loaded
        expect(body).toContain('Roadmap');
    });

    test('should redirect invalid routes to home', async ({ page }) => {
        await page.goto('/invalid/route/that/does/not/exist');

        // Should redirect to home
        await page.waitForLoadState('networkidle');
        expect(page.url()).toBe('http://localhost:5173/');
    });
});

test.describe('Ideation Page Elements', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/project/digilist/ideation');
        await page.waitForLoadState('networkidle');
    });

    test('should display page title', async ({ page }) => {
        const title = page.locator('h1:has-text("Ideation")');
        await expect(title).toBeVisible({ timeout: 10000 });
    });

    test('should display Back button', async ({ page }) => {
        const backButton = page.locator('button:has-text("Back")');
        await expect(backButton).toBeVisible({ timeout: 5000 });
    });

    test('should display Generate button', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate")');
        await expect(generateButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display tabs', async ({ page }) => {
        // Look for tab triggers
        const tabs = page.locator('[role="tablist"]');
        await expect(tabs).toBeVisible({ timeout: 5000 });
    });

    test('should navigate back when clicking Back button', async ({ page }) => {
        const backButton = page.locator('button:has-text("Back")');
        await backButton.click();

        // Should navigate to home
        await page.waitForLoadState('networkidle');
        expect(page.url()).toBe('http://localhost:5173/');
    });
});

test.describe('Roadmap Page Elements', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/project/digilist/roadmap');
        await page.waitForLoadState('networkidle');
    });

    test('should display page title', async ({ page }) => {
        const title = page.locator('h1:has-text("Roadmap")');
        await expect(title).toBeVisible({ timeout: 10000 });
    });

    test('should display Back button', async ({ page }) => {
        const backButton = page.locator('button:has-text("Back")');
        await expect(backButton).toBeVisible({ timeout: 5000 });
    });

    test('should display Generate button', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate")');
        await expect(generateButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('should navigate back when clicking Back button', async ({ page }) => {
        const backButton = page.locator('button:has-text("Back")');
        await backButton.click();

        // Should navigate to home
        await page.waitForLoadState('networkidle');
        expect(page.url()).toBe('http://localhost:5173/');
    });
});

test.describe('Page Interactions', () => {
    test('Ideation: should handle generate button click', async ({ page }) => {
        await page.goto('/project/digilist/ideation');
        await page.waitForLoadState('networkidle');

        const generateButton = page.locator('button:has-text("Generate")').first();
        await generateButton.click();

        // Wait a bit for any loading states
        await page.waitForTimeout(1000);

        // Page should still be on ideation route
        expect(page.url()).toContain('/ideation');
    });

    test('Roadmap: should handle generate button click', async ({ page }) => {
        await page.goto('/project/digilist/roadmap');
        await page.waitForLoadState('networkidle');

        const generateButton = page.locator('button:has-text("Generate")').first();
        await generateButton.click();

        // Wait a bit for any loading states
        await page.waitForTimeout(1000);

        // Page should still be on roadmap route
        expect(page.url()).toContain('/roadmap');
    });
});
