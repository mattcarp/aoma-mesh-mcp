import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Global test timeout
  timeout: 60 * 1000,
  
  // Expect timeout for assertions
  expect: { timeout: 15 * 1000 },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: 'html',
  
  projects: [
    // Setup project - runs authentication once
    { 
      name: 'setup', 
      testMatch: /.*\.setup\.ts/,
      timeout: 180 * 1000, // 3 minutes for login
    },
    
    // Chrome tests with authentication
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use the authentication state from setup
        storageState: 'playwright/.auth/jira-user.json',
        // JIRA UAT environment
        baseURL: 'https://jirauat.smedigitalapps.com/jira',
        ignoreHTTPSErrors: true,
      },
      // Temporarily remove setup dependency to test saved session directly
      // dependencies: ['setup'],
    },
  ],
  
  use: {
    // Global settings
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
    
    // Capture on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Browser settings
    headless: false, // Always run in headed mode for interactive JIRA login
  },
});
