/**
 * Multi-Tenant Testing Framework - Configuration Manager
 * 
 * Centralized configuration management for multi-application testing
 * Handles loading, validation, and environment-specific overrides
 */

import fs from 'fs';
import path from 'path';
import type { 
  TestFrameworkConfig, 
  ApplicationConfig, 
  EnvironmentConfig,
  AuthConfig,
  TestSuiteConfig
} from '../types/core.js';

export class ConfigurationManager {
  private config: TestFrameworkConfig | null = null;
  private configPath: string;
  private environment: string;

  constructor(configPath?: string, environment: string = 'default') {
    this.configPath = configPath || this.findConfigFile();
    this.environment = environment;
  }

  /**
   * Load and validate the framework configuration
   */
  async loadConfig(): Promise<TestFrameworkConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      console.log(`📋 Loading multi-tenant framework configuration from: ${this.configPath}`);
      
      const configData = await this.readConfigFile();
      const validatedConfig = this.validateConfig(configData);
      const processedConfig = this.processEnvironmentOverrides(validatedConfig);
      
      this.config = processedConfig;
      
      console.log(`✅ Configuration loaded successfully`);
      console.log(`   🏢 Applications: ${Object.keys(this.config.applications).length}`);
      console.log(`   🌍 Environments: ${Object.keys(this.config.environments).length}`);
      console.log(`   🧪 Test Suites: ${Object.keys(this.config.testSuites).length}`);
      
