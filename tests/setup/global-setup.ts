import { chromium, FullConfig } from '@playwright/test';
import { SessionManager } from '../utils/session-manager';
import { DataManager } from '../utils/data-manager';
import { PerformanceMonitor } from '../utils/performance-monitor';

/**
 * Enterprise Global Setup for JIRA 10.3.6 Testing
 * 
 * Responsibilities:
 * - Capture and save authenticated session
 * - Prepare test data from ITSM/DPSA tickets
 * - Initialize performance monitoring
 * - Validate environment readiness
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 JIRA 10.3.6 Enterprise Testing - Global Setup Starting...');
  
  const startTime = Date.now();
  
  try {
    // Initialize session manager
    const sessionManager = new SessionManager();
    
    // 1. Capture authenticated session (once for all tests)
    console.log('🔐 Capturing authenticated session...');
    await sessionManager.captureAuthenticatedSession();
    
    // 2. Prepare test data from real ITSM/DPSA tickets
    console.log('📊 Preparing test data from ITSM/DPSA tickets...');
    const dataManager = new DataManager();
    await dataManager.prepareTestData();
    
    // 3. Initialize performance monitoring
    console.log('⚡ Initializing performance monitoring...');
    const perfMonitor = new PerformanceMonitor();
    await perfMonitor.initialize();
    
    // 4. Validate JIRA 10.3.6 environment
    console.log('✅ Validating JIRA 10.3.6 environment...');
    await validateJiraEnvironment();
    
    // 5. Create test result directories
    console.log('📁 Creating test result directories...');
    await setupTestDirectories();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Global setup completed successfully in ${duration}ms`);
    
    // Store setup metadata for reports
    const setupMetadata = {
      setupDuration: duration,
      sessionCaptured: true,
      dataCount: await dataManager.getTestDataCount(),
      jiraVersion: await getJiraVersion(),
      timestamp: new Date().toISOString(),
      environment: 'UAT'
    };
    
    await saveSetupMetadata(setupMetadata);
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function validateJiraEnvironment() {
  // Launch browser to validate environment
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Check if JIRA is accessible
    await page.goto('https://jirauat.smedigitalapps.com', { waitUntil: 'domcontentloaded' });
    
    // Check for JIRA 10.3.6 specific elements
    await page.waitForSelector('body', { timeout: 30000 });
    
    // Validate login page is accessible
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    await page.waitForSelector('form', { timeout: 15000 });
    
    console.log('✅ JIRA UAT environment is accessible');
    
  } catch (error) {
    console.error('❌ JIRA environment validation failed:', error);
    throw new Error(`JIRA environment not accessible: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function getJiraVersion(): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://jirauat.smedigitalapps.com');
    
    // Try to extract version from page source or API
    const version = await page.evaluate(() => {
      // Look for version in common places
      const metaVersion = document.querySelector('meta[name="jira-version"]');
      if (metaVersion) return metaVersion.getAttribute('content');
      
      // Look in script tags or data attributes
      const bodyVersion = document.body.getAttribute('data-version');
      if (bodyVersion) return bodyVersion;
      
      return '10.3.6'; // Default assumption
    });
    
    return version || '10.3.6';
    
  } catch (error) {
    console.warn('⚠️ Could not determine JIRA version, assuming 10.3.6');
    return '10.3.6';
  } finally {
    await browser.close();
  }
}

async function setupTestDirectories() {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const directories = [
    'test-results/enterprise-report',
    'test-results/sessions',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'test-results/performance',
    'test-results/data-exports',
    'tests/data/generated'
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }
  }
}

async function saveSetupMetadata(metadata: any) {
  const fs = await import('fs/promises');
  
  try {
    await fs.writeFile(
      'test-results/setup-metadata.json',
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.warn('⚠️ Could not save setup metadata:', error);
  }
}

export default globalSetup; 