/**
 * Multi-Tenant Testing Framework - Core Types
 * 
 * Foundation interfaces for configurable testing across multiple applications
 * Supports JIRA, AOMA, and other internal systems
 */

// ============================================================================
// CORE FRAMEWORK TYPES
// ============================================================================

export interface TestFrameworkConfig {
  /** Framework metadata */
  name: string;
  version: string;
  
  /** Global framework settings */
  global: GlobalConfig;
  
  /** Application-specific configurations */
  applications: Record<string, ApplicationConfig>;
  
  /** Environment configurations */
  environments: Record<string, EnvironmentConfig>;
  
  /** Default test suite configurations */
  testSuites: Record<string, TestSuiteConfig>;
}

export interface GlobalConfig {
  /** Default timeout settings */
  timeouts: TimeoutConfig;
  
  /** Default retry policies */
  retries: RetryConfig;
  
  /** Global reporting preferences */
  reporting: GlobalReportingConfig;
  
  /** Framework-wide feature flags */
  features: FeatureFlags;
  
  /** Plugin configurations */
  plugins: PluginConfig[];
}

// ============================================================================
// APPLICATION CONFIGURATION
// ============================================================================

export interface ApplicationConfig {
  /** Application metadata */
  name: string;
  type: ApplicationType;
  description?: string;
  version?: string;
  
  /** Base application settings */
  baseUrl: string;
  
  /** Authentication configuration */
  authentication: AuthConfig;
  
  /** Network and infrastructure requirements */
  infrastructure: InfrastructureConfig;
  
  /** Test suite configurations for this application */
  testSuites: TestSuiteConfig[];
  
  /** Performance testing configuration */
  performance: PerformanceConfig;
  
  /** Reporting configuration */
  reporting: ReportConfig;
  
  /** Application-specific UI selectors and patterns */
  uiPatterns: UIPatternConfig;
  
  /** Custom configuration for application-specific needs */
  custom?: Record<string, any>;
}

export type ApplicationType = 
  | 'jira'
  | 'aoma' 
  | 'web-application'
  | 'api-service'
  | 'mobile-app'
  | 'desktop-app'
  | 'custom';

// ============================================================================
// AUTHENTICATION CONFIGURATION
// ============================================================================

export interface AuthConfig {
  /** Authentication method type */
  type: AuthType;
  
  /** Authentication endpoints */
  endpoints: AuthEndpoints;
  
  /** Credential configuration */
  credentials?: CredentialConfig;
  
  /** Session management settings */
  sessionManagement: SessionConfig;
  
  /** Authentication validation settings */
  validation: AuthValidationConfig;
  
  /** Custom authentication parameters */
  custom?: Record<string, any>;
}

export type AuthType = 
  | 'session-based'
  | 'oauth2'
  | 'saml'
  | 'basic-auth'
  | 'jwt'
  | 'api-key'
  | 'custom'
  | 'none';

export interface AuthEndpoints {
  /** Login page URL */
  login?: string;
  
  /** Logout endpoint */
  logout?: string;
  
  /** OAuth authorization endpoint */
  authorize?: string;
  
  /** Token endpoint */
  token?: string;
  
  /** User info endpoint */
  userInfo?: string;
  
  /** Session validation endpoint */
  validate?: string;
  
  /** Custom endpoints */
  custom?: Record<string, string>;
}

export interface CredentialConfig {
  /** How credentials are provided */
  source: 'environment' | 'file' | 'prompt' | 'service';
  
  /** Environment variable names or file paths */
  references: Record<string, string>;
  
  /** Default credentials (for testing only) */
  defaults?: Record<string, string>;
}

export interface SessionConfig {
  /** Session storage type */
  storage: 'cookies' | 'localStorage' | 'sessionStorage' | 'memory';
  
  /** Session persistence settings */
  persistence: SessionPersistenceConfig;
  
  /** Session validation frequency */
  validation: SessionValidationConfig;
}

