// Type definitions for JIRA UAT Testing Framework

export interface TestConfig {
  environment: 'UAT' | 'PROD';
  jiraVersion: string;
  testSuites: TestSuite[];
  themes: UITheme[];
  browsers: Browser[];
  parallel: boolean;
  s3Config: S3Config;
  supabaseConfig: SupabaseConfig;
  aomaServerUrl: string;
  retryConfig?: RetryConfig;
  performanceThresholds?: PerformanceThresholds;
}

export type TestSuite = 'theme' | 'performance' | 'functional' | 'visual' | 'accessibility';
export type UITheme = 'light' | 'dark';
export type Browser = 'chromium' | 'firefox' | 'webkit';

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
}

export interface PerformanceThresholds {
  lcp: number; // ms
  fid: number; // ms
  cls: number; // score
  loadTime: number; // ms
}

// Test Results Types
export interface TestRun {
  id: string;
  runName: string;
  jiraVersion: string;
  testSuite: string;
  environment: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  browserInfo: BrowserInfo;
  testConfig: any;
  aiSummary?: string;
  riskScore?: number;
  overallScore?: number;
  recommendations?: string[];
  metadata?: any;
}

export interface BrowserInfo {
  name: string;
  version: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
}

export interface PerformanceMetrics {
  id: string;
  testRunId: string;
  pageUrl: string;
  pageTitle?: string;
  testType: string;
  componentName?: string;
  
  // Core Web Vitals
  lcpScore?: number;
  fidScore?: number;
  clsScore?: number;
  fcpScore?: number;
  ttfbScore?: number;
  
  // Additional metrics
  pageLoadTime?: number;
  domContentLoaded?: number;
  networkRequestsCount?: number;
  totalPageSizeKb?: number;
  jsBundleSizeKb?: number;
  cssSizeKb?: number;
  imageSizeKb?: number;
  
  // Errors
  jsErrors?: string[];
  consoleWarnings?: string[];
  consoleErrors?: string[];
  networkFailures?: string[];
  
  // Visual
  screenshotS3Url?: string;
  uiTheme?: UITheme;
  visualRegressionScore?: number;
  accessibilityScore?: number;
  
  // Context
  browserInfo: BrowserInfo;
  viewportSize: { width: number; height: number };
  userAgent: string;
  timestamp: Date;
  testDurationMs?: number;
}

export interface ComponentTest {
  id: string;
  testRunId: string;
  componentName: string;
  testScenario: string;
  testDescription?: string;
  ticketKey?: string;
  ticketProject?: string;
  
  status: 'pass' | 'fail' | 'warning' | 'skip';
  executionTimeMs?: number;
  errorMessage?: string;
  errorStack?: string;
  assertionResults?: any;
  
  // Visual evidence
  beforeScreenshotS3Url?: string;
  afterScreenshotS3Url?: string;
  diffScreenshotS3Url?: string;
  videoS3Url?: string;
  
  // Performance
  componentLoadTimeMs?: number;
  interactionLatencyMs?: number;
  animationDurationMs?: number;
  
  // Journey
  stepNumber?: number;
  previousStepId?: string;
  
  timestamp: Date;
  retriesAttempted: number;
  testDataUsed?: any;
}

export interface AIInsight {
  id: string;
  testRunId: string;
  insightType: 'risk' | 'recommendation' | 'anomaly' | 'pattern' | 'optimization';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category?: string;
  
  title: string;
  description: string;
  detailedAnalysis?: string;
  impactAssessment?: string;
  
  evidenceUrls?: string[];
  supportingMetrics?: any;
  affectedComponents?: string[];
  
  suggestedActions?: string[];
  priorityScore?: number;
  estimatedEffort?: string;
  
  confidenceScore?: number;
  aiModelUsed?: string;
  analysisMethod?: string;
  
  relatedAOMADocs?: string[];
  relatedTickets?: string[];
  historicalPatterns?: string[];
  
  timestamp: Date;
  status: 'active' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
}

export interface VisualAsset {
  id: string;
  testRunId: string;
  componentTestId?: string;
  
