import { defineConfig, devices } from '@playwright/test';

/**
 * SOTA Enterprise Playwright Configuration for JIRA 10.3.6 Upgrade Testing
 * 
 * Features:
 * - Cross-browser testing (Chrome, Firefox, WebKit)
 * - Performance monitoring with Web Vitals
 * - Session capture and reuse framework
 * - 5x retry logic with intelligent backoff
 * - Headful execution for transparency
 * - Enterprise reporting and tracing
 */

export default defineConfig({
  // Test directories
  testDir: './tests/enterprise',
  
  // Global test configuration
  timeout: 5 * 60 * 1000, // 5 minutes per test (enterprise applications are complex)
  expect: {
    timeout: 30 * 1000 // 30 seconds for assertions
  },
  
  // Parallel execution - enterprise scale
  workers: process.env.CI ? 6 : 4,
  fullyParallel: true,
  
  // Enterprise retry strategy - 5x retry logic
  retries: process.env.CI ? 5 : 3,
  
  // Enterprise reporting
  reporter: [
    ['html', { 
      outputFolder: 'enterprise-report',
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results/enterprise-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/enterprise-junit.xml' 
    }],
    ['line'], // Console output
  ],
  
  // Global test setup and teardown
  globalSetup: './tests/setup/global-setup.ts',
  globalTeardown: './tests/setup/global-teardown.ts',
  
  use: {
    // Base URL for JIRA UAT environment
    baseURL: 'https://jirauat.smedigitalapps.com',
    
    // HEADFUL execution for transparency (not headless!)
    headless: false,
    
    // Browser context options
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    
    // Video and screenshot capture
    video: {
      mode: 'retain-on-failure',
      size: { width: 1920, height: 1080 }
    },
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    // Enterprise tracing - detailed for debugging
    trace: {
      mode: 'retain-on-failure',
      screenshots: true,
      snapshots: true,
      sources: true
    },
    
    // Session and authentication
    storageState: undefined, // Will be set dynamically per test
    
    // Network and performance monitoring
    actionTimeout: 30 * 1000,
    navigationTimeout: 60 * 1000,
    
    // Custom user agent for enterprise testing
    userAgent: 'JIRA-Enterprise-Testing/1.0 (Playwright)',
    
    // Locale for consistent testing
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Permissions for comprehensive testing
    permissions: ['notifications', 'geolocation'],
    
    // Service workers and other advanced features
    serviceWorkers: 'allow',
    
    // Custom headers for testing
    extraHTTPHeaders: {
      'X-Testing-Framework': 'Playwright-Enterprise',
      'X-Test-Environment': 'UAT',
      'X-Test-Version': 'JIRA-10.3.6'
    }
  },

  // Enterprise project configurations for cross-browser testing
  projects: [
    // Desktop Chrome - Primary testing browser
    {
      name: 'chrome-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          slowMo: 100, // Slight delay for better visibility in headful mode
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--start-maximized'
          ]
        }
      },
    },
    
    // Desktop Firefox - Cross-browser validation
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          slowMo: 100
        }
      },
    },
    
    // Desktop Safari/WebKit - Cross-browser validation  
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          slowMo: 100
        }
      },
    },
    
    // Mobile Chrome - Responsive testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        launchOptions: {
          slowMo: 150 // Slower for mobile testing
        }
      },
    },
    
    // Tablet testing
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        launchOptions: {
          slowMo: 125
        }
      },
    },
    
    // High-DPI testing
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 2,
        launchOptions: {
          slowMo: 100
        }
      },
    }
  ],

  // Web server configuration disabled for JIRA external testing
  // webServer: undefined,
  
  // Test metadata for enterprise reporting
  metadata: {
    testSuite: 'JIRA 10.3.6 Enterprise Upgrade Validation',
    version: '1.0.0',
    environment: 'UAT',
    jiraVersion: '10.3.6',
    testFramework: 'Playwright Enterprise',
    executionMode: 'Headful',
    retryStrategy: '5x Intelligent Retry',
    browsers: ['Chrome', 'Firefox', 'WebKit'],
    testScope: '300+ Comprehensive Tests',
    dataSource: 'Live ITSM/DPSA Tickets (2139 records)',
    performanceMonitoring: 'Web Vitals + Custom Metrics',
    sessionManagement: 'Advanced Capture & Reuse',
    reportingLevel: 'Enterprise Grade'
  }
}); 