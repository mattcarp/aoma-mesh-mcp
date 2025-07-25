# 🤖 AOMA Testing Project

## 🎯 **PURPOSE**
Test the **AOMA application** functionality - specifically testing if AOMA can properly read, analyze, and process data from JIRA.

## 🌐 **TARGET ENVIRONMENT**
- **AOMA App**: UAT version (the app being tested)
- **Data Source**: **Production JIRA** (`jira.smedigitalapps.com`)
- **Why Production JIRA**: AOMA needs to work with real business data

## ✅ **CORRECT URL USAGE**
```
✅ CORRECT: https://jira.smedigitalapps.com
❌ WRONG:   https://jirauat.smedigitalapps.com
```

## 🧪 **WHAT WE TEST**
- AOMA's ability to connect to production JIRA
- AOMA's data extraction and analysis capabilities
- AOMA's knowledge gathering from real tickets
- AOMA's MCP server functionality with live data

## 🚨 **SAFETY NOTES**
- **Read-only operations**: AOMA should only READ from production JIRA
- **No ticket creation**: AOMA testing should not create tickets in production
- **Data analysis focus**: Testing AOMA's intelligence, not JIRA's functionality

## 📁 **FILE ORGANIZATION**
```
aoma-testing/
├── README.md                    # This file
├── tests/                       # AOMA functionality tests
├── data-extraction/             # Scripts for testing AOMA's data gathering
├── knowledge-analysis/          # Tests for AOMA's analysis capabilities
└── mcp-server-tests/           # MCP server functionality tests
```

## 🎪 **KEY DISTINCTION**
This project tests **AOMA** (the app) using production JIRA as data source.
For testing **JIRA itself**, see the `jira-uat-testing/` project.
