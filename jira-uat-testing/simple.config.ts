import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 0,
  workers: 1,
  reporter: 'list',
  
  use: {
    baseURL: 'https://jirauat.smedigitalapps.com/jira',
    ignoreHTTPSErrors: true,
    actionTimeout: 15000,
    navigationTimeout: 60000,
  },
});