export interface AuthValidationConfig {
  /** How to detect successful authentication */
  successIndicators: ValidationIndicator[];
  
  /** How to detect authentication failure */
  failureIndicators: ValidationIndicator[];
  
  /** Authentication validation timeout */
  timeout: number;
}

export interface ValidationIndicator {
  type: 'url-pattern' | 'element-present' | 'element-absent' | 'text-content' | 'custom';
  pattern: string;
  description: string;
}

// ============================================================================
// INFRASTRUCTURE CONFIGURATION
// ============================================================================

export interface InfrastructureConfig {
  /** Network requirements */
  network: NetworkConfig;
  
  /** VPN requirements */
  vpn?: VPNConfig;
  
  /** Performance baseline requirements */
  performance: InfrastructurePerformanceConfig;
  
  /** Health check endpoints */
  healthChecks: HealthCheckConfig[];
  
  /** Environment-specific overrides */
  environmentOverrides?: Record<string, Partial<InfrastructureConfig>>;
}

export interface NetworkConfig {
  /** Required network connectivity */
  connectivity: 'public' | 'private' | 'vpn-required' | 'custom';
  
  /** Network timeout settings */
  timeouts: NetworkTimeoutConfig;
  
  /** Allowed/required network protocols */
  protocols: string[];
  
  /** Custom network validation */
  customValidation?: NetworkValidationConfig;
}

export interface VPNConfig {
  /** VPN type */
  type: 'cisco-global-protect' | 'openvpn' | 'wireguard' | 'custom';
  
  /** VPN validation method */
  validation: VPNValidationConfig;
  
  /** Required VPN connection indicators */
  requirements: VPNRequirementConfig;
}

// ============================================================================
// TEST SUITE CONFIGURATION
// ============================================================================

export interface TestSuiteConfig {
  /** Test suite metadata */
  name: string;
  type: TestSuiteType;
  description?: string;
  
  /** Test execution settings */
  execution: TestExecutionConfig;
  
  /** Test patterns and scenarios */
  patterns: TestPatternConfig[];
  
  /** Expected results and validation */
  validation: TestValidationConfig;
  
  /** Test data requirements */
  data?: TestDataConfig;
  
  /** Environment-specific overrides */
  environmentOverrides?: Record<string, Partial<TestSuiteConfig>>;
}

export type TestSuiteType = 
  | 'functional'
  | 'performance'
  | 'security'
  | 'usability'
  | 'infrastructure'
  | 'integration'
  | 'regression'
  | 'smoke'
  | 'custom';

export interface TestExecutionConfig {
  /** Execution timeout */
  timeout: number;
  
  /** Retry configuration */
  retries: RetryConfig;
  
  /** Parallel execution settings */
  parallel?: ParallelExecutionConfig;
  
  /** Prerequisites and dependencies */
  prerequisites: string[];
  
  /** Cleanup requirements */
  cleanup: CleanupConfig;
}

export interface TestPatternConfig {
  /** Pattern name and description */
  name: string;
  description?: string;
  
  /** Pattern type */
  type: TestPatternType;
  
  /** Pattern-specific configuration */
  config: Record<string, any>;
  
  /** Success criteria */
  successCriteria: SuccessCriteria[];
  
  /** Failure conditions */
  failureConditions: FailureCondition[];
}

export type TestPatternType = 
  | 'link-validation'
  | 'form-interaction'
  | 'navigation-flow'
  | 'performance-benchmark'
  | 'security-scan'
  | 'accessibility-check'
  | 'custom';

// ============================================================================
// PERFORMANCE CONFIGURATION
// ============================================================================

export interface PerformanceConfig {
  /** Performance testing settings */
  testing: PerformanceTestingConfig;
  
  /** Performance thresholds */
  thresholds: PerformanceThresholdConfig;
  
  /** Performance monitoring */
  monitoring: PerformanceMonitoringConfig;
  
  /** Custom performance metrics */
  customMetrics?: CustomMetricConfig[];
}

