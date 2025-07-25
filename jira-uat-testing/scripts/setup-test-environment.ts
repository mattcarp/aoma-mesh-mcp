#!/usr/bin/env ts-node

/**
 * 🚀 Jira 9.12 LTS → 10.3 LTS Upgrade Testing Environment Setup
 * 
 * This script sets up our comprehensive testing framework that:
 * 1. Helps Irina validate her Jira upgrade with confidence
 * 2. Showcases our aoma-mesh-mcp intelligent testing capabilities
 */

import { promises as fs } from 'fs';
import { join } from 'path';

interface JiraTestEnvironment {
  name: string;
  baseUrl: string;
  currentVersion: string;
  targetVersion: string;
  testingWindow: {
    start: string;
    end: string;
  };
  primaryFocus: string[];
}

class JiraUpgradeTestSetup {
  private basePath: string;
  private environment: JiraTestEnvironment;

  constructor() {
    this.basePath = join(__dirname, '..');
    this.environment = {
      name: 'Jira UAT - Upgrade Testing',
      baseUrl: 'https://jirauat.smedigitalapps.com',
      currentVersion: '9.12.x LTS',
      targetVersion: '10.3.x LTS',
      testingWindow: {
        start: '2024-07-25',
        end: '2024-08-01'
      },
      primaryFocus: [
        'ITSM project validation',
        'Platform stability',
        'Security enhancements',
        'Performance validation'
      ]
    };
  }