      return this.config;
    } catch (error: any) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Get configuration for a specific application
   */
  getApplicationConfig(applicationName: string): ApplicationConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const appConfig = this.config.applications[applicationName];
    if (!appConfig) {
      throw new Error(`Application configuration not found: ${applicationName}`);
    }

    return appConfig;
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(environmentName?: string): EnvironmentConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const envName = environmentName || this.environment;
    const envConfig = this.config.environments[envName];
    
    if (!envConfig) {
      throw new Error(`Environment configuration not found: ${envName}`);
    }

    return envConfig;
  }

  /**
   * Get test suite configuration
   */
  getTestSuiteConfig(suiteName: string): TestSuiteConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const suiteConfig = this.config.testSuites[suiteName];
    if (!suiteConfig) {
      throw new Error(`Test suite configuration not found: ${suiteName}`);
    }

    return suiteConfig;
  }

  /**
   * Get merged configuration for application + environment + test suite
   */
  getMergedConfig(
    applicationName: string, 
    environmentName?: string, 
    testSuiteName?: string
  ): {
    application: ApplicationConfig;
    environment: EnvironmentConfig;
    testSuite?: TestSuiteConfig;
    merged: ApplicationConfig;
  } {
    const appConfig = this.getApplicationConfig(applicationName);
    const envConfig = this.getEnvironmentConfig(environmentName);
    const testSuiteConfig = testSuiteName ? this.getTestSuiteConfig(testSuiteName) : undefined;

    // Apply environment overrides to application config
    const mergedConfig = this.applyEnvironmentOverrides(appConfig, envConfig);

    return {
      application: appConfig,
      environment: envConfig,
      ...(testSuiteConfig && { testSuite: testSuiteConfig }),
      merged: mergedConfig
    };
  }

  /**
   * Validate if an application is supported
   */
  isApplicationSupported(applicationName: string): boolean {
    return this.config ? applicationName in this.config.applications : false;
  }

  /**
   * List all available applications
   */
  getAvailableApplications(): string[] {
    return this.config ? Object.keys(this.config.applications) : [];
  }

  /**
   * List all available environments
   */
  getAvailableEnvironments(): string[] {
    return this.config ? Object.keys(this.config.environments) : [];
  }

  /**
   * List all available test suites
   */
  getAvailableTestSuites(): string[] {
    return this.config ? Object.keys(this.config.testSuites) : [];
  }

  /**
   * Reload configuration (useful for development)
   */
  async reloadConfig(): Promise<TestFrameworkConfig> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Create a default configuration template
   */
  static createDefaultConfig(): TestFrameworkConfig {
    return {
      name: 'Multi-Tenant Testing Framework',
      version: '1.0.0',
      global: {
        timeouts: {
          default: 30000,
          page: 60000,
          element: 10000,
          network: 15000,
          authentication: 45000
        },
        retries: {
          maxAttempts: 3,
          delay: 1000,
          backoff: 'exponential',
          retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE']
        },
        reporting: {
          defaultFormats: ['json', 'markdown'],
          defaultTemplate: 'standard',
          outputDirectory: './reports',
          retentionPolicy: {
            days: 30,
            maxFiles: 100
          }
        },
        features: {
          parallelExecution: true,
          screenshotCapture: true,
          videoRecording: false,
          performanceMonitoring: true,
          securityScanning: false,
          accessibilityTesting: true,
          customPlugins: true
        },
        plugins: []
      },
      applications: {},
      environments: {
        default: {
          name: 'Default Environment',
          type: 'testing',
          description: 'Default testing environment',
          overrides: {},
          validation: {
            required: false,
            validators: [],
            timeout: 10000
          }
        }
      },
      testSuites: {}
    };
  }

  /**
   * Create JIRA application configuration template
   */
  static createJiraApplicationConfig(): ApplicationConfig {
    return {
      name: 'JIRA UAT',
      type: 'jira',
      description: 'JIRA User Acceptance Testing Environment',
      baseUrl: 'https://jirauat.smedigitalapps.com',
      authentication: {
        type: 'session-based',
        endpoints: {
          login: '/jira/login.jsp',
          logout: '/jira/secure/Logout.jspa',
          validate: '/jira/secure/Dashboard.jspa'
        },
        credentials: {
          source: 'environment',
          references: {
            username: 'JIRA_USERNAME',
            password: 'JIRA_PASSWORD'
          }
        },
        sessionManagement: {
          storage: 'cookies',
          persistence: {
            enabled: true,
            location: './sessions',
            encryption: false,
            expiration: 3600000
          },
          validation: {
            frequency: 300000,
            method: 'passive'
          }
        },
        validation: {
          successIndicators: [
            {
              type: 'url-pattern',
              pattern: '/secure/Dashboard.jspa',
              description: 'Dashboard URL indicates successful login'
            },
            {
              type: 'element-present',
              pattern: '.dashboard',
              description: 'Dashboard element present'
            }
          ],
          failureIndicators: [
            {
              type: 'text-content',
              pattern: 'You\'re not logged in',
              description: 'Not logged in message'
            },
            {
              type: 'element-present',
              pattern: 'form[name="loginform"]',
              description: 'Login form present'
            }
          ],
          timeout: 30000
        }
      },
      infrastructure: {
        network: {
          connectivity: 'vpn-required',
          timeouts: {
            connection: 10000,
            request: 30000,
            response: 30000
          },
          protocols: ['https']
        },
        vpn: {
          type: 'cisco-global-protect',
          validation: {
            method: 'interface-check',
            indicators: ['utun'],
            timeout: 5000
          },
          requirements: {
            required: true,
            fallbackBehavior: 'fail',
            validationInterval: 60000
          }
        },
        performance: {
          baselineResponseTime: 2000,
          maxResponseTime: 10000,
          availabilityThreshold: 0.95
        },
        healthChecks: [
          {
            name: 'JIRA Base URL',
            url: 'https://jirauat.smedigitalapps.com/jira',
            method: 'GET',
            expectedStatus: 200,
            timeout: 10000,
            interval: 60000
          }
        ]
      },
      testSuites: [
        {
          name: 'functional-comprehensive',
          type: 'functional',
          description: 'Comprehensive functional testing including navigation and link validation',
          execution: {
            timeout: 300000,
            retries: {
              maxAttempts: 3,
              delay: 5000,
              backoff: 'linear',
              retryableErrors: ['TIMEOUT', 'NETWORK_ERROR']
            },
            prerequisites: ['authentication'],
            cleanup: {
              automatic: true,
              scope: 'session'
            }
          },
          patterns: [
            {
              name: 'link-validation',
              type: 'link-validation',
              description: 'Validate all links on key pages',
              config: {
                pages: ['Dashboard', 'Issue Navigator', 'Create Issue', 'Projects', 'Profile'],
                maxLinksPerPage: 50,
                includeExternalLinks: true,
                screenshotOnFailure: true
              },
              successCriteria: [
                {
                  type: 'response-time',
                  condition: 'less-than',
                  value: 10000
                }
              ],
              failureConditions: [
                {
                  type: 'error',
                  condition: 'equals',
                  severity: 'critical'
                }
              ]
            }
          ],
          validation: {
            successThreshold: 0.9,
            failureThreshold: 0.1,
            warningThreshold: 0.2
          }
        }
      ],
      performance: {
        testing: {
          responseTime: {
            percentiles: [50, 90, 95, 99],
            thresholds: {
              p50: 2000,
              p90: 5000,
              p95: 8000,
              p99: 15000
            },
            sampling: {
              rate: 1.0,
              method: 'systematic'
            }
          },
          resources: {
            cpu: true,
            memory: true,
            network: true,
            custom: []
          }
        },
        thresholds: {
          responseTime: {
            dashboard: 3000,
            issueNavigator: 5000,
            createIssue: 4000
          },
          throughput: {
            requests: 10
          },
          errorRate: {
            maximum: 0.05
          },
          availability: 0.99
        },
        monitoring: {
          realTime: true,
          sampling: {
            rate: 0.1,
            method: 'random'
          },
          storage: {
            type: 'file',
            location: './performance-data',
            retention: {
              days: 7
            }
          },
          alerting: {
            enabled: true,
            thresholds: [
              {
                metric: 'response-time',
                condition: 'greater',
                value: 10000,
                severity: 'warning'
              }
            ],
            channels: []
          }
        }
      },
      reporting: {
        generation: {
          automatic: true,
          triggers: [
            {
              type: 'completion',
              condition: 'always',
              action: {
                type: 'generate',
                config: {}
              }
            }
          ],
          naming: {
            pattern: 'jira-test-report-{timestamp}',
            includeTimestamp: true,
            includeEnvironment: true,
            customFields: []
          },
          output: {
            directory: './reports/jira',
            createSubdirectories: true,
            cleanup: {
              enabled: true,
              retentionDays: 30,
              maxFiles: 50
            }
          }
        },
        formats: [
          {
            type: 'json',
            options: {
              pretty: true,
              includeRawData: true
            }
          },
          {
            type: 'markdown',
            template: 'comprehensive',
            options: {
              includeCharts: true,
              includeScreenshots: true
            }
          }
        ],
        content: {
          sections: [
            {
              name: 'executive-summary',
              type: 'summary',
              config: {}
            },
            {
              name: 'functional-results',
              type: 'details',
              config: {}
            },
            {
              name: 'performance-metrics',
              type: 'metrics',
              config: {}
            },
            {
              name: 'recommendations',
              type: 'recommendations',
              config: {}
            }
          ],
          includeEvidence: true,
          includeRawData: false
        }
      },
      uiPatterns: {
        selectors: {
          auth: {
            loginForm: 'form[name="loginform"]',
            usernameField: '#login-form-username',
            passwordField: '#login-form-password',
            loginButton: '#login-form-submit',
            logoutButton: '#log_out',
            userIndicator: '#header-details-user-fullname',
            errorMessage: '.aui-message-error'
          },
          navigation: {
            mainMenu: '#navigation-app',
            breadcrumbs: '.aui-nav-breadcrumbs',
            searchBox: '#quickSearchInput',
            backButton: '.aui-nav-previous',
            homeLink: '#home_link'
          },
          content: {
            mainContent: '#main',
            sidebar: '#sidebar',
            header: '#header',
            footer: '#footer',
            loadingIndicator: '.loading'
          },
          forms: {
            submitButton: '.aui-button-primary',
            cancelButton: '.aui-button-cancel',
            requiredFields: '.required',
            errorMessages: '.error',
            successMessages: '.aui-message-success'
          },
          messages: {
            errorMessages: '.aui-message-error',
            warningMessages: '.aui-message-warning',
            successMessages: '.aui-message-success',
            infoMessages: '.aui-message-info',
            notifications: '.aui-flag'
          }
        },
        navigation: {
          mainNavigation: [
            {
              name: 'Dashboard',
              selector: 'a[href*="Dashboard.jspa"]',
              expectedDestination: '/secure/Dashboard.jspa',
              validation: []
            },
            {
              name: 'Issues',
              selector: 'a[href*="issues"]',
              expectedDestination: '/issues/',
              validation: []
            }
          ],
          breadcrumbNavigation: [],
          contextualNavigation: []
        },
        forms: {
          creation: [],
          editing: [],
          search: [],
          filters: []
        }
      }
    };
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: TestFrameworkConfig, outputPath?: string): Promise<void> {
    const savePath = outputPath || this.configPath;
    
    try {
      const configData = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(savePath, configData, 'utf8');
      console.log(`✅ Configuration saved to: ${savePath}`);
    } catch (error: any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  // Private helper methods

  private findConfigFile(): string {
    const possiblePaths = [
      './multi-tenant-config.json',
      './config/multi-tenant-config.json',
      './src/config/multi-tenant-config.json',
      './.multitenant/config.json'
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    // Return default path for creation
    return './multi-tenant-config.json';
  }

  private async readConfigFile(): Promise<any> {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Configuration file not found: ${this.configPath}`);
    }

    const configData = await fs.promises.readFile(this.configPath, 'utf8');
    return JSON.parse(configData);
  }

  private validateConfig(config: any): TestFrameworkConfig {
    // Basic validation - in a real implementation, use a schema validator like Joi or Zod
    if (!config.name || !config.version) {
      throw new Error('Configuration must have name and version');
    }

    if (!config.applications || typeof config.applications !== 'object') {
      throw new Error('Configuration must have applications object');
    }

    if (!config.environments || typeof config.environments !== 'object') {
      throw new Error('Configuration must have environments object');
    }

    return config as TestFrameworkConfig;
  }

  private processEnvironmentOverrides(config: TestFrameworkConfig): TestFrameworkConfig {
    // Apply environment-specific overrides
    const processedConfig = JSON.parse(JSON.stringify(config)); // Deep clone

    // Process environment variables and overrides
    // This is where you'd apply environment-specific configurations

    return processedConfig;
  }

  private applyEnvironmentOverrides(
    appConfig: ApplicationConfig, 
    envConfig: EnvironmentConfig
  ): ApplicationConfig {
    const merged = JSON.parse(JSON.stringify(appConfig)); // Deep clone

    // Apply base URL overrides
    if (envConfig.overrides.baseUrls && envConfig.overrides.baseUrls[appConfig.name]) {
      merged.baseUrl = envConfig.overrides.baseUrls[appConfig.name];
    }

    // Apply authentication overrides
    if (envConfig.overrides.authentication && envConfig.overrides.authentication[appConfig.name]) {
      merged.authentication = {
        ...merged.authentication,
        ...envConfig.overrides.authentication[appConfig.name]
      };
    }

    // Apply performance overrides
    if (envConfig.overrides.performance && envConfig.overrides.performance[appConfig.name]) {
      merged.performance = {
        ...merged.performance,
        ...envConfig.overrides.performance[appConfig.name]
      };
    }

    // Apply infrastructure overrides
    if (envConfig.overrides.infrastructure && envConfig.overrides.infrastructure[appConfig.name]) {
      merged.infrastructure = {
        ...merged.infrastructure,
        ...envConfig.overrides.infrastructure[appConfig.name]
      };
    }

    return merged;
  }
} 