  assetType: 'screenshot' | 'video' | 'log' | 'har' | 'trace';
  s3Url: string;
  s3Bucket: string;
  s3Key: string;
  fileSizeBytes?: number;
  mimeType?: string;
  
  captureContext?: string;
  pageUrl?: string;
  componentName?: string;
  uiTheme?: UITheme;
  viewportInfo?: any;
  
  imageHash?: string;
  visualComplexityScore?: number;
  textContent?: string;
  
  timestamp: Date;
  createdBy: string;
  tags?: string[];
}

// UAT Ticket integration
export interface UATicket {
  key: string;
  project: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  created: string;
  updated: string;
  description?: string;
}

// Test scenarios
export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
  expectedResults: string[];
  tickets?: UATicket[];
  components: string[];
  themes: UITheme[];
}

export interface TestStep {
  action: string;
  target: string;
  data?: any;
  waitCondition?: string;
  captureScreenshot?: boolean;
  measurePerformance?: boolean;
}

// Report generation
export interface TestReport {
  executiveSummary: {
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    keyFindings: string[];
    recommendations: string[];
    testDuration: string;
    environment: string;
    jiraVersion: string;
  };
  
  testResults: {
    themeTesting: ThemeTestResults;
    performanceMetrics: PerformanceResults;
    functionalTesting: FunctionalTestResults;
    visualRegression: VisualRegressionResults;
    accessibilityTesting: AccessibilityResults;
  };
  
  aiInsights: {
    riskAssessment: RiskAssessment;
    upgradeRecommendations: string[];
    knownIssues: AOMAKnowledgeReference[];
    monitoringSuggestions: string[];
  };
  
  evidence: {
    screenshots: ScreenshotEvidence[];
    performanceCharts: Chart[];
    comparisonData: ComparisonData;
    videos: VideoEvidence[];
  };
  
  appendix: {
    testConfiguration: TestConfig;
    environmentDetails: any;
    rawData: any;
  };
}

export interface ThemeTestResults {
  lightTheme: ComponentThemeResults[];
  darkTheme: ComponentThemeResults[];
  crossThemeIssues: string[];
  overallScore: number;
}

export interface ComponentThemeResults {
  componentName: string;
  renderingScore: number;
  layoutConsistency: number;
  colorContrast: number;
  issues: string[];
  screenshotUrl: string;
}

export interface PerformanceResults {
  overallScore: number;
  coreWebVitals: {
    lcp: MetricResult;
    fid: MetricResult;
    cls: MetricResult;
  };
  pageLoadMetrics: PageLoadResult[];
  performanceTrends: TrendData[];
  regressions: PerformanceRegression[];
}

export interface MetricResult {
  value: number;
  threshold: number;
  status: 'pass' | 'warning' | 'fail';
  percentile: number;
}

export interface PageLoadResult {
  url: string;
  loadTime: number;
  domContentLoaded: number;
  networkRequests: number;
  pageSize: number;
  issues: string[];
}

export interface TrendData {
  metric: string;
  values: { timestamp: Date; value: number }[];
  trend: 'improving' | 'stable' | 'degrading';
}

export interface PerformanceRegression {
  metric: string;
  currentValue: number;
  baselineValue: number;
  percentageChange: number;
  significance: 'minor' | 'moderate' | 'major';
}

export interface FunctionalTestResults {
  overallScore: number;
  itsmWorkflows: WorkflowTestResult[];
  portalFunctionality: PortalTestResult[];
  proformaIntegration: ProformaTestResult[];
  searchFunctionality: SearchTestResult[];
  userPermissions: PermissionTestResult[];
}

export interface WorkflowTestResult {
  workflowName: string;
  ticketKey: string;
  steps: StepResult[];
  overallStatus: 'pass' | 'fail' | 'warning';
  duration: number;
  issues: string[];
}

export interface StepResult {
  stepName: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  errorMessage?: string;
  screenshotUrl?: string;
}

export interface PortalTestResult {
  portalName: string;
  formSubmission: boolean;
  requestCreation: boolean;
  statusTracking: boolean;
  userExperience: number;
  issues: string[];
}

export interface ProformaTestResult {
  formName: string;
  rendering: boolean;
  dataCapture: boolean;
  validation: boolean;
  submission: boolean;
  issues: string[];
}

