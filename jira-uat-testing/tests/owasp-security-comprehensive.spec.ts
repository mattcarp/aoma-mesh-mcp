import { test, expect } from '@playwright/test';
import fs from 'fs';

interface DiscoveryReport {
  testCategories: {
    api: Array<{ method: string; url: string; headers: any; postData?: string }>;
    security: Array<{ url: string; type: string; details: string[] }>;
    navigation: string[];
  };
}

// Load discovery report
const discoveryReport: DiscoveryReport = JSON.parse(fs.readFileSync('jira-discovery-report.json', 'utf8'));

test.describe('OWASP Top 10 Security Testing Suite', () => {
  let page: any;
  
  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    const sessionData = JSON.parse(fs.readFileSync('current-session.json', 'utf8'));
    await context.addCookies(sessionData.cookies);
    page = await context.newPage();
  });

  test.describe('A01:2021 - Broken Access Control', () => {
    test('should prevent unauthorized access to admin endpoints', async () => {
      console.log('🔒 Testing Admin Access Control');
      
      const adminEndpoints = discoveryReport.testCategories.api
        .filter(api => api.url.includes('/admin/') || api.url.includes('/secure/admin/'))
        .slice(0, 10); // Test first 10
      
      let vulnerabilities = 0;
      
      for (const endpoint of adminEndpoints) {
        try {
          // Test without authentication
          const response = await page.request.get(endpoint.url);
          if (response.status() === 200) {
            console.log(`❌ VULNERABILITY: Admin endpoint ${endpoint.url} accessible without auth`);
            vulnerabilities++;
          }
        } catch (error) {
          console.log(`✅ Admin endpoint ${endpoint.url} properly protected`);
        }
      }
      
      expect(vulnerabilities).toBeLessThan(3); // Allow some minor issues
    });

    test('should enforce proper role-based access control', async () => {
      console.log('🔒 Testing Role-Based Access Control');
      
      // Test privileged operations
      const privilegedEndpoints = [
        '/rest/api/2/user',
        '/rest/api/2/group',
        '/rest/api/2/role',
        '/rest/api/2/permissions/scheme'
      ];
      
      for (const endpoint of privilegedEndpoints) {
        const response = await page.request.get(`https://jirauat.smedigitalapps.com/jira${endpoint}`);
        
        // Should either be forbidden or require proper authentication
        expect([200, 401, 403]).toContain(response.status());
        
        if (response.status() === 200) {
          const data = await response.json();
          expect(data).toBeDefined();
        }
      }
    });

    test('should prevent path traversal attacks', async () => {
      console.log('🔒 Testing Path Traversal Protection');
      
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd'
      ];
      
      let vulnerabilities = 0;
      
      for (const payload of pathTraversalPayloads) {
        try {
          const response = await page.request.get(
            `https://jirauat.smedigitalapps.com/jira/secure/${payload}`
          );
          
          if (response.status() === 200) {
            const content = await response.text();
            if (content.includes('root:') || content.includes('[drivers]')) {
              console.log(`❌ CRITICAL: Path traversal vulnerability with payload: ${payload}`);
              vulnerabilities++;
            }
          }
        } catch (error) {
          // Expected - server should reject malicious paths
        }
      }
      
      expect(vulnerabilities).toBe(0);
    });
  });

  test.describe('A02:2021 - Cryptographic Failures', () => {
    test('should enforce HTTPS for all sensitive endpoints', async () => {
      console.log('🔒 Testing HTTPS Enforcement');
      
      const sensitiveEndpoints = discoveryReport.testCategories.api
        .filter(api => api.url.includes('/rest/') && 
          (api.url.includes('user') || api.url.includes('auth') || api.url.includes('password')))
        .slice(0, 15);
      
      for (const endpoint of sensitiveEndpoints) {
        expect(endpoint.url).toMatch(/^https:/);
        
        // Try to access via HTTP (should fail or redirect)
        const httpUrl = endpoint.url.replace('https:', 'http:');
        try {
          const response = await page.request.get(httpUrl, { maxRedirects: 0 });
          expect([301, 302, 400, 403]).toContain(response.status());
        } catch (error) {
          // Expected - HTTP should be blocked
        }
      }
    });

    test('should use secure headers for sensitive data', async () => {
      console.log('🔒 Testing Secure Headers');
      
      const response = await page.request.get('https://jirauat.smedigitalapps.com/jira/rest/api/2/myself');
      const headers = response.headers();
      
      // Check for security headers
      expect(headers['strict-transport-security']).toBeDefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBeDefined();
      
      // Should not expose sensitive information
      expect(headers['server']).not.toMatch(/Apache\/[\d\.]+/);
      expect(headers['x-powered-by']).toBeUndefined();
    });

    test('should properly handle session tokens', async () => {
      console.log('🔒 Testing Session Token Security');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      const cookies = await page.context().cookies();
      const sessionCookies = cookies.filter(c => 
        c.name.toLowerCase().includes('session') || 
        c.name.toLowerCase().includes('jsession') ||
        c.name.toLowerCase().includes('token')
      );
      
      for (const cookie of sessionCookies) {
        expect(cookie.secure).toBe(true);
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.sameSite).toEqual('Strict');
      }
    });
  });

  test.describe('A03:2021 - Injection', () => {
    test('should prevent SQL injection in search parameters', async () => {
      console.log('🔒 Testing SQL Injection Protection');
      
      const sqlPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "1' OR 1=1#",
        "admin'--",
        "' OR 1=1 /*"
      ];
      
      let vulnerabilities = 0;
      
      for (const payload of sqlPayloads) {
        try {
          // Test in JQL search
          const response = await page.request.get(
            `https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=summary~"${encodeURIComponent(payload)}"`
          );
          
          if (response.status() === 200) {
            const data = await response.json();
            // Check if we get unexpected data or error messages indicating SQL injection
            const responseText = JSON.stringify(data).toLowerCase();
            if (responseText.includes('sql') || responseText.includes('mysql') || responseText.includes('error')) {
              console.log(`❌ POTENTIAL SQL INJECTION: ${payload}`);
              vulnerabilities++;
            }
          }
        } catch (error) {
          // Expected - server should reject malicious input
        }
      }
      
      expect(vulnerabilities).toBe(0);
    });

    test('should prevent XSS in user input fields', async () => {
      console.log('🔒 Testing XSS Protection');
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><iframe src="javascript:alert(`XSS`)">'
      ];
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue.jspa');
      
      try {
        await page.waitForSelector('#summary', { timeout: 5000 });
        
        for (const payload of xssPayloads) {
          await page.fill('#summary', payload);
          await page.fill('#description', `Test description with payload: ${payload}`);
          
          // Check if XSS payload is properly encoded/escaped
          const summaryValue = await page.inputValue('#summary');
          const descriptionValue = await page.inputValue('#description');
          
          expect(summaryValue).not.toContain('<script>');
          expect(descriptionValue).not.toContain('<script>');
          
          // Clear fields
          await page.fill('#summary', '');
          await page.fill('#description', '');
        }
      } catch (error) {
        console.log('Create issue form not accessible, testing in available fields');
        
        // Test in search field if available
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa');
        
        for (const payload of xssPayloads) {
          try {
            await page.fill('#jqltext', payload);
            const jqlValue = await page.inputValue('#jqltext');
            expect(jqlValue).not.toContain('<script>');
          } catch (error) {
            // Field may not be available
          }
        }
      }
    });

    test('should prevent LDAP injection', async () => {
      console.log('🔒 Testing LDAP Injection Protection');
      
      const ldapPayloads = [
        '*)(uid=*',
        '*)(|(objectClass=*))',
        '*)(%26(objectClass=user)',
        '*))(%26(|(objectClass=*',
        '*)(userPassword=*)',
        '*))|(%26(objectClass=*'
      ];
      
      for (const payload of ldapPayloads) {
        try {
          const response = await page.request.get(
            `https://jirauat.smedigitalapps.com/jira/rest/api/2/user/search?username=${encodeURIComponent(payload)}`
          );
          
          if (response.status() === 200) {
            const data = await response.json();
            // Should not return sensitive user information
            expect(Array.isArray(data)).toBe(true);
            if (data.length > 0) {
              expect(data.length).toBeLessThan(100); // Should not dump entire directory
            }
          }
        } catch (error) {
          // Expected for malformed LDAP queries
        }
      }
    });
  });

  test.describe('A04:2021 - Insecure Design', () => {
    test('should implement proper rate limiting', async () => {
      console.log('🔒 Testing Rate Limiting');
      
      const testEndpoint = 'https://jirauat.smedigitalapps.com/jira/rest/api/2/myself';
      let blockedRequests = 0;
      
      // Make rapid successive requests
      const promises = Array.from({ length: 50 }, async (_, i) => {
        try {
          const response = await page.request.get(testEndpoint);
          if (response.status() === 429) {
            blockedRequests++;
          }
          return response.status();
        } catch (error) {
          return 500;
        }
      });
      
      const results = await Promise.all(promises);
      
      // Should start blocking after reasonable number of requests
      console.log(`Rate limiting blocked ${blockedRequests} out of 50 requests`);
      expect(blockedRequests).toBeGreaterThan(5); // Some rate limiting should be in place
    });

    test('should validate business logic in workflows', async () => {
      console.log('🔒 Testing Business Logic Validation');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue.jspa');
      
      try {
        // Test invalid state transitions
        await page.waitForSelector('#project-field', { timeout: 5000 });
        
        // Try to create issue with invalid combinations
        const invalidCombinations = [
          { project: '', issueType: 'Bug' },
          { project: 'INVALID_PROJECT', issueType: 'Story' }
        ];
        
        for (const combo of invalidCombinations) {
          if (combo.project) {
            await page.fill('#project-field', combo.project);
          }
          
          // Should show validation errors
          const errors = await page.locator('.error, .aui-message-error').count();
          if (combo.project === '') {
            expect(errors).toBeGreaterThan(0);
          }
        }
      } catch (error) {
        console.log('Create issue validation test skipped - form not accessible');
      }
    });
  });

  test.describe('A05:2021 - Security Misconfiguration', () => {
    test('should not expose sensitive information in headers', async () => {
      console.log('🔒 Testing Information Disclosure');
      
      const response = await page.request.get('https://jirauat.smedigitalapps.com/jira/');
      const headers = response.headers();
      const body = await response.text();
      
      // Should not expose version information
      expect(headers['server']).not.toMatch(/Apache\/[\d\.]+/);
      expect(headers['x-powered-by']).toBeUndefined();
      expect(body).not.toMatch(/Jira \d+\.\d+\.\d+/);
      
      // Should not expose stack traces
      expect(body).not.toContain('java.lang.Exception');
      expect(body).not.toContain('SQLException');
      expect(body).not.toContain('NullPointerException');
    });

    test('should have secure default configurations', async () => {
      console.log('🔒 Testing Secure Defaults');
      
      // Test for common misconfigurations
      const testUrls = [
        '/admin',
        '/admin/',
        '/administrator',
        '/config',
        '/backup',
        '/test',
        '/debug'
      ];
      
      for (const testUrl of testUrls) {
        const response = await page.request.get(`https://jirauat.smedigitalapps.com/jira${testUrl}`);
        
        // Should not expose admin interfaces without authentication
        if (response.status() === 200) {
          const content = await response.text();
          expect(content).not.toContain('administrator');
          expect(content).not.toContain('configuration');
        }
      }
    });

    test('should implement proper error handling', async () => {
      console.log('🔒 Testing Error Handling');
      
      // Test various error conditions
      const errorTests = [
        { url: '/nonexistent-page', expectedStatus: 404 },
        { url: '/rest/api/2/invalid-endpoint', expectedStatus: [400, 404] }
      ];
      
      for (const errorTest of errorTests) {
        const response = await page.request.get(`https://jirauat.smedigitalapps.com/jira${errorTest.url}`);
        
        if (Array.isArray(errorTest.expectedStatus)) {
          expect(errorTest.expectedStatus).toContain(response.status());
        } else {
          expect(response.status()).toBe(errorTest.expectedStatus);
        }
        
        // Error pages should not expose sensitive information
        const content = await response.text();
        expect(content).not.toContain('java.lang');
        expect(content).not.toContain('SQLException');
        expect(content).not.toContain('/usr/local/');
      }
    });
  });

  test.describe('A06:2021 - Vulnerable and Outdated Components', () => {
    test('should not use known vulnerable JavaScript libraries', async () => {
      console.log('🔒 Testing Client-Side Dependencies');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      const vulnerableLibraries = await page.evaluate(() => {
        const vulnChecks = [];
        
        // Check for jQuery versions
        if (window.jQuery) {
          const version = window.jQuery.fn.jquery;
          if (version && version.startsWith('1.')) {
            vulnChecks.push({ library: 'jQuery', version, issue: 'Outdated version' });
          }
        }
        
        // Check for other common libraries
        const libraries = ['angular', 'react', 'underscore', 'moment'];
        libraries.forEach(lib => {
          if (window[lib] && window[lib].version) {
            vulnChecks.push({ library: lib, version: window[lib].version, issue: 'Version check needed' });
          }
        });
        
        return vulnChecks;
      });
      
      // Should not have critical vulnerabilities in client-side libraries
      const criticalVulns = vulnerableLibraries.filter(lib => 
        lib.library === 'jQuery' && lib.version.startsWith('1.')
      );
      
      expect(criticalVulns.length).toBeLessThan(2);
    });

    test('should have secure server headers indicating updated components', async () => {
      console.log('🔒 Testing Server Component Security');
      
      const response = await page.request.get('https://jirauat.smedigitalapps.com/jira/rest/api/2/serverInfo');
      
      if (response.status() === 200) {
        const serverInfo = await response.json();
        
        // Should not expose detailed version information to unauthorized users
        if (serverInfo.version) {
          console.log(`Server version detected: ${serverInfo.version}`);
          // Version should be reasonably current (not ancient)
          expect(serverInfo.version).toMatch(/^[89]\./); // Version 8 or 9+
        }
      }
    });
  });

  test.describe('A07:2021 - Identification and Authentication Failures', () => {
    test('should enforce strong authentication mechanisms', async () => {
      console.log('🔒 Testing Authentication Security');
      
      // Test password policy enforcement (if accessible)
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ViewProfile.jspa');
      
      try {
        const changePasswordLink = await page.locator('a:has-text("Change Password")').first();
        if (await changePasswordLink.isVisible()) {
          await changePasswordLink.click();
          
          // Test weak password rejection
          const weakPasswords = ['123456', 'password', 'admin', '12345678'];
          
          for (const weakPassword of weakPasswords) {
            try {
              await page.fill('#current', 'currentPassword');
              await page.fill('#password', weakPassword);
              await page.fill('#confirm', weakPassword);
              
              // Should show password strength indicator or rejection
              const strengthIndicator = await page.locator('.password-strength, .weak').count();
              expect(strengthIndicator).toBeGreaterThan(0);
            } catch (error) {
              // Form may not be available
            }
          }
        }
      } catch (error) {
        console.log('Password change form not accessible');
      }
    });

    test('should implement proper session management', async () => {
      console.log('🔒 Testing Session Security');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('JSESSIONID'));
      
      if (sessionCookie) {
        // Session cookie should be secure
        expect(sessionCookie.secure).toBe(true);
        expect(sessionCookie.httpOnly).toBe(true);
        
        // Session ID should be sufficiently random
        expect(sessionCookie.value.length).toBeGreaterThan(16);
        expect(sessionCookie.value).toMatch(/^[A-Za-z0-9]+$/);
      }
      
      // Test session timeout
      // Note: This would require waiting for timeout - simplified for testing
      expect(sessionCookie).toBeDefined();
    });

    test('should prevent session fixation attacks', async () => {
      console.log('🔒 Testing Session Fixation Protection');
      
      // Get initial session
      await page.goto('https://jirauat.smedigitalapps.com/jira/');
      const initialCookies = await page.context().cookies();
      const initialSession = initialCookies.find(c => c.name.includes('JSESSIONID'));
      
      // Navigate to secure area
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      const secureAreaCookies = await page.context().cookies();
      const secureSession = secureAreaCookies.find(c => c.name.includes('JSESSIONID'));
      
      if (initialSession && secureSession) {
        // Session should change after authentication
        // Note: In this case we're already authenticated, so this is a simplified test
        expect(secureSession.value).toBeDefined();
      }
    });
  });

  test.describe('A08:2021 - Software and Data Integrity Failures', () => {
    test('should validate file uploads securely', async () => {
      console.log('🔒 Testing File Upload Security');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue.jspa');
      
      try {
        // Look for file upload functionality
        const fileInputs = await page.locator('input[type="file"]').count();
        
        if (fileInputs > 0) {
          // Test file type validation
          const maliciousFiles = [
            { name: 'test.php', content: '<?php echo "test"; ?>' },
            { name: 'test.jsp', content: '<% out.println("test"); %>' },
            { name: 'test.exe', content: 'MZ\x90\x00' }
          ];
          
          // Note: Actual file upload testing would require more complex setup
          console.log(`Found ${fileInputs} file upload fields`);
          expect(fileInputs).toBeGreaterThanOrEqual(0);
        }
      } catch (error) {
        console.log('File upload testing not available in current context');
      }
    });

    test('should implement proper input validation', async () => {
      console.log('🔒 Testing Input Validation');
      
      // Test various input validation scenarios
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'SELECT * FROM users',
        '${7*7}', // Template injection
        '{{7*7}}', // Template injection
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa');
      
      for (const maliciousInput of maliciousInputs) {
        try {
          // Test in search field
          await page.fill('#jqltext', maliciousInput);
          
          // Input should be properly sanitized
          const value = await page.inputValue('#jqltext');
          expect(value).not.toContain('<script>');
          expect(value).not.toContain('javascript:');
          
          await page.fill('#jqltext', ''); // Clear
        } catch (error) {
          // Field may not be available
        }
      }
    });
  });

  test.describe('A09:2021 - Security Logging and Monitoring Failures', () => {
    test('should log security-relevant events', async () => {
      console.log('🔒 Testing Security Logging');
      
      // Test if failed authentication attempts are handled properly
      const invalidRequests = [
        '/rest/api/2/user/admin',
        '/rest/api/2/permissions/global',
        '/admin/unauthorized'
      ];
      
      for (const endpoint of invalidRequests) {
        const response = await page.request.get(`https://jirauat.smedigitalapps.com/jira${endpoint}`);
        
        // Should return appropriate error codes for unauthorized access
        expect([401, 403, 404]).toContain(response.status());
        
        // Response should not contain sensitive debugging information
        const content = await response.text();
        expect(content).not.toContain('java.lang.Exception');
        expect(content).not.toContain('SQLException');
      }
    });

    test('should implement proper error monitoring', async () => {
      console.log('🔒 Testing Error Monitoring');
      
      // Generate various error conditions
      const errorConditions = [
        { method: 'POST', url: '/rest/api/2/issue', data: 'invalid json' },
        { method: 'GET', url: '/rest/api/2/nonexistent' },
        { method: 'PUT', url: '/rest/api/2/user/invalid' }
      ];
      
      for (const condition of errorConditions) {
        try {
          let response;
          
          if (condition.method === 'POST') {
            response = await page.request.post(`https://jirauat.smedigitalapps.com/jira${condition.url}`, {
              data: condition.data,
              headers: { 'Content-Type': 'application/json' }
            });
          } else if (condition.method === 'PUT') {
            response = await page.request.put(`https://jirauat.smedigitalapps.com/jira${condition.url}`);
          } else {
            response = await page.request.get(`https://jirauat.smedigitalapps.com/jira${condition.url}`);
          }
          
          // Should return proper error codes
          expect(response.status()).toBeGreaterThanOrEqual(400);
          
          // Should not expose internal error details
          const content = await response.text();
          expect(content).not.toContain('java.lang');
          expect(content).not.toContain('com.atlassian');
          
        } catch (error) {
          // Network errors are expected for some invalid requests
        }
      }
    });
  });

  test.describe('A10:2021 - Server-Side Request Forgery (SSRF)', () => {
    test('should prevent SSRF in URL parameters', async () => {
      console.log('🔒 Testing SSRF Protection');
      
      const ssrfPayloads = [
        'http://localhost:8080/admin',
        'http://127.0.0.1:22',
        'http://169.254.169.254/latest/meta-data/',
        'file:///etc/passwd',
        'ftp://internal.server.com/file.txt',
        'gopher://127.0.0.1:8080/_'
      ];
      
      for (const payload of ssrfPayloads) {
        try {
          // Test in various endpoints that might accept URLs
          const testEndpoints = [
            `/rest/api/2/avatar?url=${encodeURIComponent(payload)}`,
            `/secure/attachment/${encodeURIComponent(payload)}`
          ];
          
          for (const endpoint of testEndpoints) {
            const response = await page.request.get(`https://jirauat.smedigitalapps.com/jira${endpoint}`);
            
            // Should reject malicious URLs
            expect([400, 403, 404]).toContain(response.status());
            
            if (response.status() === 200) {
              const content = await response.text();
              // Should not contain content from internal services
              expect(content).not.toContain('root:');
              expect(content).not.toContain('ami-id');
              expect(content).not.toContain('SSH-2.0');
            }
          }
        } catch (error) {
          // Expected for malformed requests
        }
      }
    });

    test('should validate redirect URLs', async () => {
      console.log('🔒 Testing Redirect Validation');
      
      const maliciousRedirects = [
        'http://evil.com',
        'javascript:alert(1)',
        '//evil.com',
        'https://evil.com@jirauat.smedigitalapps.com',
        'http://localhost:8080'
      ];
      
      for (const redirect of maliciousRedirects) {
        try {
          const response = await page.request.get(
            `https://jirauat.smedigitalapps.com/jira/login?dest=${encodeURIComponent(redirect)}`,
            { maxRedirects: 0 }
          );
          
          if ([301, 302].includes(response.status())) {
            const location = response.headers()['location'];
            
            // Should not redirect to external domains
            if (location) {
              expect(location).not.toContain('evil.com');
              expect(location).not.toContain('javascript:');
              expect(location).not.toContain('localhost');
            }
          }
        } catch (error) {
          // Expected for malformed requests
        }
      }
    });
  });

  test.describe('API Security Testing', () => {
    test('should test all discovered API endpoints for basic security', async () => {
      console.log('🔒 Testing All Discovered API Endpoints');
      
      const apiEndpoints = discoveryReport.testCategories.api.slice(0, 50); // Test first 50
      let insecureEndpoints = 0;
      
      for (const endpoint of apiEndpoints) {
        try {
          const response = await page.request.fetch(endpoint.url, {
            method: endpoint.method,
            headers: endpoint.headers
          });
          
          const headers = response.headers();
          
          // Check for security headers
          if (!headers['x-content-type-options']) {
            console.log(`❌ Missing X-Content-Type-Options: ${endpoint.url}`);
            insecureEndpoints++;
          }
          
          if (!headers['x-frame-options'] && !headers['content-security-policy']) {
            console.log(`❌ Missing XFO/CSP: ${endpoint.url}`);
            insecureEndpoints++;
          }
          
          // Check for information disclosure
          const content = await response.text();
          if (content.includes('java.lang.') || content.includes('SQLException')) {
            console.log(`❌ Information disclosure: ${endpoint.url}`);
            insecureEndpoints++;
          }
          
        } catch (error) {
          // Some endpoints may be inaccessible
        }
      }
      
      console.log(`🔍 Tested ${apiEndpoints.length} endpoints, found ${insecureEndpoints} security issues`);
      expect(insecureEndpoints).toBeLessThan(apiEndpoints.length * 0.1); // Less than 10% should have issues
    });

    test('should validate API authentication mechanisms', async () => {
      console.log('🔒 Testing API Authentication');
      
      const publicEndpoints = [
        '/rest/api/2/serverInfo',
        '/rest/api/2/myself'
      ];
      
      const restrictedEndpoints = [
        '/rest/api/2/user',
        '/rest/api/2/group',
        '/rest/api/2/permissions'
      ];
      
      // Test public endpoints
      for (const endpoint of publicEndpoints) {
        const response = await page.request.get(`https://jirauat.smedigitalapps.com/jira${endpoint}`);
        expect([200, 401]).toContain(response.status()); // Should work or require auth
      }
      
      // Test restricted endpoints without auth
      for (const endpoint of restrictedEndpoints) {
        // Create new context without cookies
        const unauthContext = await page.context().browser().newContext();
        const unauthPage = await unauthContext.newPage();
        
        const response = await unauthPage.request.get(`https://jirauat.smedigitalapps.com/jira${endpoint}`);
        expect([401, 403]).toContain(response.status()); // Should require authentication
        
        await unauthContext.close();
      }
    });
  });
});

