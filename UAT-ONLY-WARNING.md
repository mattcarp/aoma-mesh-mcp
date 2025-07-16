# ⚠️ UAT TESTING ONLY - NO PRODUCTION ACCESS

## 🚨 CRITICAL SAFETY NOTICE

This project is configured for **UAT TESTING ONLY**.

- ✅ **ALLOWED**: `jirauat.smedigitalapps.com` (UAT environment)
- ❌ **FORBIDDEN**: `jira.smedigitalapps.com` (Production environment)

## 🎯 Enterprise Testing Framework (Current)

The following files are properly configured for UAT-only testing:

- `playwright-enterprise.config.ts` ✅
- `tests/utils/session-manager.ts` ✅  
- `tests/enterprise/session-capture-and-comprehensive-testing.spec.ts` ✅
- `quick-enterprise-test.ts` ✅

## 📋 Legacy Scripts

Many older scripts in the root directory contain production references. 
These are legacy scripts and should not be used for current testing.

## 🦁 Ready to Unleash the Lions on UAT!

The enterprise testing framework is ready for comprehensive UAT testing. 