export interface SearchTestResult {
  searchType: string;
  resultsAccuracy: number;
  responseTime: number;
  filterFunctionality: boolean;
  issues: string[];
}

export interface PermissionTestResult {
  userRole: string;
  accessGranted: string[];
  accessDenied: string[];
  securityScore: number;
  issues: string[];
}

export interface VisualRegressionResults {
  overallScore: number;
  componentComparisons: ComponentComparison[];
  layoutChanges: LayoutChange[];
  colorSchemeIssues: ColorIssue[];
  responsiveDesignIssues: ResponsiveIssue[];
}

export interface ComponentComparison {
  componentName: string;
  similarityScore: number;
  differences: string[];
  beforeImageUrl: string;
  afterImageUrl: string;
  diffImageUrl: string;
}

export interface LayoutChange {
  component: string;
  changeType: 'position' | 'size' | 'spacing' | 'alignment';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

export interface ColorIssue {
  component: string;
  issueType: 'contrast' | 'consistency' | 'accessibility';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ResponsiveIssue {
  viewport: string;
  component: string;
  issue: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface AccessibilityResults {
  overallScore: number;
  wcagCompliance: WCAGResult[];
  keyboardNavigation: KeyboardTestResult[];
  screenReaderCompatibility: ScreenReaderResult[];
  colorContrastIssues: ContrastIssue[];
}

export interface WCAGResult {
  rule: string;
  level: 'A' | 'AA' | 'AAA';
  status: 'pass' | 'fail' | 'warning';
  affectedElements: number;
  description: string;
}

export interface KeyboardTestResult {
  component: string;
  focusManagement: boolean;
  tabOrder: boolean;
  keyboardShortcuts: boolean;
  issues: string[];
}

export interface ScreenReaderResult {
  component: string;
  ariaLabels: boolean;
  semanticStructure: boolean;
  announcements: boolean;
  issues: string[];
}

export interface ContrastIssue {
  element: string;
  foregroundColor: string;
  backgroundColor: string;
  ratio: number;
  requiredRatio: number;
  status: 'fail' | 'warning';
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  upgradeReadiness: number;
}

export interface RiskFactor {
  category: string;
  risk: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface AOMAKnowledgeReference {
  documentId: string;
  title: string;
  relevance: number;
  summary: string;
  url?: string;
}

export interface ScreenshotEvidence {
  title: string;
  description: string;
  url: string;
  category: string;
  timestamp: Date;
  metadata?: any;
}

export interface Chart {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any;
  description: string;
}

export interface ComparisonData {
  metric: string;
  before: number;
  after: number;
  change: number;
  significance: string;
}

export interface VideoEvidence {
  title: string;
  description: string;
  url: string;
  duration: number;
  thumbnail?: string;
}

// Database interfaces (matching Supabase schema)
export interface TestRunDB {
  id: string;
  run_name: string;
  jira_version: string;
  test_suite: string;
  environment: string;
  status: string;
  started_at: string;
  completed_at?: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  browser_info: any;
  test_config: any;
  ai_summary?: string;
  risk_score?: number;
  overall_score?: number;
  recommendations?: string[];
  created_by: string;
  metadata?: any;
}

export interface PerformanceMetricsDB {
  id: string;
  test_run_id: string;
  page_url: string;
  page_title?: string;
  test_type: string;
  component_name?: string;
  lcp_score?: number;
  fid_score?: number;
  cls_score?: number;
  fcp_score?: number;
  ttfb_score?: number;
  page_load_time?: number;
  dom_content_loaded?: number;
  network_requests_count?: number;
  total_page_size_kb?: number;
  js_bundle_size_kb?: number;
  css_size_kb?: number;
  image_size_kb?: number;
  js_errors?: string[];
  console_warnings?: string[];
  console_errors?: string[];
  network_failures?: string[];
  screenshot_s3_url?: string;
  ui_theme?: string;
  visual_regression_score?: number;
  accessibility_score?: number;
  browser_info: any;
  viewport_size: any;
  user_agent: string;
  timestamp: string;
  test_duration_ms?: number;
}