export interface PerformanceTestingConfig {
  /** Load testing configuration */
  load?: LoadTestingConfig;
  
  /** Response time testing */
  responseTime: ResponseTimeConfig;
  
  /** Resource utilization monitoring */
  resources: ResourceMonitoringConfig;
}

// ============================================================================
// REPORTING CONFIGURATION
// ============================================================================

export interface ReportConfig {
  /** Report generation settings */
  generation: ReportGenerationConfig;
  
  /** Report formats and templates */
  formats: ReportFormatConfig[];
  
  /** Report content configuration */
  content: ReportContentConfig;
  
  /** Report distribution settings */
  distribution?: ReportDistributionConfig;
}

export interface ReportGenerationConfig {
  /** Auto-generation settings */
  automatic: boolean;
  
  /** Report generation triggers */
  triggers: ReportTrigger[];
  
  /** Report naming convention */
  naming: ReportNamingConfig;
  
  /** Output directory configuration */
  output: ReportOutputConfig;
}

// ============================================================================
// UI PATTERN CONFIGURATION
// ============================================================================

export interface UIPatternConfig {
  /** Common UI selectors for the application */
  selectors: UISelectors;
  
  /** Navigation patterns */
  navigation: NavigationPatterns;
  
  /** Form interaction patterns */
  forms: FormPatterns;
  
  /** Custom interaction patterns */
  custom?: CustomUIPatterns;
}

export interface UISelectors {
  /** Authentication-related selectors */
  auth: AuthSelectors;
  
  /** Navigation-related selectors */
  navigation: NavigationSelectors;
  
  /** Content area selectors */
  content: ContentSelectors;
  
  /** Form-related selectors */
  forms: FormSelectors;
  
  /** Error and message selectors */
  messages: MessageSelectors;
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export interface EnvironmentConfig {
  /** Environment metadata */
  name: string;
  type: EnvironmentType;
  description?: string;
  
  /** Environment-specific overrides */
  overrides: EnvironmentOverrides;
  
  /** Environment validation */
  validation: EnvironmentValidationConfig;
  
  /** Environment-specific credentials */
  credentials?: Record<string, CredentialConfig>;
}

export type EnvironmentType = 'development' | 'testing' | 'staging' | 'production' | 'custom';

export interface EnvironmentOverrides {
  /** Base URL overrides */
  baseUrls?: Record<string, string>;
  
  /** Authentication overrides */
  authentication?: Record<string, Partial<AuthConfig>>;
  
  /** Performance threshold overrides */
  performance?: Record<string, Partial<PerformanceConfig>>;
  
  /** Infrastructure requirement overrides */
  infrastructure?: Record<string, Partial<InfrastructureConfig>>;
}

// ============================================================================
// PLUGIN SYSTEM TYPES
// ============================================================================

export interface PluginConfig {
  /** Plugin metadata */
  name: string;
  version: string;
  type: PluginType;
  
  /** Plugin configuration */
  config: Record<string, any>;
  
  /** Plugin dependencies */
  dependencies?: string[];
  
  /** Plugin enable/disable state */
  enabled: boolean;
}

export type PluginType = 
  | 'authentication'
  | 'test-pattern'
  | 'reporting'
  | 'storage'
  | 'monitoring'
  | 'custom';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface TimeoutConfig {
  default: number;
  page: number;
  element: number;
  network: number;
  authentication: number;
}

export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoff: 'linear' | 'exponential' | 'fixed';
  retryableErrors: string[];
}

export interface FeatureFlags {
  parallelExecution: boolean;
  screenshotCapture: boolean;
  videoRecording: boolean;
  performanceMonitoring: boolean;
  securityScanning: boolean;
  accessibilityTesting: boolean;
  customPlugins: boolean;
}

// ============================================================================
// RESULT AND STATUS TYPES
// ============================================================================

export interface TestResult {
  /** Test execution metadata */
  id: string;
  timestamp: string;
  duration: number;
  
