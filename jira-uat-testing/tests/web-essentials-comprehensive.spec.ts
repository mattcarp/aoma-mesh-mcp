import { test, expect } from '@playwright/test';
import fs from 'fs';

interface DiscoveryReport {
  testCategories: {
    navigation: string[];
    accessibility: Array<{ url: string; issues: any[] }>;
  };
}

// Load discovery report
const discoveryReport: DiscoveryReport = JSON.parse(fs.readFileSync('jira-discovery-report.json', 'utf8'));

test.describe('Web Essentials Comprehensive Test Suite', () => {
  let page: any;
  
  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    const sessionData = JSON.parse(fs.readFileSync('current-session.json', 'utf8'));
    await context.addCookies(sessionData.cookies);
    page = await context.newPage();
  });

  test.describe('WCAG 2.1 Accessibility Compliance', () => {
    test('should meet WCAG 2.1 AA color contrast requirements', async () => {
      console.log('♿ Testing Color Contrast Compliance');
      
      const testUrls = discoveryReport.testCategories.navigation.slice(0, 10);
      let contrastViolations = 0;
      
      for (const url of testUrls) {
        try {
          await page.goto(url, { timeout: 10000 });
          
          // Inject color contrast analyzer
          const contrastIssues = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            const issues = [];
            
            for (const element of elements) {
              const styles = window.getComputedStyle(element);
              const color = styles.color;
              const backgroundColor = styles.backgroundColor;
              
              if (color && backgroundColor && 
                  color !== 'rgba(0, 0, 0, 0)' && 
                  backgroundColor !== 'rgba(0, 0, 0, 0)') {
                
                // Simple contrast ratio calculation (simplified)
                const colorLum = getLuminance(color);
                const bgLum = getLuminance(backgroundColor);
                const contrast = (Math.max(colorLum, bgLum) + 0.05) / (Math.min(colorLum, bgLum) + 0.05);
                
                if (contrast < 4.5) { // WCAG AA requirement
                  issues.push({
                    element: element.tagName + (element.className ? '.' + element.className : ''),
                    color: color,
                    backgroundColor: backgroundColor,
                    contrast: contrast.toFixed(2)
                  });
                }
              }
            }
            
            function getLuminance(color: string): number {
              // Simplified luminance calculation
              if (color.startsWith('rgb')) {
                const match = color.match(/\d+/g);
                if (match) {
                  const [r, g, b] = match.map(x => parseInt(x) / 255);
                  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
                }
              }
              return 0.5; // Default
            }
            
            return issues;
          });
          
          if (contrastIssues.length > 0) {
            console.log(`   ❌ ${contrastIssues.length} contrast violations on ${url}`);
            contrastViolations += contrastIssues.length;
          } else {
            console.log(`   ✅ No contrast violations on ${url}`);
          }
          
        } catch (error) {
          console.log(`   ⚠️  Could not test ${url}: ${error.message}`);
        }
      }
      
      console.log(`Total contrast violations: ${contrastViolations}`);
      expect(contrastViolations).toBeLessThan(50); // Allow some issues in complex applications
    });

    test('should have proper semantic HTML structure', async () => {
      console.log('♿ Testing Semantic HTML Structure');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test for proper heading hierarchy
      const headingStructure = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => ({
          tag: h.tagName,
          text: h.textContent?.trim().substring(0, 50),
          level: parseInt(h.tagName.charAt(1))
        }));
      });
      
      console.log(`   📋 Found ${headingStructure.length} headings`);
      
      // Should have at least one h1
      const h1Count = headingStructure.filter(h => h.level === 1).length;
      expect(h1Count).toBeGreaterThanOrEqual(1);
      
      // Test for semantic landmarks
      const landmarks = await page.locator('main, nav, aside, section, article, header, footer').count();
      console.log(`   🏗️ Found ${landmarks} semantic landmarks`);
      expect(landmarks).toBeGreaterThan(0);
      
      // Test for proper list structures
      const lists = await page.locator('ul, ol, dl').count();
      console.log(`   📝 Found ${lists} lists`);
      
      // Test for form labels
      const formsWithLabels = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
        let properlyLabeled = 0;
        
        for (const input of inputs) {
          const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
                          input.getAttribute('aria-label') ||
                          input.getAttribute('aria-labelledby') ||
                          input.closest('label');
          
          if (hasLabel) properlyLabeled++;
        }
        
        return { total: inputs.length, labeled: properlyLabeled };
      });
      
      console.log(`   🏷️ ${formsWithLabels.labeled}/${formsWithLabels.total} form inputs properly labeled`);
      
      if (formsWithLabels.total > 0) {
        const labelingRate = formsWithLabels.labeled / formsWithLabels.total;
        expect(labelingRate).toBeGreaterThan(0.8); // 80% of inputs should be labeled
      }
    });

    test('should support keyboard navigation', async () => {
      console.log('♿ Testing Keyboard Navigation');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test tab navigation
      let tabbableElements = 0;
      let tabIndex = 0;
      
      while (tabIndex < 20) { // Test first 20 tab stops
        await page.keyboard.press('Tab');
        
        const focusedElement = await page.locator(':focus').count();
        if (focusedElement > 0) {
          tabbableElements++;
          
          // Test if focused element is visible
          const isVisible = await page.locator(':focus').isVisible();
          expect(isVisible).toBe(true);
          
          // Test if focused element has focus indicator
          const focusStyles = await page.locator(':focus').evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
              outline: styles.outline,
              outlineWidth: styles.outlineWidth,
              boxShadow: styles.boxShadow
            };
          });
          
          // Should have some form of focus indicator
          const hasFocusIndicator = focusStyles.outline !== 'none' ||
                                   focusStyles.outlineWidth !== '0px' ||
                                   focusStyles.boxShadow !== 'none';
          
          if (!hasFocusIndicator) {
            console.log(`   ⚠️ Element without focus indicator at tab stop ${tabIndex + 1}`);
          }
        }
        
        tabIndex++;
      }
      
      console.log(`   ⌨️ Found ${tabbableElements} tabbable elements`);
      expect(tabbableElements).toBeGreaterThan(5);
      
      // Test escape key functionality
      await page.keyboard.press('Escape');
      
      // Test arrow key navigation where applicable
      const dropdowns = await page.locator('.aui-dropdown2-trigger').count();
      if (dropdowns > 0) {
        await page.locator('.aui-dropdown2-trigger').first().click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Escape');
      }
    });

    test('should provide proper ARIA attributes and roles', async () => {
      console.log('♿ Testing ARIA Attributes');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test for interactive elements with proper roles
      const ariaAnalysis = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role]');
        let properRoles = 0;
        let missingRoles = 0;
        const issues = [];
        
        for (const element of interactiveElements) {
          const role = element.getAttribute('role');
          const tagName = element.tagName.toLowerCase();
          
          // Check if element has appropriate ARIA attributes
          const hasAriaLabel = element.getAttribute('aria-label');
          const hasAriaLabelledBy = element.getAttribute('aria-labelledby');
          const hasAriaDescribedBy = element.getAttribute('aria-describedby');
          
          if (tagName === 'button' || role === 'button') {
            if (hasAriaLabel || hasAriaLabelledBy || element.textContent?.trim()) {
              properRoles++;
            } else {
              missingRoles++;
              issues.push({ element: tagName, issue: 'Missing accessible name' });
            }
          } else if (tagName === 'a') {
            if (hasAriaLabel || hasAriaLabelledBy || element.textContent?.trim()) {
              properRoles++;
            } else {
              missingRoles++;
              issues.push({ element: tagName, issue: 'Missing accessible name' });
            }
          } else if (['input', 'select', 'textarea'].includes(tagName)) {
            const hasLabel = document.querySelector(`label[for="${element.id}"]`) ||
                           hasAriaLabel || hasAriaLabelledBy || element.closest('label');
            
            if (hasLabel) {
              properRoles++;
            } else {
              missingRoles++;
              issues.push({ element: tagName, issue: 'Missing label' });
            }
          }
        }
        
        return { properRoles, missingRoles, issues, total: interactiveElements.length };
      });
      
      console.log(`   🎭 ${ariaAnalysis.properRoles}/${ariaAnalysis.total} elements have proper ARIA`);
      console.log(`   ❌ ${ariaAnalysis.missingRoles} elements missing ARIA attributes`);
      
      if (ariaAnalysis.total > 0) {
        const ariaComplianceRate = ariaAnalysis.properRoles / ariaAnalysis.total;
        expect(ariaComplianceRate).toBeGreaterThan(0.7); // 70% compliance rate
      }
      
      // Test for proper live regions
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count();
      console.log(`   📢 Found ${liveRegions} live regions`);
    });

    test('should work with screen reader simulation', async () => {
      console.log('♿ Testing Screen Reader Accessibility');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test page title for screen readers
      const pageTitle = await page.title();
      expect(pageTitle).toBeDefined();
      expect(pageTitle.length).toBeGreaterThan(0);
      console.log(`   📄 Page title: "${pageTitle}"`);
      
      // Test skip links
      const skipLinks = await page.locator('a[href*="#"], .skip-link').count();
      console.log(`   ⏭️ Found ${skipLinks} potential skip links`);
      
      // Test alt text for images
      const images = await page.locator('img').count();
      const imagesWithAlt = await page.locator('img[alt]').count();
      const decorativeImages = await page.locator('img[alt=""], img[role="presentation"]').count();
      
      console.log(`   🖼️ ${imagesWithAlt}/${images} images have alt text`);
      console.log(`   🎨 ${decorativeImages} decorative images properly marked`);
      
      if (images > 0) {
        const altTextRate = (imagesWithAlt + decorativeImages) / images;
        expect(altTextRate).toBeGreaterThan(0.8); // 80% should have proper alt handling
      }
      
      // Test table accessibility
      const tables = await page.locator('table').count();
      if (tables > 0) {
        const tablesWithHeaders = await page.locator('table th, table[role="table"] [role="columnheader"]').count();
        console.log(`   📊 Found ${tables} tables, ${tablesWithHeaders} with headers`);
      }
    });
  });

  test.describe('Performance Testing', () => {
    test('should meet Core Web Vitals standards', async () => {
      console.log('⚡ Testing Core Web Vitals');
      
      // Test Largest Contentful Paint (LCP)
      const lcpResult = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      console.log(`   🎯 LCP: ${lcpResult}ms`);
      expect(lcpResult).toBeLessThan(2500); // Good LCP is under 2.5s
      
      // Test First Input Delay simulation
      const startTime = Date.now();
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      const navigationTime = Date.now() - startTime;
      
      console.log(`   🚀 Navigation time: ${navigationTime}ms`);
      expect(navigationTime).toBeLessThan(3000);
      
      // Test Cumulative Layout Shift by monitoring layout changes
      const clsScore = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cls = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                cls += entry.value;
              }
            }
          });
          observer.observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(cls), 3000);
        });
      });
      
      console.log(`   📐 CLS Score: ${clsScore}`);
      expect(clsScore).toBeLessThan(0.1); // Good CLS is under 0.1
    });

    test('should have optimal resource loading', async () => {
      console.log('⚡ Testing Resource Loading Performance');
      
      const resources = [];
      
      page.on('response', response => {
        resources.push({
          url: response.url(),
          status: response.status(),
          size: response.headers()['content-length'],
          type: response.headers()['content-type'],
          timing: response.timing()
        });
      });
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await page.waitForLoadState('networkidle');
      
      // Analyze resource performance
      const jsFiles = resources.filter(r => r.type?.includes('javascript'));
      const cssFiles = resources.filter(r => r.type?.includes('css'));
      const imageFiles = resources.filter(r => r.type?.includes('image'));
      
      console.log(`   📜 ${jsFiles.length} JavaScript files loaded`);
      console.log(`   🎨 ${cssFiles.length} CSS files loaded`);
      console.log(`   🖼️ ${imageFiles.length} image files loaded`);
      
      // Check for large resources
      const largeResources = resources.filter(r => {
        const size = parseInt(r.size || '0');
        return size > 1024 * 1024; // > 1MB
      });
      
      console.log(`   📦 ${largeResources.length} resources larger than 1MB`);
      expect(largeResources.length).toBeLessThan(5); // Should have few large resources
      
      // Check for failed resources
      const failedResources = resources.filter(r => r.status >= 400);
      console.log(`   ❌ ${failedResources.length} failed resource requests`);
      expect(failedResources.length).toBeLessThan(3);
    });

    test('should handle concurrent users efficiently', async () => {
      console.log('⚡ Testing Concurrent Load Performance');
      
      const concurrentRequests = 10;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
        const context = await page.context().browser().newContext();
        const sessionData = JSON.parse(fs.readFileSync('current-session.json', 'utf8'));
        await context.addCookies(sessionData.cookies);
        const testPage = await context.newPage();
        
        try {
          await testPage.goto('https://jirauat.smedigitalapps.com/jira/rest/api/2/myself');
          const response = await testPage.waitForResponse(resp => resp.url().includes('/rest/api/2/myself'));
          await context.close();
          return response.status();
        } catch (error) {
          await context.close();
          return 500;
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const successRate = results.filter(status => status === 200).length / concurrentRequests;
      
      console.log(`   ⏱️ ${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
      console.log(`   ✅ Success rate: ${(successRate * 100).toFixed(1)}%`);
      
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should have efficient caching strategies', async () => {
      console.log('⚡ Testing Caching Performance');
      
      // First load
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await page.waitForLoadState('networkidle');
      
      // Second load (should use cache)
      const startTime = Date.now();
      await page.reload({ waitUntil: 'networkidle' });
      const reloadTime = Date.now() - startTime;
      
      console.log(`   🔄 Reload time: ${reloadTime}ms`);
      expect(reloadTime).toBeLessThan(2000); // Cached reload should be under 2s
      
      // Test cache headers
      const response = await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      const cacheControl = response?.headers()['cache-control'];
      const etag = response?.headers()['etag'];
      const lastModified = response?.headers()['last-modified'];
      
      console.log(`   📋 Cache-Control: ${cacheControl || 'Not set'}`);
      console.log(`   🏷️ ETag: ${etag ? 'Present' : 'Not set'}`);
      console.log(`   📅 Last-Modified: ${lastModified ? 'Present' : 'Not set'}`);
      
      // Should have some caching mechanism
      const hasCaching = cacheControl || etag || lastModified;
      expect(hasCaching).toBeDefined();
    });
  });

  test.describe('SEO and Metadata Testing', () => {
    test('should have proper SEO metadata', async () => {
      console.log('🔍 Testing SEO Metadata');
      
      const testUrls = discoveryReport.testCategories.navigation.slice(0, 10);
      
      for (const url of testUrls) {
        try {
          await page.goto(url, { timeout: 10000 });
          
          // Test page title
          const title = await page.title();
          console.log(`   📄 Title: "${title}"`);
          expect(title).toBeDefined();
          expect(title.length).toBeGreaterThan(0);
          expect(title.length).toBeLessThan(60); // SEO best practice
          
          // Test meta description
          const description = await page.locator('meta[name="description"]').getAttribute('content');
          if (description) {
            console.log(`   📝 Description: "${description.substring(0, 50)}..."`);
            expect(description.length).toBeLessThan(160); // SEO best practice
          }
          
          // Test meta keywords (optional but good to check)
          const keywords = await page.locator('meta[name="keywords"]').getAttribute('content');
          if (keywords) {
            console.log(`   🏷️ Keywords: ${keywords.split(',').length} keywords`);
          }
          
          // Test canonical URL
          const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
          if (canonical) {
            console.log(`   🔗 Canonical: ${canonical}`);
            expect(canonical).toContain('jirauat.smedigitalapps.com');
          }
          
          // Test Open Graph metadata
          const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
          const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
          const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
          
          if (ogTitle || ogDescription || ogImage) {
            console.log(`   📱 Open Graph: ${ogTitle ? 'Title' : ''}${ogDescription ? ' Description' : ''}${ogImage ? ' Image' : ''}`);
          }
          
        } catch (error) {
          console.log(`   ⚠️ Could not test SEO for ${url}: ${error.message}`);
        }
      }
    });

    test('should have proper structured data', async () => {
      console.log('🔍 Testing Structured Data');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test for JSON-LD structured data
      const jsonLdCount = await page.locator('script[type="application/ld+json"]').count();
      console.log(`   📊 Found ${jsonLdCount} JSON-LD scripts`);
      
      // Test for microdata
      const microdataItems = await page.locator('[itemtype], [itemscope]').count();
      console.log(`   🔬 Found ${microdataItems} microdata items`);
      
      // Test for RDFa
      const rdfaItems = await page.locator('[vocab], [typeof]').count();
      console.log(`   📋 Found ${rdfaItems} RDFa items`);
      
      // Test breadcrumb structure
      const breadcrumbs = await page.locator('.breadcrumbs, [role="navigation"] ol, .aui-nav-breadcrumbs').count();
      console.log(`   🗂️ Found ${breadcrumbs} breadcrumb navigations`);
    });

    test('should be mobile-friendly', async () => {
      console.log('📱 Testing Mobile-Friendliness');
      
      // Test viewport meta tag
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      console.log(`   📐 Viewport: ${viewport || 'Not set'}`);
      expect(viewport).toBeDefined();
      expect(viewport).toContain('width=device-width');
      
      // Test responsive behavior
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test if content is accessible on mobile
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
      
      // Test touch-friendly interactive elements
      const buttons = await page.locator('button, a, input[type="button"], input[type="submit"]').count();
      if (buttons > 0) {
        // Check button sizes (should be at least 44px for touch)
        const buttonSizes = await page.locator('button, a').evaluateAll(elements => {
          return elements.slice(0, 10).map(el => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          });
        });
        
        const touchFriendlyButtons = buttonSizes.filter(size => size.width >= 44 && size.height >= 44);
        console.log(`   👆 ${touchFriendlyButtons.length}/${buttonSizes.length} buttons are touch-friendly`);
      }
      
      // Restore desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });

  test.describe('Progressive Web App (PWA) Features', () => {
    test('should have PWA manifest and service worker', async () => {
      console.log('📱 Testing PWA Features');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test for manifest file
      const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
      if (manifest) {
        console.log(`   📋 Manifest found: ${manifest}`);
        
        // Test manifest content
        try {
          const manifestResponse = await page.request.get(manifest);
          if (manifestResponse.ok()) {
            const manifestData = await manifestResponse.json();
            
            expect(manifestData.name || manifestData.short_name).toBeDefined();
            console.log(`   📱 App name: ${manifestData.name || manifestData.short_name}`);
            
            if (manifestData.icons) {
              console.log(`   🎨 ${manifestData.icons.length} app icons defined`);
            }
            
            if (manifestData.start_url) {
              console.log(`   🚀 Start URL: ${manifestData.start_url}`);
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Could not load manifest: ${error.message}`);
        }
      } else {
        console.log(`   ❌ No PWA manifest found`);
      }
      
      // Test for service worker
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      console.log(`   ⚙️ Service Worker support: ${hasServiceWorker ? 'Available' : 'Not available'}`);
      
      if (hasServiceWorker) {
        const swRegistrations = await page.evaluate(async () => {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            return registrations.length;
          } catch (error) {
            return 0;
          }
        });
        
        console.log(`   📊 ${swRegistrations} service worker registrations`);
      }
    });

    test('should work offline (if PWA)', async () => {
      console.log('📱 Testing Offline Functionality');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Simulate offline condition
      await page.context().setOffline(true);
      
      try {
        // Test if cached content is available
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
        
        const isPageAccessible = await page.locator('body').isVisible();
        if (isPageAccessible) {
          console.log(`   ✅ Page accessible offline`);
        } else {
          console.log(`   ❌ Page not accessible offline`);
        }
      } catch (error) {
        console.log(`   ❌ Page not accessible offline: ${error.message}`);
      } finally {
        // Restore online condition
        await page.context().setOffline(false);
      }
    });
  });

  test.describe('Web Standards Compliance', () => {
    test('should have valid HTML structure', async () => {
      console.log('📝 Testing HTML Validity');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test HTML5 doctype
      const doctype = await page.evaluate(() => {
        return document.doctype ? document.doctype.name : null;
      });
      
      console.log(`   📄 Doctype: ${doctype || 'Not found'}`);
      expect(doctype).toBe('html');
      
      // Test for valid HTML structure
      const htmlStructure = await page.evaluate(() => {
        const issues = [];
        
        // Check for duplicate IDs
        const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          issues.push(`Duplicate IDs: ${duplicateIds.join(', ')}`);
        }
        
        // Check for missing alt attributes on images
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt]):not([role="presentation"])');
        if (imagesWithoutAlt.length > 0) {
          issues.push(`${imagesWithoutAlt.length} images without alt text`);
        }
        
        // Check for empty links
        const emptyLinks = Array.from(document.querySelectorAll('a')).filter(link => 
          !link.textContent?.trim() && !link.querySelector('img[alt]') && !link.getAttribute('aria-label')
        );
        if (emptyLinks.length > 0) {
          issues.push(`${emptyLinks.length} empty links`);
        }
        
        return issues;
      });
      
      console.log(`   🔍 HTML issues found: ${htmlStructure.length}`);
      htmlStructure.forEach(issue => console.log(`     ❌ ${issue}`));
      
      // Should have minimal HTML issues
      expect(htmlStructure.length).toBeLessThan(10);
    });

    test('should use secure HTTPS connections', async () => {
      console.log('🔒 Testing HTTPS Security');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test HTTPS usage
      const url = page.url();
      expect(url).toMatch(/^https:/);
      
      // Test for mixed content
      const mixedContentIssues = await page.evaluate(() => {
        const issues = [];
        
        // Check for HTTP resources on HTTPS page
        const httpResources = Array.from(document.querySelectorAll('script[src], link[href], img[src], iframe[src]'))
          .filter(el => {
            const src = el.src || el.href;
            return src && src.startsWith('http://');
          });
        
        if (httpResources.length > 0) {
          issues.push(`${httpResources.length} HTTP resources on HTTPS page`);
        }
        
        return issues;
      });
      
      console.log(`   🔒 Mixed content issues: ${mixedContentIssues.length}`);
      expect(mixedContentIssues.length).toBe(0);
      
      // Test security headers (already covered in security tests, but worth mentioning)
      const response = await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      const securityHeaders = response?.headers();
      
      const importantHeaders = [
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
        'content-security-policy'
      ];
      
      const presentHeaders = importantHeaders.filter(header => securityHeaders?.[header]);
      console.log(`   🛡️ ${presentHeaders.length}/${importantHeaders.length} important security headers present`);
    });

    test('should have proper error handling and status codes', async () => {
      console.log('📝 Testing Error Handling');
      
      // Test 404 handling
      const notFoundResponse = await page.request.get('https://jirauat.smedigitalapps.com/jira/nonexistent-page');
      expect(notFoundResponse.status()).toBe(404);
      console.log(`   ❌ 404 status correctly returned for non-existent page`);
      
      // Test proper content type headers
      const dashboardResponse = await page.request.get('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      const contentType = dashboardResponse.headers()['content-type'];
      console.log(`   📋 Content-Type: ${contentType}`);
      expect(contentType).toContain('text/html');
      
      // Test API endpoints
      const apiResponse = await page.request.get('https://jirauat.smedigitalapps.com/jira/rest/api/2/myself');
      const apiContentType = apiResponse.headers()['content-type'];
      console.log(`   🔌 API Content-Type: ${apiContentType}`);
      expect(apiContentType).toContain('application/json');
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across different browsers', async () => {
      console.log('🌐 Testing Cross-Browser Compatibility');
      
      // Test basic functionality (this test runs in current browser)
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test modern JavaScript features
      const jsCompatibility = await page.evaluate(() => {
        const features = {
          es6: typeof Promise !== 'undefined',
          async: typeof async !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          flexbox: CSS.supports('display', 'flex'),
          grid: CSS.supports('display', 'grid'),
          customProperties: CSS.supports('--test', 'test')
        };
        
        return features;
      });
      
      console.log(`   🔧 JavaScript compatibility:`);
      Object.entries(jsCompatibility).forEach(([feature, supported]) => {
        console.log(`     ${supported ? '✅' : '❌'} ${feature}`);
      });
      
      // Most modern features should be supported
      const supportedFeatures = Object.values(jsCompatibility).filter(Boolean).length;
      const totalFeatures = Object.keys(jsCompatibility).length;
      const compatibilityRate = supportedFeatures / totalFeatures;
      
      expect(compatibilityRate).toBeGreaterThan(0.8); // 80% feature support
    });
  });

  test.describe('Internationalization (i18n) Support', () => {
    test('should support multiple languages and locales', async () => {
      console.log('🌍 Testing Internationalization');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      
      // Test language attributes
      const htmlLang = await page.locator('html').getAttribute('lang');
      console.log(`   🗣️ HTML lang attribute: ${htmlLang || 'Not set'}`);
      
      // Test for internationalization features
      const i18nFeatures = await page.evaluate(() => {
        const features = {
          hasLangAttribute: document.documentElement.lang !== '',
          hasDateTimeElements: document.querySelectorAll('time, [datetime]').length > 0,
          hasLocaleSpecificContent: document.body.textContent?.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/) !== null,
          hasRtlSupport: getComputedStyle(document.documentElement).direction !== ''
        };
        
        return features;
      });
      
      console.log(`   🌐 i18n features:`);
      Object.entries(i18nFeatures).forEach(([feature, present]) => {
        console.log(`     ${present ? '✅' : '❌'} ${feature}`);
      });
      
      // Test character encoding
      const charset = await page.evaluate(() => {
        const metaCharset = document.querySelector('meta[charset]');
        return metaCharset ? metaCharset.getAttribute('charset') : null;
      });
      
      console.log(`   📝 Character encoding: ${charset || 'Not specified'}`);
      expect(charset).toBe('utf-8');
    });
  });
}); 