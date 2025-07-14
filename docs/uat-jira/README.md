# UAT JIRA Documentation

This directory contains comprehensive documentation for the UAT JIRA testing and data extraction project.

## 📚 Documentation Overview

### Core Guides
- **[JIRA 10.3.6 Upgrade Testing Guide](./JIRA-10.3.6-UPGRADE-TESTING.md)** - Version-specific testing considerations and UAT plan updates
- **[Setup Guide](./SETUP_GUIDE.md)** - VPN, authentication, and environment setup *(coming soon)*
- **[Scraping Guide](./SCRAPING_GUIDE.md)** - How to run ticket extraction scripts *(coming soon)*
- **[API Reference](./API_REFERENCE.md)** - Available scripts and parameters *(coming soon)*
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions *(coming soon)*

## 🎯 Quick Start

1. **Read the upgrade testing guide** for 10.3.6-specific considerations
2. Set up VPN access to UAT environment
3. Configure authentication credentials
4. Run ticket extraction scripts
5. Verify data in Supabase

## 📋 Current Status

✅ **Completed:**
- JIRA 10.3.6 upgrade testing documentation
- Automated ticket extraction for ITSM, DPSA, DPSO projects
- 150 UAT tickets successfully vectorized and stored in Supabase
- Session-based authentication working with saved cookies

🔄 **In Progress:**
- Additional documentation guides
- Production JIRA scraping capabilities

## 🛠️ Available Scripts

- `uat-itsm-dpsa-scraper.ts` - Extract 1000 tickets per project (ITSM/DPSA/DPSO)
- `quick-uat-scraper.ts` - Fast extraction using saved sessions
- `final-working-scraper.ts` - Full automated login and extraction
- `explore-uat-permissions.ts` - Environment analysis and debugging

## 📊 Data Integration

All extracted UAT tickets are:
- Marked with `environment: 'UAT'` and `is_uat: true`
- Fully vectorized for semantic search
- Stored in Supabase with proper deduplication
- Tagged as temporary test data

---

*Last updated: July 8, 2025*