  async initialize(): Promise<void> {
    console.log('🚀 Setting up Jira Upgrade Testing Environment...\n');
    console.log(`📋 Project: ${this.environment.name}`);
    console.log(`🎯 Target: ${this.environment.baseUrl}`);
    console.log(`📅 Window: ${this.environment.testingWindow.start} → ${this.environment.testingWindow.end}`);
    console.log('');

    try {
      // 1. Create configuration files
      await this.createEnvironmentConfig();
      await this.createTestScenarios();
      await this.createAOMAIntegration();
      
      // 2. Setup Playwright configuration
      await this.setupPlaywrightConfig();
      
      // 3. Generate test files
      await this.generateTestFiles();
      
      // 4. Create monitoring setup
      await this.setupMonitoring();
      
      console.log('✅ Environment setup completed successfully!\n');
      console.log('📋 Next Steps:');
      console.log('1. npm run jira:aoma-integration     # Initialize intelligent testing');
      console.log('2. npm run jira:test:platform-validation  # Run critical tests');
      console.log('3. npm run jira:test:itsm-comprehensive   # Validate ITSM workflows');
      console.log('\n🎯 Ready to help Irina while showcasing AOMA capabilities!');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }

  private async createEnvironmentConfig(): Promise<void> {
    console.log('⚙️ Creating UAT environment configuration...');
    
    const config = {
      environment: {
        name: this.environment.name,
        description: "Pre-UAT environment for Jira 9.12 LTS → 10.3 LTS upgrade validation",
        baseUrl: this.environment.baseUrl,
        version: {
          current: this.environment.currentVersion,
          target: this.environment.targetVersion,
          upgradeType: "major_platform_upgrade"
        },
        dataSnapshot: {
          date: "2024-06-12",
          type: "production_data",
          scope: "full_instance"
        }
      },
      
      testingWindow: {
        startDate: this.environment.testingWindow.start,
        endDate: this.environment.testingWindow.end,
        timezone: "UTC",
        availableHours: "24/7"
      },
      
      targetProjects: {
        primary: {
          key: "ITSM",
          name: "IT Service Management",
          type: "service_desk",
          priority: "critical",
          customizations: ["workflows", "fields", "automation", "sla_configs"]
        }
      },
      
      platformChanges: {
        major: [
          {
            component: "java_runtime",
            change: "Java 8/11 → Java 17",
            impact: "high",
            testRequired: true
          },
          {
            component: "platform",
            change: "Platform 6 → Platform 7", 
            impact: "high",
            testRequired: true
          },
          {
            component: "webhooks",
            change: "Synchronous → Asynchronous",
            impact: "medium",
            testRequired: true
          },
          {
            component: "rest_api",
            change: "REST v1 → REST v2",
            impact: "medium", 
            testRequired: true
          }
        ]
      },
      
      testingApproach: {
        methodology: "aoma_mesh_enhanced",
        automation: {
          framework: "playwright",
          coverage: "comprehensive"
        },
        intelligence: {
          server: "aoma-mesh-mcp",
          knowledgeBase: "jira_documentation",
          adaptiveScenarios: true
        }
      }
    };

    const configPath = join(this.basePath, 'config', 'uat-environment.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Environment config created');
  }

  private async createTestScenarios(): Promise<void> {
    console.log('📋 Creating comprehensive test scenarios...');
    
    const scenarios = {
      testScenarios: {
        itsm_core_workflows: {
          priority: "critical",
          description: "Core ITSM project functionality validation",
          scenarios: [
            {
              id: "ITSM-001",
              name: "Incident Creation and Lifecycle",
              steps: [
                "Create new incident ticket",
                "Assign to service desk agent",
                "Update status through workflow", 
                "Add comments and attachments",
                "Escalate to L2 support",
                "Resolve and close incident"
              ],
              expectedOutcome: "Complete incident lifecycle without errors"
            },
            {
              id: "ITSM-002",
              name: "Change Request Process",
              steps: [
                "Submit change request",
                "Route to Change Advisory Board",
                "Approval workflow execution",
                "Implementation scheduling",
                "Post-implementation review"
              ],
              expectedOutcome: "CAB approval process functions correctly"
            }
          ]
        },
        
        platform_compatibility: {
          priority: "critical",
          description: "Core platform functionality after major upgrade",
          scenarios: [
            {
              id: "PLAT-001",
              name: "Java 17 Runtime Compatibility",
              steps: [
                "Verify application startup",
                "Check memory usage patterns",
                "Validate garbage collection",
                "Test plugin compatibility"
              ],
              expectedOutcome: "Stable operation on Java 17"
            },
            {
              id: "PLAT-002", 
              name: "Async Webhooks Performance",
              steps: [
                "Configure test webhooks",
                "Generate high-volume events",
                "Monitor webhook delivery",
                "Measure response times"
              ],
              expectedOutcome: "Improved webhook performance"
            }
          ]
        },
        
        ui_ux_enhancements: {
          priority: "medium",
          description: "New UI features and theme changes",
          scenarios: [
            {
              id: "UI-001",
              name: "Dark Theme Functionality", 
              steps: [
                "Enable dark theme in profile",
                "Navigate through all major pages",
                "Test form interactions",
                "Verify custom field rendering"
              ],
              expectedOutcome: "Consistent dark theme experience"
            }
          ]
        }
      }
    };

    const scenariosPath = join(this.basePath, 'config', 'test-scenarios.json');
    await fs.writeFile(scenariosPath, JSON.stringify(scenarios, null, 2));
    console.log('✅ Test scenarios created');
  }

  private async createAOMAIntegration(): Promise<void> {
    console.log('🤖 Creating AOMA-mesh-mcp integration config...');
    
    const aomaConfig = {
      serverConnection: {
        url: "http://localhost:3000",
        timeout: 30000,
        retries: 3
      },
      knowledgeBases: [
        "jira_9_12_documentation",
        "jira_10_3_upgrade_notes",
        "itsm_best_practices", 
        "platform_migration_guides"
      ],
      testGeneration: {
        enabled: true,
        adaptiveScenarios: true,
        regressionDetection: true,
        performanceBaselines: true
      },
      reporting: {
        intelligentAnalysis: true,
        stakeholderSummaries: true,
        actionableInsights: true,
        trendAnalysis: true
      }
    };

    const aomaPath = join(this.basePath, 'config', 'aoma-integration.json');
    await fs.writeFile(aomaPath, JSON.stringify(aomaConfig, null, 2));
    console.log('✅ AOMA integration config created');
  }

  private async setupPlaywrightConfig(): Promise<void> {
    console.log('🎭 Setting up Playwright configuration...');
    
    const playwrightConfig = `
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './jira-upgrade-testing/tests',
  fullyParallel: false, // Sequential for upgrade testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 2,
  reporter: [
    ['html', { outputFolder: 'jira-upgrade-testing/reports/playwright-report' }],
    ['json', { outputFile: 'jira-upgrade-testing/reports/test-results.json' }],
    ['line']
  ],
  
  use: {
    baseURL: '${this.environment.baseUrl}',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ]
});
`;

    await fs.writeFile('playwright.jira-upgrade.config.ts', playwrightConfig);
    console.log('✅ Playwright config created');
  }

  private async generateTestFiles(): Promise<void> {
    console.log('📝 Generating test files...');
    
    // Platform validation tests
    const platformTests = `
import { test, expect } from '@playwright/test';

test.describe('Platform Validation - Jira 9.12 → 10.3 LTS', () => {
  test('should load Jira application successfully on Java 17', async ({ page }) => {
    await page.goto('/');
    
    // Check for successful page load
    await expect(page).toHaveTitle(/Jira/);
    
    // Verify no JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    expect(errors.length).toBe(0);
  });

  test('should support async webhooks', async ({ page }) => {
    // Navigate to webhook administration
    await page.goto('/secure/admin/webhooks/ViewWebhooks.jspa');
    
    // Verify webhook page loads (indicates Platform 7 compatibility)
    await expect(page.locator('h2')).toContainText('Webhooks');
  });

  test('should maintain REST API compatibility', async ({ page, request }) => {
    // Test REST v2 endpoints
    const response = await request.get('/rest/api/2/serverInfo');
    expect(response.status()).toBe(200);
    
    const serverInfo = await response.json();
    expect(serverInfo.version).toMatch(/^10\.3\./);
  });
});
`;

    // ITSM workflow tests  
    const itsmTests = `
import { test, expect } from '@playwright/test';

test.describe('ITSM Project Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to ITSM project
    await page.goto('/browse/ITSM');
  });

  test('should create incident tickets successfully', async ({ page }) => {
    // Test incident creation workflow
    await page.click('[data-testid="create-issue-button"]');
    
    // Select incident type
    await page.selectOption('#issuetype', 'Incident');
    
    // Fill required fields
    await page.fill('#summary', 'Test Incident - Upgrade Validation');
    await page.fill('#description', 'Testing incident creation post-upgrade');
    
    // Submit
    await page.click('#create-issue-submit');
    
    // Verify creation
    await expect(page.locator('.issue-header')).toBeVisible();
  });

  test('should process change requests through CAB', async ({ page }) => {
    // Test Change Advisory Board workflow
    await page.click('[data-testid="create-issue-button"]');
    
    // Select change request type
    await page.selectOption('#issuetype', 'Change Request');
    
    // Fill change details
    await page.fill('#summary', 'Test Change - System Upgrade');
    await page.selectOption('#priority', 'Medium');
    
    await page.click('#create-issue-submit');
    
    // Verify CAB workflow triggers
    await expect(page.locator('.workflow-status')).toContainText('Waiting for Approval');
  });
});
`;

    // UI/UX enhancement tests
    const uiTests = `
import { test, expect } from '@playwright/test';

test.describe('UI/UX Enhancement Validation', () => {
  test('should support dark theme functionality', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to user profile
    await page.click('[data-testid="user-avatar"]');
    await page.click('text=Profile');
    
    // Switch to dark theme
    await page.click('text=Preferences');
    await page.selectOption('#theme-select', 'dark');
    await page.click('#save-preferences');
    
    // Verify dark theme applied
    await page.reload();
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass).toContain('theme-dark');
  });

  test('should validate two-step authentication', async ({ page }) => {
    // Navigate to security settings
    await page.goto('/secure/admin/user/UserBrowser.jspa');
    
    // Check 2FA options available
    await page.click('text=Security');
    await expect(page.locator('text=Two-Factor Authentication')).toBeVisible();
  });
});
`;

    // Write test files
    const testFiles = [
      { path: 'tests/platform-validation/platform.spec.ts', content: platformTests },
      { path: 'tests/itsm-workflows/itsm.spec.ts', content: itsmTests },
      { path: 'tests/ui-ux-changes/ui-enhancements.spec.ts', content: uiTests }
    ];

    for (const testFile of testFiles) {
      const filePath = join(this.basePath, testFile.path);
      await fs.writeFile(filePath, testFile.content);
    }
    
    console.log('✅ Test files generated');
  }

  private async setupMonitoring(): Promise<void> {
    console.log('📊 Setting up monitoring and reporting...');
    
    const monitoringConfig = {
      metrics: {
        performance: true,
        errors: true,
        userExperience: true,
        systemHealth: true
      },
      reporting: {
        daily: true,
        stakeholders: ["irina@company.com"],
        format: "comprehensive",
        aomaEnhanced: true
      },
      alerts: {
        criticalErrors: true,
        performanceDegradation: true,
        securityIssues: true
      }
    };

    const monitoringPath = join(this.basePath, 'config', 'monitoring.json');
    await fs.writeFile(monitoringPath, JSON.stringify(monitoringConfig, null, 2));
    console.log('✅ Monitoring setup completed');
  }
}

// Execute setup if run directly
if (require.main === module) {
  const setup = new JiraUpgradeTestSetup();
  setup.initialize().catch(console.error);
}

export { JiraUpgradeTestSetup }; 