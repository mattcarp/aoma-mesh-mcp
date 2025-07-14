import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './jira-upgrade-testing/tests',
  fullyParallel: false, // Sequential for upgrade testing
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries to avoid lockout
  workers: 1, // Single worker to avoid lockout
  timeout: 120000, // 2 minutes timeout
  reporter: [
    ['html', { outputFolder: 'jira-upgrade-testing/reports/playwright-report' }],
    ['json', { outputFile: 'jira-upgrade-testing/reports/test-results.json' }],
    ['line']
  ],
  
  use: {
    baseURL: 'https://jirauat.smedigitalapps.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Keep browser open longer
    launchOptions: {
      slowMo: 1000,
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ]
});
