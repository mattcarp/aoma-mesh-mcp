import { chromium } from 'playwright';
import fs from 'fs';

async function extractFromManualBrowser() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🔄 Please manually navigate to your JIRA page and log in...');
        console.log('Then go to: https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA');
        console.log('⏳ Waiting 30 seconds for you to set up...');
        
        await page.waitForTimeout(30000);
        
        console.log('🔍 Starting extraction...');
        
        // Extract current page
        const tickets = await page.evaluate(() => {
            const results = [];
            
            // Get all table rows
            const rows = document.querySelectorAll('table tr, .issue-table tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim());
                    
                    // Look for DPSA pattern
                    const dpsaCell = cellTexts.find(text => text && text.match(/DPSA-\d+/));
                    if (dpsaCell) {
                        const key = dpsaCell.match(/DPSA-\d+/)?.[0];
                        if (key) {
                            results.push({
                                key,
                                summary: cellTexts[1] || '',
                                status: cellTexts[2] || '',
                                assignee: cellTexts[3] || '',
                                reporter: cellTexts[4] || '',
                                created: cellTexts[5] || '',
                                updated: cellTexts[6] || '',
                                priority: cellTexts[7] || '',
                                allCells: cellTexts
                            });
                        }
                    }
                }
            });
            
            // Also try extracting from visible text
            const pageText = document.body.textContent || '';
            const dpsaMatches = pageText.match(/DPSA-\d+/g) || [];
            
            return {
                extractedTickets: results,
                foundKeys: [...new Set(dpsaMatches)],
                totalRows: document.querySelectorAll('table tr').length,
                pageUrl: window.location.href
            };
        });
        
        console.log('📊 Extraction results:');
        console.log(`- Found ${tickets.extractedTickets.length} structured tickets`);
        console.log(`- Found ${tickets.foundKeys.length} unique DPSA keys`);
        console.log(`- Total table rows: ${tickets.totalRows}`);
        
        // Save results
        fs.writeFileSync('manual-extraction-results.json', JSON.stringify(tickets, null, 2));
        
        // Show first few results
        console.log('\n📝 First few tickets:');
        tickets.extractedTickets.slice(0, 5).forEach(ticket => {
            console.log(`${ticket.key}: ${ticket.summary?.substring(0, 50)}...`);
        });
        
        console.log('\n🎯 Next steps:');
        console.log('1. Navigate through all pages manually');
        console.log('2. Run this script on each page');
        console.log('3. Or provide your Supabase key to store automatically');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        console.log('Browser kept open for manual navigation');
        // Don't close browser
    }
}

extractFromManualBrowser();