  /** Test configuration reference */
  config: TestConfigReference;
  
  /** Test execution status */
  status: TestStatus;
  
  /** Test results by category */
  results: TestCategoryResults;
  
  /** Performance metrics */
  performance: PerformanceMetrics;
  
  /** Error information */
  errors: TestError[];
  
  /** Evidence and artifacts */
  evidence: TestEvidence;
}

export type TestStatus = 'passed' | 'failed' | 'error' | 'skipped' | 'timeout';

export interface TestCategoryResults {
  functional?: FunctionalTestResults;
  performance?: PerformanceTestResults;
  security?: SecurityTestResults;
  usability?: UsabilityTestResults;
  infrastructure?: InfrastructureTestResults;
}

// ============================================================================
// ADDITIONAL SUPPORTING TYPES
// ============================================================================

// Authentication-specific types
export interface SessionPersistenceConfig {
  enabled: boolean;
  location: string;
  encryption: boolean;
  expiration: number;
}

export interface SessionValidationConfig {
  frequency: number;
  endpoint?: string;
  method: 'passive' | 'active';
}

// Network-specific types
export interface NetworkTimeoutConfig {
  connection: number;
  request: number;
  response: number;
}

export interface NetworkValidationConfig {
  endpoints: string[];
  method: 'ping' | 'http' | 'custom';
  timeout: number;
}

// VPN-specific types
export interface VPNValidationConfig {
  method: 'interface-check' | 'ip-range' | 'endpoint-test' | 'custom';
  indicators: string[];
  timeout: number;
}

export interface VPNRequirementConfig {
  required: boolean;
  fallbackBehavior: 'fail' | 'skip' | 'warn';
  validationInterval: number;
}

// Infrastructure performance types
export interface InfrastructurePerformanceConfig {
  baselineResponseTime: number;
  maxResponseTime: number;
  availabilityThreshold: number;
}

export interface HealthCheckConfig {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatus: number;
  timeout: number;
  interval: number;
}

// Test execution types
export interface ParallelExecutionConfig {
  enabled: boolean;
  maxConcurrency: number;
  resourcePooling: boolean;
}

export interface CleanupConfig {
  automatic: boolean;
  scope: 'session' | 'test' | 'suite' | 'application';
  customCleanup?: string[];
}

// Test validation types
export interface TestValidationConfig {
  successThreshold: number;
  failureThreshold: number;
  warningThreshold: number;
  customValidation?: ValidationRule[];
}

export interface SuccessCriteria {
  type: 'response-time' | 'element-present' | 'status-code' | 'custom';
  condition: string;
  value: any;
}

export interface FailureCondition {
  type: 'timeout' | 'error' | 'element-absent' | 'custom';
  condition: string;
  severity: 'critical' | 'major' | 'minor';
}

// Performance types
export interface LoadTestingConfig {
  users: number;
  duration: number;
  rampUp: number;
  scenarios: LoadScenario[];
}

export interface ResponseTimeConfig {
  percentiles: number[];
  thresholds: Record<string, number>;
  sampling: SamplingConfig;
}

export interface ResourceMonitoringConfig {
  cpu: boolean;
  memory: boolean;
  network: boolean;
  custom: string[];
}

export interface PerformanceThresholdConfig {
  responseTime: Record<string, number>;
  throughput: Record<string, number>;
  errorRate: Record<string, number>;
  availability: number;
}

export interface PerformanceMonitoringConfig {
  realTime: boolean;
  sampling: SamplingConfig;
  storage: StorageConfig;
  alerting: AlertingConfig;
}

export interface CustomMetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  collection: MetricCollectionConfig;
  thresholds: Record<string, number>;
}

// Reporting types
export interface ReportFormatConfig {
  type: 'json' | 'markdown' | 'html' | 'pdf' | 'xml' | 'custom';
  template?: string;
  options: Record<string, any>;
}

