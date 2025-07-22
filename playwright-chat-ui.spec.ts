import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHAT_URL = 'file://' + path.join(__dirname, 'chat-landing-page.html');

test.describe('AOMA Mesh Chat Landing Page - Mobile Responsiveness & UI', () => {
  test('should render and function on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size
    await page.goto(CHAT_URL);
    await expect(page.locator('[data-test-id="chat-container"]')).toBeVisible();
    await page.screenshot({ path: 'playwright-mobile-initial.png', fullPage: true });

    // Tool selection sidebar should be accessible
    await expect(page.locator('[data-test-id="tool-selection"]')).toBeVisible();

    // Send a chat message
    await page.fill('[data-test-id="chat-input"]', 'What is AOMA?');
    await page.click('[data-test-id="send-button"]');

    // Wait for response message (assistant)
    await page.waitForSelector('[data-test-id="chat-message-response"]', { timeout: 10000 });
    await page.screenshot({ path: 'playwright-mobile-after-send.png', fullPage: true });

    // Check for response message
    const hasResponse = await page.locator('[data-test-id="chat-message-response"]').isVisible();
    expect(hasResponse).toBeTruthy();
  });
});
