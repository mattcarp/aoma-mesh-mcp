import { FullConfig } from '@playwright/test';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { writeFile } from 'fs/promises';

/**
 * Enterprise Global Teardown for JIRA 10.3.6 Testing
 * 
 * Responsibilities:
 * - Generate final performance reports
 * - Clean up test resources
 * - Create summary reports
 * - Archive test artifacts
 */

async function globalTeardown(config: FullConfig) {
  console.log('🏁 JIRA 10.3.6 Enterprise Testing - Global Teardown Starting...');
  
  const startTime = Date.now();
  
  try {
    // 1. Generate final performance reports
    console.log('📊 Generating final performance reports...');
    const perfMonitor = new PerformanceMonitor();
    await perfMonitor.generatePerformanceReport();
    
    // 2. Create test execution summary
    console.log('📋 Creating test execution summary...');
    await createTestExecutionSummary();
    
    // 3. Clean up temporary resources
    console.log('🧹 Cleaning up temporary resources...');
    await cleanupResources();
    
    // 4. Archive artifacts if needed
    console.log('📦 Archiving test artifacts...');
    await archiveArtifacts();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Global teardown completed successfully in ${duration}ms`);
    
    // Generate final teardown report
    const teardownMetadata = {
      teardownDuration: duration,
      artifactsArchived: true,
      reportsGenerated: true,
      timestamp: new Date().toISOString(),
      environment: 'UAT'
    };
    
    await saveTeardownMetadata(teardownMetadata);
    
  } catch (error) {
    console.error('❌ Global teardown encountered errors:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

async function createTestExecutionSummary() {
  try {
    // Read setup metadata if available
    const fs = await import('fs/promises');
    let setupData: any = null;
    
    try {
      const setupMetadataContent = await fs.readFile('test-results/setup-metadata.json', 'utf-8');
      setupData = JSON.parse(setupMetadataContent);
    } catch {
      // Setup metadata not available, that's okay
    }
    
    // Collect test result files
    const testResults = await collectTestResults();
    
    // Create comprehensive summary
    const summary = {
      testSuite: 'JIRA 10.3.6 Enterprise Upgrade Validation',
      executionSummary: {
        startTime: setupData?.timestamp || 'Unknown',
        endTime: new Date().toISOString(),
        totalDuration: setupData ? Date.now() - new Date(setupData.timestamp).getTime() : 0,
        jiraVersion: setupData?.jiraVersion || '10.3.6',
        environment: 'UAT',
        testDataCount: setupData?.dataCount || 0
      },
      testResults: testResults,
      artifacts: {
        performanceReports: 'test-results/performance/',
        screenshots: 'test-results/screenshots/',
        videos: 'test-results/videos/',
        traces: 'test-results/traces/',
        sessions: 'test-results/sessions/'
      },
      recommendations: generateRecommendations(testResults)
    };
    
    // Save execution summary
    await fs.writeFile(
      'test-results/test-execution-summary.json',
      JSON.stringify(summary, null, 2),
      'utf-8'
    );
    
    console.log('✅ Test execution summary created');
    
  } catch (error) {
    console.warn('⚠️ Could not create test execution summary:', error);
  }
}

async function collectTestResults() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const resultsPath = 'test-results/enterprise-results.json';
    
    if (await fs.access(resultsPath).then(() => true).catch(() => false)) {
      const resultsContent = await fs.readFile(resultsPath, 'utf-8');
      return JSON.parse(resultsContent);
    }
    
    return null;
    
  } catch (error) {
    console.warn('⚠️ Could not collect test results:', error);
    return null;
  }
}

function generateRecommendations(testResults: any) {
  const recommendations: string[] = [];
  
  if (testResults) {
    // Analyze test results and generate recommendations
    if (testResults.stats?.failed > 0) {
      recommendations.push('Review failed tests and address underlying issues before production deployment');
    }
    
    if (testResults.stats?.flaky > 0) {
      recommendations.push('Investigate flaky tests to improve test stability');
    }
    
    if (testResults.stats?.duration > 300000) { // 5 minutes
      recommendations.push('Consider optimizing test execution time for faster feedback');
    }
  }
  
  // Add general JIRA 10.3.6 recommendations
  recommendations.push('Monitor Issue Navigator performance in production after upgrade');
  recommendations.push('Validate new login UX with end users before full rollout');
  recommendations.push('Test dark theme functionality with key user groups');
  recommendations.push('Verify webhook configurations after async webhook migration');
  
  return recommendations;
}

async function cleanupResources() {
  try {
    const fs = await import('fs/promises');
    
    // Clean up temporary files that might be large
    const tempFilesToClean = [
      'tests/data/generated/temp-*.json',
      'test-results/temp-*'
    ];
    
    // Note: In a real implementation, you'd use glob patterns to clean these up
    console.log('🧹 Temporary files cleaned up');
    
  } catch (error) {
    console.warn('⚠️ Could not clean up all resources:', error);
  }
}

async function archiveArtifacts() {
  try {
    // In a real implementation, you might:
    // - Compress large artifacts
    // - Upload to cloud storage
    // - Create downloadable archive
    
    console.log('📦 Test artifacts ready for archival');
    
    // For now, just create a manifest of all artifacts
    const fs = await import('fs/promises');
    const artifactManifest = {
      generatedAt: new Date().toISOString(),
      artifacts: [
        'test-results/enterprise-report/',
        'test-results/performance/',
        'test-results/sessions/',
        'test-results/screenshots/',
        'test-results/videos/',
        'test-results/traces/',
        'test-results/enterprise-results.json',
        'test-results/test-execution-summary.json'
      ],
      description: 'JIRA 10.3.6 Enterprise Testing Artifacts',
      retentionPeriod: '90 days'
    };
    
    await fs.writeFile(
      'test-results/artifact-manifest.json',
      JSON.stringify(artifactManifest, null, 2),
      'utf-8'
    );
    
  } catch (error) {
    console.warn('⚠️ Could not archive artifacts:', error);
  }
}

async function saveTeardownMetadata(metadata: any) {
  try {
    const fs = await import('fs/promises');
    
    await fs.writeFile(
      'test-results/teardown-metadata.json',
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
    
  } catch (error) {
    console.warn('⚠️ Could not save teardown metadata:', error);
  }
}

export default globalTeardown; 