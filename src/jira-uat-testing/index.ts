// JIRA UAT Testing Framework
// Comprehensive AI-assisted testing for JIRA 10.3.6 upgrade

export * from './test-runner';
export * from './performance-monitor';
export * from './screenshot-manager';
export * from './ai-analyzer';
export * from './report-generator';
export * from './types';

// Main entry point for UAT testing
import { JIRATestRunner } from './test-runner';
import { TestConfig } from './types';

export async function runJIRAUATTests(config: TestConfig): Promise<string> {
  const runner = new JIRATestRunner(config);
  const testRunId = await runner.execute();
  return testRunId;
}

// Quick test execution with default config
export async function quickUATTest(): Promise<string> {
  const config: TestConfig = {
    environment: 'UAT',
    jiraVersion: '10.3.6',
    testSuites: ['theme', 'performance', 'functional'],
    themes: ['light', 'dark'],
    browsers: ['chromium'],
    parallel: false,
    s3Config: {
      bucket: process.env.S3_BUCKET || 'jira-uat-screenshots',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    supabaseConfig: {
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    aomaServerUrl: process.env.AOMA_SERVER_URL || 'http://localhost:3000',
  };

  return runJIRAUATTests(config);
}
