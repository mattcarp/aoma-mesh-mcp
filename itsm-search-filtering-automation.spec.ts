import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import { ITSMStrategicTester } from './itsm-strategic-testing-framework.spec';

// ITSM Search & Filtering Automation Framework
// Task 3.2: Comprehensive testing of 65,689 ITSM tickets exploration

interface SearchTestResult {
  query: string;
  jql: string;
  resultCount: number;
  loadTime: number;
  performancePass: boolean;
  timestamp: string;
  errorOccurred: boolean;
  searchType: 'basic' | 'advanced' | 'jql' | 'filter';
}

interface FilterTestConfig {
  name: string;
  filterType: 'status' | 'assignee' | 'priority' | 'component' | 'version' | 'labels';
  values: string[];
  expectedResultRange?: { min: number; max: number };
}

class ITSMSearchFilteringTester extends ITSMStrategicTester {
  private searchResults: SearchTestResult[] = [];
  private itsmProjectKey = 'ITSM';
  private totalTicketCount = 65689; // Known ITSM ticket count
  
  constructor() {
    super();
    this.ensureSearchDirectories();
  }

  private ensureSearchDirectories() {
    const dirs = ['search-results', 'jql-queries', 'filter-tests'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async testBasicSearch(page: Page, searchTerm: string): Promise<SearchTestResult> {
    console.log(`🔍 Testing basic search: "${searchTerm}"`);
    
    const startTime = Date.now();
    let resultCount = 0;
    let errorOccurred = false;

    try {
      // Navigate to issue navigator
      await page.goto('https://jirauat.smedigitalapps.com/jira/issues/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Click on basic search if in advanced mode
      const basicSearchBtn = page.locator('text=Basic');
      if (await basicSearchBtn.isVisible()) {
        await basicSearchBtn.click();
        await page.waitForTimeout(1000);
      }

      // Find and fill search box
      const searchBox = page.locator('#searcher-query, #quickSearchInput, input[name="searcherValue"]').first();
      await searchBox.fill(searchTerm);
      await searchBox.press('Enter');

      // Wait for results
      await page.waitForLoadState('networkidle');
      
      // Get result count
      const resultCountElement = page.locator('.results-count, .issue-count, .showing');
      if (await resultCountElement.isVisible()) {
        const countText = await resultCountElement.textContent();
        const matches = countText?.match(/(\d+)/);
        if (matches) {
          resultCount = parseInt(matches[1]);
        }
      }

      // Take screenshot
      await page.screenshot({
        path: `search-results/basic-search-${searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.png`,
        fullPage: true
      });

    } catch (error) {
      console.error(`❌ Basic search failed for "${searchTerm}":`, error);
      errorOccurred = true;
    }

    const loadTime = Date.now() - startTime;
    const result: SearchTestResult = {
      query: searchTerm,
      jql: `text ~ "${searchTerm}"`,
      resultCount,
      loadTime,
      performancePass: loadTime < 10000,
      timestamp: new Date().toISOString(),
      errorOccurred,
      searchType: 'basic'
    };

    this.searchResults.push(result);
    return result;
  }

  async testJQLQuery(page: Page, jqlQuery: string, description: string): Promise<SearchTestResult> {
    console.log(`🔍 Testing JQL: ${description}`);
    console.log(`   Query: ${jqlQuery}`);
    
    const startTime = Date.now();
    let resultCount = 0;
    let errorOccurred = false;

    try {
      // Navigate to issue navigator
      await page.goto('https://jirauat.smedigitalapps.com/jira/issues/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Switch to advanced search (JQL)
      const advancedBtn = page.locator('text=Advanced, #advanced-search, .advanced-search-trigger');
      if (await advancedBtn.isVisible()) {
        await advancedBtn.click();
        await page.waitForTimeout(1000);
      }

      // Find JQL editor and input query
      const jqlEditor = page.locator('#advanced-search, .jql-editor, textarea[name="jqlQuery"]').first();
      await jqlEditor.fill(jqlQuery);
      
      // Submit query
      const searchBtn = page.locator('button:has-text("Search"), input[value="Search"], .search-button').first();
      await searchBtn.click();

      // Wait for results
      await page.waitForLoadState('networkidle');
      
      // Get result count from multiple possible locations
      const countSelectors = [
        '.results-count',
        '.issue-count', 
        '.showing',
        '.results-count-total',
        '[data-testid="issue-count"]'
      ];

      for (const selector of countSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          const countText = await element.textContent();
          const matches = countText?.match(/(\d+(?:,\d+)*)/);
          if (matches) {
            resultCount = parseInt(matches[1].replace(/,/g, ''));
            break;
          }
        }
      }

      // Take screenshot
      await page.screenshot({
        path: `jql-queries/jql-${description.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.png`,
        fullPage: true
      });

    } catch (error) {
      console.error(`❌ JQL query failed for "${description}":`, error);
      errorOccurred = true;
    }

    const loadTime = Date.now() - startTime;
    const result: SearchTestResult = {
      query: description,
      jql: jqlQuery,
      resultCount,
      loadTime,
      performancePass: loadTime < 10000,
      timestamp: new Date().toISOString(),
      errorOccurred,
      searchType: 'jql'
    };

    this.searchResults.push(result);
    return result;
  }

  async testFilterOptions(page: Page, filterConfig: FilterTestConfig): Promise<SearchTestResult[]> {
    console.log(`🎛️ Testing filter: ${filterConfig.name} (${filterConfig.filterType})`);
    
    const results: SearchTestResult[] = [];

    try {
      // Navigate to ITSM project issues
      await page.goto(`https://jirauat.smedigitalapps.com/jira/projects/${this.itsmProjectKey}/issues`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      for (const value of filterConfig.values) {
        const startTime = Date.now();
        let resultCount = 0;
        let errorOccurred = false;

        try {
          console.log(`  Testing ${filterConfig.filterType}: ${value}`);

          // Find and interact with filter based on type
          switch (filterConfig.filterType) {
            case 'status':
              const statusFilter = page.locator('[data-testid="status-filter"], .status-filter, #status-filter');
              if (await statusFilter.isVisible()) {
                await statusFilter.click();
                await page.locator(`text="${value}"`).click();
              }
              break;

            case 'assignee':
              const assigneeFilter = page.locator('[data-testid="assignee-filter"], .assignee-filter, #assignee-filter');
              if (await assigneeFilter.isVisible()) {
                await assigneeFilter.click();
                await page.locator(`text="${value}"`).click();
              }
              break;

            case 'priority':
              const priorityFilter = page.locator('[data-testid="priority-filter"], .priority-filter, #priority-filter');
              if (await priorityFilter.isVisible()) {
                await priorityFilter.click();
                await page.locator(`text="${value}"`).click();
              }
              break;
          }

          // Wait for filter to apply
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          // Get filtered result count
          const resultElement = page.locator('.results-count, .issue-count, .showing, [data-testid="issue-count"]');
          if (await resultElement.isVisible()) {
            const countText = await resultElement.textContent();
            const matches = countText?.match(/(\d+(?:,\d+)*)/);
            if (matches) {
              resultCount = parseInt(matches[1].replace(/,/g, ''));
            }
          }

          // Take screenshot
          await page.screenshot({
            path: `filter-tests/${filterConfig.filterType}-${value.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.png`,
            fullPage: true
          });

        } catch (error) {
          console.error(`❌ Filter test failed for ${filterConfig.filterType}=${value}:`, error);
          errorOccurred = true;
        }

        const loadTime = Date.now() - startTime;
        const result: SearchTestResult = {
          query: `${filterConfig.filterType}=${value}`,
          jql: `project = ${this.itsmProjectKey} AND ${filterConfig.filterType} = "${value}"`,
          resultCount,
          loadTime,
          performancePass: loadTime < 10000,
          timestamp: new Date().toISOString(),
          errorOccurred,
          searchType: 'filter'
        };

        results.push(result);
        this.searchResults.push(result);

        // Clear filter for next test
        const clearFilters = page.locator('.clear-filters, [data-testid="clear-filters"]').or(page.locator('text=Clear'));
        if (await clearFilters.first().isVisible()) {
          await clearFilters.first().click();
          await page.waitForTimeout(1000);
        }
      }

    } catch (error) {
      console.error(`❌ Filter testing failed for ${filterConfig.name}:`, error);
    }

    return results;
  }

  async generateSearchReport(): Promise<void> {
    const report = {
      summary: {
        totalSearches: this.searchResults.length,
        averageLoadTime: this.searchResults.reduce((sum, r) => sum + r.loadTime, 0) / this.searchResults.length,
        performancePassed: this.searchResults.filter(r => r.performancePass).length,
        errorCount: this.searchResults.filter(r => r.errorOccurred).length,
        totalTicketsFound: this.searchResults.reduce((sum, r) => sum + r.resultCount, 0),
        searchTypes: {
          basic: this.searchResults.filter(r => r.searchType === 'basic').length,
          jql: this.searchResults.filter(r => r.searchType === 'jql').length,
          filter: this.searchResults.filter(r => r.searchType === 'filter').length
        }
      },
      searchResults: this.searchResults,
      itsmProjectAnalysis: {
        totalKnownTickets: this.totalTicketCount,
        searchCoverage: (this.searchResults.reduce((sum, r) => sum + r.resultCount, 0) / this.totalTicketCount * 100).toFixed(2) + '%'
      },
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      `search-results/itsm-search-automation-report-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );

    console.log('📊 Search automation report saved');
    console.log(`📈 Summary: ${report.summary.totalSearches} searches, ${report.summary.averageLoadTime.toFixed(0)}ms avg`);
  }
}

// Comprehensive Test Suite
test.describe('ITSM Search & Filtering Automation - Task 3.2', () => {
  let searchTester: ITSMSearchFilteringTester;

  test.beforeEach(async () => {
    searchTester = new ITSMSearchFilteringTester();
  });

  test('Verify ITSM Authentication and Access', async ({ browser }) => {
    const context = await searchTester.setupContext(browser);
    const page = await context.newPage();

    // Quick auth verification
    await page.goto('https://jirauat.smedigitalapps.com/jira/projects/ITSM');
    await expect(page).toHaveTitle(/ITSM/);
    console.log('✅ ITSM project access verified');

    await context.close();
  });

  test('Basic Search Functionality', async ({ browser }) => {
    const context = await searchTester.setupContext(browser);
    const page = await context.newPage();

    // Test basic search terms relevant to ITSM
    const searchTerms = [
      'bug',
      'incident', 
      'service request',
      'priority high',
      'status open'
    ];

    for (const term of searchTerms) {
      const result = await searchTester.testBasicSearch(page, term);
      expect(result.performancePass).toBe(true);
      console.log(`🔍 "${term}": ${result.resultCount} results in ${result.loadTime}ms`);
    }

    await context.close();
  });

  test('Advanced JQL Queries', async ({ browser }) => {
    const context = await searchTester.setupContext(browser);
    const page = await context.newPage();

    // ITSM-specific JQL queries
    const jqlTests = [
      {
        jql: `project = ITSM`,
        description: 'All ITSM tickets'
      },
      {
        jql: `project = ITSM AND status = "Open"`,
        description: 'Open ITSM tickets'
      },
      {
        jql: `project = ITSM AND priority = "High"`,
        description: 'High priority ITSM tickets'
      },
      {
        jql: `project = ITSM AND created >= -30d`,
        description: 'ITSM tickets created in last 30 days'
      },
      {
        jql: `project = ITSM AND assignee = currentUser()`,
        description: 'My assigned ITSM tickets'
      },
      {
        jql: `project = ITSM AND text ~ "incident" ORDER BY created DESC`,
        description: 'ITSM incident tickets (newest first)'
      }
    ];

    for (const jqlTest of jqlTests) {
      const result = await searchTester.testJQLQuery(page, jqlTest.jql, jqlTest.description);
      expect(result.performancePass).toBe(true);
      console.log(`📋 ${jqlTest.description}: ${result.resultCount} results in ${result.loadTime}ms`);
    }

    await context.close();
  });

  test('Filter Testing', async ({ browser }) => {
    const context = await searchTester.setupContext(browser);
    const page = await context.newPage();

    // Test common ITSM filters
    const filterConfigs: FilterTestConfig[] = [
      {
        name: 'Status Filters',
        filterType: 'status',
        values: ['Open', 'In Progress', 'Resolved', 'Closed']
      },
      {
        name: 'Priority Filters', 
        filterType: 'priority',
        values: ['Highest', 'High', 'Medium', 'Low', 'Lowest']
      }
    ];

    for (const filterConfig of filterConfigs) {
      const results = await searchTester.testFilterOptions(page, filterConfig);
      
      for (const result of results) {
        expect(result.performancePass).toBe(true);
        console.log(`🎛️ ${result.query}: ${result.resultCount} results in ${result.loadTime}ms`);
      }
    }

    await context.close();
  });

  test.afterEach(async () => {
    if (searchTester) {
      await searchTester.generateSearchReport();
    }
  });
});

export { ITSMSearchFilteringTester, SearchTestResult, FilterTestConfig }; 