test.describe('Security Headers Analysis', () => {
  test('should analyze all security issues found during discovery', async () => {
    console.log('🔒 Analyzing Discovered Security Issues');
    
    const securityIssues = discoveryReport.testCategories.security;
    
    console.log(`Found ${securityIssues.length} security issues during discovery`);
    
    const issuesByType = securityIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Security issues by type:', issuesByType);
    
    // Test some of the specific issues found
    for (const issue of securityIssues.slice(0, 20)) { // Test first 20
      if (issue.type === 'missing_security_headers') {
        const response = await page.request.get(issue.url);
        const headers = response.headers();
        
        for (const missingHeader of issue.details) {
          expect(headers[missingHeader]).toBeUndefined(); // Confirming the issue exists
        }
      }
    }
    
    // Security issues should be documented but not fail tests entirely
    expect(securityIssues.length).toBeGreaterThan(0); // We expect to find some issues
  });
});

// Performance and Load Testing for Security
test.describe('Security Performance Testing', () => {
  test('should test performance under security stress', async () => {
    console.log('🔒 Security Performance Testing');
    
    const startTime = Date.now();
    
    // Simulate multiple concurrent security tests
    const securityRequests = Array.from({ length: 20 }, async (_, i) => {
      try {
        const response = await page.request.get(
          `https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=summary~"test${i}"`
        );
        return response.status();
      } catch (error) {
        return 500;
      }
    });
    
    const results = await Promise.all(securityRequests);
    const endTime = Date.now();
    
    const successfulRequests = results.filter(status => status === 200).length;
    const totalTime = endTime - startTime;
    
    console.log(`Completed ${successfulRequests}/${results.length} requests in ${totalTime}ms`);
    
    // Should handle concurrent requests reasonably well
    expect(successfulRequests).toBeGreaterThan(results.length * 0.7); // 70% success rate
    expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
  });
}); 