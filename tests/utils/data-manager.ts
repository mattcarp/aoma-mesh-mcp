import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Enterprise Data Manager for JIRA 10.3.6 Testing
 * 
 * Handles:
 * - Loading and processing ITSM/DPSA ticket data
 * - Generating test datasets
 * - Data-driven test preparation
 * - Test data validation and cleanup
 */

export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  priority: string;
  project: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
  issueType: string;
  components?: string[];
  labels?: string[];
  customFields?: Record<string, any>;
}

export interface TestDataSet {
  itsm: JiraTicket[];
  dpsa: JiraTicket[];
  combined: JiraTicket[];
  stats: {
    totalTickets: number;
    itsmCount: number;
    dpsaCount: number;
    statusDistribution: Record<string, number>;
    priorityDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
  };
}

export class DataManager {
  private static readonly DATA_DIR = 'tests/data/generated';
  private static readonly PROCESSED_DATA_FILE = 'tests/data/generated/test-dataset.json';
  
  private testDataSet: TestDataSet | null = null;
  
  async prepareTestData(): Promise<void> {
    console.log('📊 Preparing comprehensive test data from ITSM/DPSA tickets...');
    
    try {
      // Ensure data directory exists
      await mkdir(DataManager.DATA_DIR, { recursive: true });
      
      // Load existing ticket data files
      const itsmTickets = await this.loadTicketData('all-dpsa-tickets.json', 'ITSM');
      const dpsaTickets = await this.loadTicketData('all-dpsa-tickets.json', 'DPSA');
      
      // Process and prepare test datasets
      this.testDataSet = await this.processTicketData(itsmTickets, dpsaTickets);
      
      // Generate specialized test datasets
      await this.generateTestDatasets();
      
      // Save processed data
      await this.saveProcessedData();
      
      console.log(`✅ Test data prepared: ${this.testDataSet.stats.totalTickets} tickets processed`);
      
    } catch (error) {
      console.error('❌ Failed to prepare test data:', error);
      throw error;
    }
  }
  
  private async loadTicketData(filename: string, projectFilter?: string): Promise<JiraTicket[]> {
    try {
      // Try to load from root directory first (where the actual data files are)
      let ticketData: any;
      
      if (existsSync(filename)) {
        const rawData = await readFile(filename, 'utf-8');
        ticketData = JSON.parse(rawData);
      } else {
        console.warn(`⚠️ ${filename} not found, generating mock data`);
        return this.generateMockTicketData(projectFilter || 'UNKNOWN');
      }
      
      // Convert to standardized format
      const tickets: JiraTicket[] = [];
      
      if (Array.isArray(ticketData)) {
        for (const item of ticketData) {
          const ticket = this.normalizeTicketData(item, projectFilter);
          if (ticket) tickets.push(ticket);
        }
      } else if (ticketData.issues && Array.isArray(ticketData.issues)) {
        for (const issue of ticketData.issues) {
          const ticket = this.normalizeTicketData(issue, projectFilter);
          if (ticket) tickets.push(ticket);
        }
      }
      
      // Filter by project if specified
      const filteredTickets = projectFilter 
        ? tickets.filter(t => t.project.toUpperCase().includes(projectFilter.toUpperCase()))
        : tickets;
      
      console.log(`📋 Loaded ${filteredTickets.length} ${projectFilter || 'total'} tickets`);
      return filteredTickets;
      
    } catch (error) {
      console.warn(`⚠️ Could not load ${filename}, generating mock data:`, error);
      return this.generateMockTicketData(projectFilter || 'UNKNOWN');
    }
  }
  
  private normalizeTicketData(rawTicket: any, projectFilter?: string): JiraTicket | null {
    try {
      // Handle different data formats from various JIRA exports
      const fields = rawTicket.fields || rawTicket;
      
      const ticket: JiraTicket = {
        id: rawTicket.id || rawTicket.key || `MOCK-${Date.now()}`,
        key: rawTicket.key || `${projectFilter || 'TEST'}-${Math.floor(Math.random() * 1000)}`,
        summary: fields.summary || rawTicket.summary || 'Test ticket summary',
        description: fields.description?.content?.[0]?.content?.[0]?.text || fields.description || 'Test description',
        status: fields.status?.name || fields.status || 'Open',
        priority: fields.priority?.name || fields.priority || 'Medium',
        project: fields.project?.key || projectFilter || 'TEST',
        assignee: fields.assignee?.displayName || fields.assignee?.name || null,
        reporter: fields.reporter?.displayName || fields.reporter?.name || 'Test Reporter',
        created: fields.created || new Date().toISOString(),
        updated: fields.updated || new Date().toISOString(),
        issueType: fields.issuetype?.name || fields.issueType || 'Task',
        components: fields.components?.map((c: any) => c.name) || [],
        labels: fields.labels || [],
        customFields: this.extractCustomFields(fields)
      };
      
      return ticket;
      
    } catch (error) {
      console.warn('⚠️ Could not normalize ticket data:', error);
      return null;
    }
  }
  
  private extractCustomFields(fields: any): Record<string, any> {
    const customFields: Record<string, any> = {};
    
    // Extract custom fields (usually have "customfield_" prefix)
    for (const [key, value] of Object.entries(fields)) {
      if (key.startsWith('customfield_')) {
        customFields[key] = value;
      }
    }
    
    return customFields;
  }
  