export interface ReportContentConfig {
  sections: ReportSection[];
  includeEvidence: boolean;
  includeRawData: boolean;
  customContent?: Record<string, any>;
}

export interface ReportDistributionConfig {
  email?: EmailDistributionConfig;
  webhook?: WebhookDistributionConfig;
  storage?: StorageDistributionConfig;
}

export interface ReportTrigger {
  type: 'completion' | 'failure' | 'schedule' | 'custom';
  condition: string;
  action: ReportAction;
}

export interface ReportNamingConfig {
  pattern: string;
  includeTimestamp: boolean;
  includeEnvironment: boolean;
  customFields: string[];
}

export interface ReportOutputConfig {
  directory: string;
  createSubdirectories: boolean;
  cleanup: ReportCleanupConfig;
}

// UI Pattern types
export interface AuthSelectors {
  loginForm: string;
  usernameField: string;
  passwordField: string;
  loginButton: string;
  logoutButton: string;
  userIndicator: string;
  errorMessage: string;
}

export interface NavigationSelectors {
  mainMenu: string;
  breadcrumbs: string;
  searchBox: string;
  backButton: string;
  homeLink: string;
}

export interface ContentSelectors {
  mainContent: string;
  sidebar: string;
  header: string;
  footer: string;
  loadingIndicator: string;
}

export interface FormSelectors {
  submitButton: string;
  cancelButton: string;
  requiredFields: string;
  errorMessages: string;
  successMessages: string;
}

export interface MessageSelectors {
  errorMessages: string;
  warningMessages: string;
  successMessages: string;
  infoMessages: string;
  notifications: string;
}

export interface NavigationPatterns {
  mainNavigation: NavigationPattern[];
  breadcrumbNavigation: NavigationPattern[];
  contextualNavigation: NavigationPattern[];
}

export interface FormPatterns {
  creation: FormPattern[];
  editing: FormPattern[];
  search: FormPattern[];
  filters: FormPattern[];
}

export interface CustomUIPatterns {
  interactions: InteractionPattern[];
  validations: ValidationPattern[];
  workflows: WorkflowPattern[];
}

// Environment validation types
export interface EnvironmentValidationConfig {
  required: boolean;
  validators: EnvironmentValidator[];
  timeout: number;
}

// Additional utility types
export interface TestConfigReference {
  application: string;
  environment: string;
  suite: string;
  version: string;
}

export interface PerformanceMetrics {
  responseTime: ResponseTimeMetrics;
  throughput: ThroughputMetrics;
  errors: ErrorMetrics;
  resources: ResourceMetrics;
}

export interface TestError {
  id: string;
  type: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  timestamp: string;
}

export interface TestEvidence {
  screenshots: string[];
  videos: string[];
  logs: string[];
  rawData: string[];
  customArtifacts: Record<string, string>;
}

export interface FunctionalTestResults {
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  coverage: number;
  details: FunctionalTestDetail[];
}

export interface PerformanceTestResults {
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  throughput: number;
  errorRate: number;
  details: PerformanceTestDetail[];
}

export interface SecurityTestResults {
  vulnerabilities: SecurityVulnerability[];
  riskScore: number;
  compliance: ComplianceResult[];
  recommendations: string[];
}

export interface UsabilityTestResults {
  accessibilityScore: number;
  usabilityIssues: UsabilityIssue[];
  recommendations: string[];
  userExperienceMetrics: UXMetrics;
}

export interface InfrastructureTestResults {
  availability: number;
  performance: InfrastructurePerformanceResults;
  healthChecks: HealthCheckResult[];
  networkMetrics: NetworkMetrics;
}

// Global reporting types
export interface GlobalReportingConfig {
  defaultFormats: string[];
  defaultTemplate: string;
  outputDirectory: string;
  retentionPolicy: RetentionPolicy;
}

// Supporting interface declarations
export interface LoadScenario {
  name: string;
  weight: number;
  actions: ScenarioAction[];
}

export interface SamplingConfig {
  rate: number;
  method: 'random' | 'systematic' | 'stratified';
}

export interface StorageConfig {
  type: 'file' | 'database' | 'cloud' | 'memory';
  location: string;
  retention: RetentionPolicy;
}

export interface AlertingConfig {
  enabled: boolean;
  thresholds: AlertThreshold[];
  channels: AlertChannel[];
}

export interface MetricCollectionConfig {
  frequency: number;
  aggregation: 'sum' | 'average' | 'max' | 'min';
  storage: StorageConfig;
}

export interface ReportSection {
  name: string;
  type: 'summary' | 'details' | 'metrics' | 'recommendations' | 'custom';
  config: Record<string, any>;
}

export interface EmailDistributionConfig {
  recipients: string[];
  subject: string;
  template: string;
}

export interface WebhookDistributionConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
}

export interface StorageDistributionConfig {
  type: 'file' | 'cloud' | 'database';
  location: string;
  retention: RetentionPolicy;
}

export interface ReportAction {
  type: 'generate' | 'distribute' | 'archive' | 'custom';
  config: Record<string, any>;
}

export interface ReportCleanupConfig {
  enabled: boolean;
  retentionDays: number;
  maxFiles: number;
}

export interface NavigationPattern {
  name: string;
  selector: string;
  expectedDestination: string;
  validation: ValidationRule[];
}

export interface FormPattern {
  name: string;
  selector: string;
  fields: FormField[];
  validation: ValidationRule[];
}

export interface InteractionPattern {
  name: string;
  trigger: string;
  action: string;
  validation: ValidationRule[];
}

export interface ValidationPattern {
  name: string;
  selector: string;
  rules: ValidationRule[];
}

export interface WorkflowPattern {
  name: string;
  steps: WorkflowStep[];
  validation: ValidationRule[];
}

export interface EnvironmentValidator {
  type: 'url-accessible' | 'service-available' | 'custom';
  config: Record<string, any>;
}

export interface ResponseTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  transactionsPerSecond: number;
  dataTransferRate: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  criticalErrors: number;
}

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
}

export interface FunctionalTestDetail {
  name: string;
  status: TestStatus;
  duration: number;
  error?: string;
}

export interface PerformanceTestDetail {
  operation: string;
  responseTime: number;
  status: TestStatus;
  metadata: Record<string, any>;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
}

export interface ComplianceResult {
  standard: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  details: string;
}

export interface UsabilityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  element?: string;
}

export interface UXMetrics {
  timeToInteractive: number;
  firstContentfulPaint: number;
  accessibility: AccessibilityMetrics;
}

export interface InfrastructurePerformanceResults {
  responseTime: ResponseTimeMetrics;
  availability: number;
  reliability: number;
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details: string;
}

export interface NetworkMetrics {
  latency: number;
  bandwidth: number;
  packetLoss: number;
  jitter: number;
}

export interface RetentionPolicy {
  days: number;
  maxFiles?: number;
  archiveAfter?: number;
}

export interface ScenarioAction {
  type: string;
  config: Record<string, any>;
  weight: number;
}

export interface AlertThreshold {
  metric: string;
  condition: 'greater' | 'less' | 'equal';
  value: number;
  severity: 'info' | 'warning' | 'critical';
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
}

export interface ValidationRule {
  type: string;
  condition: string;
  expected: any;
  message: string;
}

export interface FormField {
  name: string;
  selector: string;
  type: 'text' | 'password' | 'email' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  validation?: ValidationRule[];
}

export interface WorkflowStep {
  name: string;
  action: string;
  selector?: string;
  data?: Record<string, any>;
  validation?: ValidationRule[];
}

export interface AccessibilityMetrics {
  score: number;
  violations: AccessibilityViolation[];
  wcagLevel: 'A' | 'AA' | 'AAA';
}

export interface AccessibilityViolation {
  rule: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  elements: string[];
  description: string;
} 