  private generateMockTicketData(project: string): JiraTicket[] {
    console.log(`📝 Generating mock ${project} ticket data for testing...`);
    
    const mockTickets: JiraTicket[] = [];
    const statuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened'];
    const priorities = ['Critical', 'High', 'Medium', 'Low'];
    const types = ['Bug', 'Task', 'Story', 'Epic', 'Improvement'];
    
    // Generate diverse mock data
    for (let i = 1; i <= 50; i++) {
      mockTickets.push({
        id: `mock-${project.toLowerCase()}-${i}`,
        key: `${project}-${i}`,
        summary: `${project} Test Ticket ${i}`,
        description: `Mock description for ${project} testing purposes`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        project: project,
        assignee: `testuser${i % 5 + 1}@company.com`,
        reporter: 'test.reporter@company.com',
        created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        issueType: types[Math.floor(Math.random() * types.length)],
        components: [`${project} Component`],
        labels: [`test-${project.toLowerCase()}`, 'automated-testing'],
        customFields: {
          'customfield_10001': `Custom value for ${project}`,
          'customfield_10002': Math.floor(Math.random() * 100)
        }
      });
    }
    
    return mockTickets;
  }
  
  private async processTicketData(itsmTickets: JiraTicket[], dpsaTickets: JiraTicket[]): Promise<TestDataSet> {
    const combined = [...itsmTickets, ...dpsaTickets];
    
    // Calculate statistics
    const stats = {
      totalTickets: combined.length,
      itsmCount: itsmTickets.length,
      dpsaCount: dpsaTickets.length,
      statusDistribution: this.calculateDistribution(combined, 'status'),
      priorityDistribution: this.calculateDistribution(combined, 'priority'),
      typeDistribution: this.calculateDistribution(combined, 'issueType')
    };
    
    return {
      itsm: itsmTickets,
      dpsa: dpsaTickets,
      combined,
      stats
    };
  }
  
  private calculateDistribution(tickets: JiraTicket[], field: keyof JiraTicket): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const ticket of tickets) {
      const value = String(ticket[field]);
      distribution[value] = (distribution[value] || 0) + 1;
    }
    
    return distribution;
  }
  
  private async generateTestDatasets(): Promise<void> {
    if (!this.testDataSet) return;
    
    // Generate various test datasets for different test scenarios
    const datasets = {
      // High priority tickets for critical path testing
      highPriority: this.testDataSet.combined.filter(t => 
        t.priority === 'Critical' || t.priority === 'High'
      ),
      
      // Recent tickets for UI testing
      recentTickets: this.testDataSet.combined
        .filter(t => new Date(t.updated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .slice(0, 20),
      
      // Diverse status tickets for workflow testing
      statusSamples: this.generateStatusSamples(),
      
      // Complex tickets with custom fields for advanced testing
      complexTickets: this.testDataSet.combined
        .filter(t => Object.keys(t.customFields || {}).length > 0)
        .slice(0, 15),
        
      // Performance testing dataset (larger subset)
      performanceDataset: this.testDataSet.combined.slice(0, 100)
    };
    
    // Save individual datasets
    for (const [name, data] of Object.entries(datasets)) {
      await writeFile(
        `${DataManager.DATA_DIR}/${name}.json`,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
    }
    
    console.log('📋 Generated specialized test datasets');
  }
  
  private generateStatusSamples(): JiraTicket[] {
    if (!this.testDataSet) return [];
    
    const statusGroups: Record<string, JiraTicket[]> = {};
    
    // Group tickets by status
    for (const ticket of this.testDataSet.combined) {
      if (!statusGroups[ticket.status]) {
        statusGroups[ticket.status] = [];
      }
      statusGroups[ticket.status].push(ticket);
    }
    
    // Take samples from each status
    const samples: JiraTicket[] = [];
    for (const tickets of Object.values(statusGroups)) {
      samples.push(...tickets.slice(0, 3)); // Take 3 from each status
    }
    
    return samples;
  }
  
  private async saveProcessedData(): Promise<void> {
    if (!this.testDataSet) return;
    
    await writeFile(
      DataManager.PROCESSED_DATA_FILE,
      JSON.stringify(this.testDataSet, null, 2),
      'utf-8'
    );
  }
  
  async getTestDataCount(): Promise<number> {
    if (this.testDataSet) {
      return this.testDataSet.stats.totalTickets;
    }
    
    try {
      if (existsSync(DataManager.PROCESSED_DATA_FILE)) {
        const data = JSON.parse(await readFile(DataManager.PROCESSED_DATA_FILE, 'utf-8'));
        return data.stats?.totalTickets || 0;
      }
    } catch (error) {
      console.warn('Could not get test data count:', error);
    }
    
    return 0;
  }
  
  async getTestDataSet(): Promise<TestDataSet | null> {
    if (this.testDataSet) {
      return this.testDataSet;
    }
    
    try {
      if (existsSync(DataManager.PROCESSED_DATA_FILE)) {
        const data = JSON.parse(await readFile(DataManager.PROCESSED_DATA_FILE, 'utf-8'));
        this.testDataSet = data;
        return data;
      }
    } catch (error) {
      console.warn('Could not load test dataset:', error);
    }
    
    return null;
  }
  
  // Utility methods for tests
  getRandomTicket(project?: string): JiraTicket | null {
    if (!this.testDataSet) return null;
    
    const tickets = project 
      ? this.testDataSet.combined.filter(t => t.project === project)
      : this.testDataSet.combined;
      
    return tickets[Math.floor(Math.random() * tickets.length)] || null;
  }
  
  getTicketsByStatus(status: string): JiraTicket[] {
    if (!this.testDataSet) return [];
    return this.testDataSet.combined.filter(t => t.status === status);
  }
  
  getTicketsByPriority(priority: string): JiraTicket[] {
    if (!this.testDataSet) return [];
    return this.testDataSet.combined.filter(t => t.priority === priority);
  }
} 